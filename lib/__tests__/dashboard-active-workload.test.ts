import {
  attachDepartmentVisuals,
  buildPipelineSeries,
  classifyInvoiceColumn,
  classifyOfferColumn,
  countActiveWorkload,
  departmentNameFromKanban,
  isActiveWorkloadTask,
  isCurrentCalendarMonthPartial,
  isTerminalOperationalColumn,
  resolveDepartmentVisual,
} from "@/lib/dashboard-active-workload";

describe("dashboard active workload", () => {
  it("counts only da-inviare invoices for Fatturazione", () => {
    const columns = new Map([
      [1, { id: 1, title: "To Do", column_type: "normal" }],
      [2, { id: 2, title: "Inviata", column_type: "normal" }],
      [3, { id: 3, title: "Pagata", column_type: "won" }],
    ]);
    const rows = countActiveWorkload({
      tasks: [
        { id: 1, unique_code: "26-011", kanbanId: 10, kanbanColumnId: 1 },
        { id: 2, unique_code: "26-012", kanbanId: 10, kanbanColumnId: 1 },
        { id: 3, unique_code: "26-013", kanbanId: 10, kanbanColumnId: 2 },
        { id: 4, unique_code: "26-014", kanbanId: 10, kanbanColumnId: 3 },
      ],
      getDepartment: () => "Fatturazione",
      getColumn: (id) => columns.get(id ?? -1),
    });
    expect(rows).toEqual([{ department: "Fatturazione", count: 2 }]);
  });

  it("counts unique fatturazione projects, not duplicate cards", () => {
    const columns = new Map([
      [1, { id: 1, title: "To Do", column_type: "normal" }],
    ]);
    const rows = countActiveWorkload({
      tasks: [
        { id: 1, unique_code: "26-011-FATT", kanbanId: 10, kanbanColumnId: 1 },
        { id: 2, unique_code: "26-011-BIS", kanbanId: 10, kanbanColumnId: 1 },
      ],
      getDepartment: () => "Fatturazione",
      getColumn: (id) => columns.get(id ?? -1),
    });
    expect(rows).toEqual([{ department: "Fatturazione", count: 1 }]);
  });

  it("counts only inviate + trattativa offers for Vendita", () => {
    const columns = new Map([
      [1, { id: 1, title: "To Do", column_type: "normal" }],
      [2, { id: 2, title: "Inviata", column_type: "normal" }],
      [3, { id: 3, title: "Trattativa", column_type: "normal" }],
      [4, { id: 4, title: "Vinta", column_type: "won" }],
      [5, { id: 5, title: "Persa", column_type: "lost" }],
    ]);
    const rows = countActiveWorkload({
      tasks: [
        { id: 1, kanbanId: 20, kanbanColumnId: 1 },
        { id: 2, kanbanId: 20, kanbanColumnId: 2 },
        { id: 3, kanbanId: 20, kanbanColumnId: 2 },
        { id: 4, kanbanId: 20, kanbanColumnId: 3 },
        { id: 5, kanbanId: 20, kanbanColumnId: 4 },
        { id: 6, kanbanId: 20, kanbanColumnId: 5 },
        { id: 7, kanbanId: 20, kanbanColumnId: 2, display_mode: "small_green" },
      ],
      getDepartment: () => "Vendita",
      getColumn: (id) => columns.get(id ?? -1),
    });
    expect(rows).toEqual([{ department: "Vendita", count: 3 }]);
  });

  it("excludes spedito/ultimato production cards from operational load", () => {
    const columns = new Map([
      [1, { id: 1, title: "To Do", column_type: "normal" }],
      [2, { id: 2, title: "Spedito", identifier: "spedito_arredamento", column_type: "invoicing" }],
      [3, { id: 3, title: "Ultimato", column_type: "normal" }],
    ]);
    const rows = countActiveWorkload({
      tasks: [
        { id: 1, unique_code: "26-100", kanbanId: 30, kanbanColumnId: 1 },
        { id: 2, unique_code: "26-101", kanbanId: 30, kanbanColumnId: 2 },
        { id: 3, unique_code: "26-102", kanbanId: 30, kanbanColumnId: 3 },
      ],
      getDepartment: () => "1. Arredamento",
      getColumn: (id) => columns.get(id ?? -1),
    });
    expect(rows).toEqual([{ department: "1. Arredamento", count: 1 }]);
  });

  it("classifies offer and invoice columns from titles and types", () => {
    expect(classifyOfferColumn({ title: "Trattativa" })).toBe("inTrattativa");
    expect(classifyOfferColumn({ column_type: "lost" })).toBe("perse");
    expect(classifyInvoiceColumn({ title: "To Do" })).toBe("daInviare");
    expect(classifyInvoiceColumn({ title: "Pagata" })).toBe("pagata");
    expect(isTerminalOperationalColumn({ column_type: "invoicing" })).toBe(true);
    expect(isActiveWorkloadTask({ kanbanColumnId: 1 }, { title: "Inviata" }, "vendita")).toBe(true);
    expect(isActiveWorkloadTask({ kanbanColumnId: 1 }, { title: "Inviata" }, "fatturazione")).toBe(false);
  });

  it("maps offer kanbans to Vendita for every tenant", () => {
    expect(departmentNameFromKanban({ is_offer_kanban: true, title: "Offerte" })).toBe("Vendita");
    expect(departmentNameFromKanban({ title: "Fatture OUT" })).toBe("Fatturazione");
    expect(departmentNameFromKanban({ title: "5. Posa" })).toBe("5. Posa");
  });

  it("uses sidebar category icons for areas and board icons for named kanbans", () => {
    const kanbans = [
      { title: "Offerte", is_offer_kanban: true, icon: "Activity", color: "#f0900a" },
      { title: "5. Posa", icon: "Drill", color: "#8f9aae" },
      { title: "AVOR", is_work_kanban: true, icon: "FileText", color: "#1c4fa0" },
    ];
    const categories = [
      { name: "Vendita", icon: "BadgeDollarSign", color: "#F59E0B" },
      { name: "Service", icon: "Drill", color: "#3B82F6" },
    ];
    expect(resolveDepartmentVisual("Vendita", kanbans, categories)).toEqual({
      icon: "BadgeDollarSign",
      color: "#F59E0B",
    });
    expect(resolveDepartmentVisual("5. Posa", kanbans, categories)).toEqual({
      icon: "Drill",
      color: "#8f9aae",
    });
    expect(resolveDepartmentVisual("AVOR", kanbans, categories)).toEqual({
      icon: "FileText",
      color: "#1c4fa0",
    });
    expect(
      attachDepartmentVisuals([{ department: "Vendita", count: 46 }], kanbans, categories)[0]
        .icon,
    ).toBe("BadgeDollarSign");
  });
});

