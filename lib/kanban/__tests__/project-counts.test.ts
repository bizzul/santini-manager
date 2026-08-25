import {
  tallyProjectsByKanbanId,
  withProjectCounts,
} from "../project-counts";

describe("tallyProjectsByKanbanId", () => {
  it("counts non-archived rows per kanban", () => {
    const counts = tallyProjectsByKanbanId([
      { kanbanId: 1 },
      { kanbanId: 1 },
      { kanbanId: "1" },
      { kanbanId: 2 },
      { kanbanId: null },
      { kanbanId: "" },
      null,
    ]);

    expect(counts.get("1")).toBe(3);
    expect(counts.get("2")).toBe(1);
    expect(counts.size).toBe(2);
  });
});

describe("withProjectCounts", () => {
  it("attaches a zero when the board has no tasks", () => {
    const counts = tallyProjectsByKanbanId([{ kanbanId: 7 }]);

    expect(
      withProjectCounts(
        [
          { id: 7, title: "AVOR" },
          { id: 8, title: "Offerte" },
          { title: "Orphan" },
        ],
        counts,
      ),
    ).toEqual([
      { id: 7, title: "AVOR", projectCount: 1 },
      { id: 8, title: "Offerte", projectCount: 0 },
      { title: "Orphan", projectCount: 0 },
    ]);
  });
});
