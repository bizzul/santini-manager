import { generateTimetrackingInstructions } from "@/lib/timetracking-instructions";

describe("timetracking instructions generator", () => {
  it("highlights the missing role for project entries", () => {
    const content = generateTimetrackingInstructions({
      view: "create",
      mode: "personal",
      completedEntries: 0,
      savedEntriesCount: 0,
      currentRow: {
        activityType: "project",
        label: "25-090 - Cliente Demo",
        hasProject: true,
        hasRole: false,
        hasInternalActivity: false,
        hasTime: false,
        hasComment: false,
        lunchOffsite: false,
        hasLunchLocation: false,
      },
    });

    expect(content.title).toBe("Come completare il modulo ore");
    expect(content.description).toContain("reparto");
    expect(content.items.find((item) => item.id === "role")).toMatchObject({
      status: "active",
    });
  });

  it("surfaces ready-to-save entries when the draft is complete", () => {
    const content = generateTimetrackingInstructions({
      view: "create",
      mode: "personal",
      completedEntries: 2,
      savedEntriesCount: 1,
      totalMinutes: 480,
      targetMinutes: 540,
      currentRow: {
        activityType: "internal",
        label: "Ufficio",
        hasProject: false,
        hasRole: false,
        hasInternalActivity: true,
        hasTime: true,
        hasComment: true,
        lunchOffsite: false,
        hasLunchLocation: false,
      },
    });

    expect(content.description).toContain("2 registrazioni pronte");
    expect(content.items.find((item) => item.id === "save")).toMatchObject({
      status: "active",
    });
  });

  it("adapts the table instructions for admins", () => {
    const content = generateTimetrackingInstructions({
      view: "table",
      mode: "admin",
      entryCount: 24,
      userCount: 5,
    });

    expect(content.title).toBe("Tabella operativa ore");
    expect(content.description).toContain("filtrare");
    expect(content.items.find((item) => item.id === "edit")?.description).toContain(
      "amministratori"
    );
  });
});
