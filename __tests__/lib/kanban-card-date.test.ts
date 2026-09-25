import { getKanbanCardDate, usesProductionEndDate } from "@/lib/kanban-card-date";

const task = {
  deliveryDate: "2026-09-25T00:00:00",
  produzione_data_fine: "2026-09-18",
  termine_produzione: "2026-09-19",
};

const arredamento = { is_production_kanban: true, identifier: "arredamento", title: "1. Arredamento" };
const posa = { is_production_kanban: true, identifier: "5_posa", title: "5. Posa" };
const offerte = { is_production_kanban: false, identifier: "0_offerte", title: "Offerte" };

describe("lib/kanban-card-date", () => {
  it("Kanban di produzione: mostra la fine produzione", () => {
    expect(usesProductionEndDate(arredamento)).toBe(true);
    expect(getKanbanCardDate(task, arredamento)).toBe("2026-09-18");
  });

  it("Kanban di produzione senza produzione_data_fine: usa termine_produzione", () => {
    expect(getKanbanCardDate({ ...task, produzione_data_fine: null }, arredamento)).toBe("2026-09-19");
  });

  it("Kanban di produzione senza date di produzione: nessuna data, non la posa", () => {
    expect(
      getKanbanCardDate({ deliveryDate: task.deliveryDate }, arredamento)
    ).toBeNull();
  });

  it("Kanban Posa (anche se marcato produzione) e altri Kanban: data di posa", () => {
    expect(usesProductionEndDate(posa)).toBe(false);
    expect(getKanbanCardDate(task, posa)).toBe(task.deliveryDate);
    expect(getKanbanCardDate(task, offerte)).toBe(task.deliveryDate);
    expect(getKanbanCardDate(task, null)).toBe(task.deliveryDate);
  });
});