describe("pipeline series current month", () => {
  it("marks the in-progress month as partial and leaves complete months untouched", () => {
    const now = new Date(2026, 7, 20); // 20 Aug 2026, month not finished
    const points = buildPipelineSeries({
      now,
      tasks: [
        { created_at: "2026-07-10T10:00:00.000Z", sellPrice: 100, task_type: "OFFERTA" },
        { created_at: "2026-08-02T10:00:00.000Z", sellPrice: 40, task_type: "OFFERTA" },
        { created_at: "2026-08-18T10:00:00.000Z", sellPrice: 10, task_type: "OFFERTA" },
      ],
      isOfferTask: (task) => task.task_type === "OFFERTA",
    });

    expect(isCurrentCalendarMonthPartial(now)).toBe(true);
    expect(points.map((p) => p.month)).toEqual([
      "Mar 26",
      "Apr 26",
      "May 26",
      "Jun 26",
      "Jul 26",
      "Aug 26",
    ]);
    const july = points.find((p) => p.month === "Jul 26")!;
    const august = points.find((p) => p.month === "Aug 26")!;
    expect(july).toEqual({ month: "Jul 26", value: 100, isPartial: false });
    expect(august).toEqual({ month: "Aug 26", value: 50, isPartial: true });
  });

  it("does not mark the last calendar day as partial", () => {
    const now = new Date(2026, 7, 31);
    const points = buildPipelineSeries({
      now,
      months: 2,
      tasks: [],
      isOfferTask: () => true,
    });
    expect(points.at(-1)?.isPartial).toBe(false);
  });
});
