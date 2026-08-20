import { editItem } from "@/app/sites/[domain]/timetracking/actions/edit-item.action";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import {
  editFormSchema,
  parseTimetrackingEditDate,
  parseTimetrackingRoleId,
  validation,
} from "@/validation/timeTracking/editManual";

jest.mock("@/utils/server");
jest.mock("@/lib/auth-utils");
jest.mock("@/lib/fetchers");

function createChainableBuilder(result: { data: any; error: any }) {
  const builder: any = {};
  const resolve = jest.fn().mockResolvedValue(result);
  builder.select = jest.fn().mockReturnValue(builder);
  builder.update = jest.fn().mockReturnValue(builder);
  builder.insert = jest.fn().mockReturnValue(builder);
  builder.delete = jest.fn().mockReturnValue(builder);
  builder.eq = jest.fn().mockReturnValue(builder);
  builder.single = resolve;
  builder.maybeSingle = resolve;
  builder.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

describe("timetracking edit date parsing", () => {
  it("parses a date-only string as a local calendar day", () => {
    const parsed = parseTimetrackingEditDate("2026-08-20");
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(7);
    expect(parsed?.getDate()).toBe(20);
  });

  it("does not shift YYYY-MM-DD through UTC midnight", () => {
    const utcInterpreted = new Date("2026-08-20");
    const localParsed = parseTimetrackingEditDate("2026-08-20")!;

    // In timezones behind UTC this would be the previous day if we used new Date("YYYY-MM-DD").
    expect(localParsed.getDate()).toBe(20);
    if (utcInterpreted.getTimezoneOffset() > 0) {
      expect(localParsed.getDate()).not.toBe(utcInterpreted.getDate());
    }
  });

  it("accepts hours and minutes updates without a date", () => {
    const result = validation.safeParse({
      hours: 4,
      minutes: 15,
      description: "Posa",
      userId: 12,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hours).toBe(4);
      expect(result.data.minutes).toBe(15);
      expect(result.data.date).toBeUndefined();
    }
  });

  it("accepts the nested role object sent by the hours table", () => {
    const result = validation.safeParse({
      hours: 4,
      minutes: 15,
      description: "",
      task: "26",
      userId: "12",
      roles: { role: { id: 5, name: "Posa" } },
      lunchOffsite: false,
      lunchLocation: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roles).toBe(5);
    }
  });

  it("accepts a flattened role row without the nested role wrapper", () => {
    const result = validation.safeParse({
      hours: 3,
      minutes: 0,
      roles: [{ id: 5, name: "Posa" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roles).toBe(5);
    }
  });

  it("extracts a role id from join-table shapes", () => {
    expect(parseTimetrackingRoleId({ role: { id: 5, name: "Posa" } })).toBe(5);
    expect(parseTimetrackingRoleId([{ id: 7, name: "Montaggio" }])).toBe(7);
    expect(parseTimetrackingRoleId("3")).toBe("3");
  });

  it("accepts null description and lunch location from the database", () => {
    const result = validation.safeParse({
      hours: 1,
      minutes: 0,
      description: null,
      lunchLocation: null,
      task: null,
      userId: 12,
      roles: 5,
    });

    expect(result.success).toBe(true);
  });

  it("keeps an explicit calendar date on the payload", () => {
    const result = validation.safeParse({
      hours: 3,
      minutes: 0,
      date: "2026-08-18",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date?.getFullYear()).toBe(2026);
      expect(result.data.date?.getMonth()).toBe(7);
      expect(result.data.date?.getDate()).toBe(18);
    }
  });
});

describe("timetracking editItem persistence", () => {
  let lastUpdatePayload: Record<string, unknown> | null;
  let timetrackingBuilder: ReturnType<typeof createChainableBuilder>;

  beforeEach(() => {
    jest.clearAllMocks();
    lastUpdatePayload = null;

    const userBuilder = createChainableBuilder({
      data: { id: 12 },
      error: null,
    });
    timetrackingBuilder = createChainableBuilder({
      data: { id: 41, employee_id: 12, hours: 3, minutes: 15 },
      error: null,
    });
    timetrackingBuilder.update = jest.fn((payload: Record<string, unknown>) => {
      lastUpdatePayload = payload;
      return timetrackingBuilder;
    });
    const rolesBuilder = createChainableBuilder({ data: null, error: null });
    const actionBuilder = createChainableBuilder({ data: { id: 1 }, error: null });

    (createClient as jest.Mock).mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "User") return userBuilder;
        if (table === "Timetracking") return timetrackingBuilder;
        if (table === "_RolesToTimetracking") return rolesBuilder;
        if (table === "Action") return actionBuilder;
        return createChainableBuilder({ data: null, error: null });
      }),
    });
    (getUserContext as jest.Mock).mockResolvedValue({
      user: { id: "auth-user-id" },
      role: "admin",
    });
    (getSiteData as jest.Mock).mockResolvedValue({
      data: { id: "site-1" },
    });
  });

  it("writes hours, minutes and totalTime to the database", async () => {
    const result = await editItem(
      {
        hours: 5,
        minutes: 30,
        description: "Posa",
        userId: 12,
      },
      41,
      "santini"
    );

    expect(result).toMatchObject({ id: 41, employee_id: 12 });
    expect(timetrackingBuilder.update).toHaveBeenCalledTimes(1);
    expect(lastUpdatePayload).toMatchObject({
      hours: 5,
      minutes: 30,
      totalTime: 5.5,
    });
    expect(lastUpdatePayload).not.toHaveProperty("created_at");
  });

  it("writes a local calendar date when the date field changes", async () => {
    const result = await editItem(
      {
        hours: 3,
        minutes: 15,
        date: "2026-08-18",
        description: "Posa",
        userId: 12,
      },
      41,
      "santini"
    );

    expect(result).toMatchObject({ id: 41 });
    expect(lastUpdatePayload?.created_at).toBeInstanceOf(Date);
    const savedDate = lastUpdatePayload?.created_at as Date;
    expect(savedDate.getFullYear()).toBe(2026);
    expect(savedDate.getMonth()).toBe(7);
    expect(savedDate.getDate()).toBe(18);
    expect(lastUpdatePayload).toMatchObject({
      hours: 3,
      minutes: 15,
      totalTime: 3.25,
    });
  });

  it("persists hours and date from the edit dialog payload", async () => {
    const formValues = editFormSchema.parse({
      date: "2026-08-19T10:52",
      description: "",
      hours: "2",
      minutes: "15",
      roles: "5",
      task: "107",
      userId: "12",
    });

    const result = await editItem(
      {
        date: formValues.date,
        description: formValues.description ?? "",
        hours: Number(formValues.hours) || 0,
        minutes: Number(formValues.minutes) || 0,
        roles: formValues.roles || undefined,
        task: formValues.task || undefined,
        userId: formValues.userId || undefined,
      },
      41,
      "santini"
    );

    expect(result).toMatchObject({ id: 41 });
    expect(lastUpdatePayload).toMatchObject({
      hours: 2,
      minutes: 15,
      totalTime: 2.25,
    });
    expect(lastUpdatePayload?.created_at).toBeInstanceOf(Date);
    const savedDate = lastUpdatePayload?.created_at as Date;
    expect(savedDate.getFullYear()).toBe(2026);
    expect(savedDate.getMonth()).toBe(7);
    expect(savedDate.getDate()).toBe(19);
  });

  it("keeps existing hours when the payload omits them", async () => {
    await editItem(
      {
        description: "Posa",
        userId: 12,
      },
      41,
      "santini"
    );

    expect(lastUpdatePayload).toMatchObject({
      hours: 3,
      minutes: 15,
      totalTime: 3.25,
    });
  });

  it("allows explicitly saving zero hours", async () => {
    await editItem(
      {
        hours: 0,
        minutes: 30,
        description: "Posa",
        userId: 12,
      },
      41,
      "santini"
    );

    expect(lastUpdatePayload).toMatchObject({
      hours: 0,
      minutes: 30,
      totalTime: 0.5,
    });
  });
});
