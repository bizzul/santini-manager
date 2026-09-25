import {
  buildProjectCalendarItems,
  getCategoryLegend,
  getStatusLegend,
} from "@/components/calendar/calendar-utils";

const task = {
  id: 692,
  unique_code: "26-130",
  name: "Le Calle",
  posa_data_inizio: "2026-08-24",
  posa_data_fine: "2026-10-09",
  column: { title: "Esecuzione" },
  SellProduct: { name: "Posa", category: { name: "Posa", color: "#a5ea6c" } },
  Kanban: {
    title: "5. Posa",
    color: "#8f9aae",
    category: { name: "Produzione", color: "#EC4899" },
  },
};

describe("buildProjectCalendarItems: calendario v2", () => {
  it("senza v2 il filo resta il colore di oggi (categoria prodotto)", () => {
    const [item] = buildProjectCalendarItems([task], "santini", "installation");
    expect(item.color).toBe("#a5ea6c");
    expect(getStatusLegend([item])).toEqual([{ label: "Esecuzione", color: "#a5ea6c" }]);
  });

  it("con v2 il filo e la legenda usano la categoria Kanban", () => {
    const [item] = buildProjectCalendarItems([task], "santini", "installation", { v2: true });
    expect(item.color).toBe("#EC4899");
    expect(item.status).toBe("Esecuzione");
    expect(getCategoryLegend([item])).toEqual([{ label: "Produzione", color: "#EC4899" }]);
  });

  it("con v2 e Kanban senza categoria usa un colore neutro e nessuna voce di legenda", () => {
    const [item] = buildProjectCalendarItems(
      [{ ...task, Kanban: { title: "X", color: "#000000", category: null } }],
      "santini",
      "installation",
      { v2: true }
    );
    expect(item.color).toBe("#64748b");
    expect(getCategoryLegend([item])).toEqual([]);
  });
});
