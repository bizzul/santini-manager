import { buildProjectCalendarItems } from "@/components/calendar/calendar-utils";
import { layoutAllDaySegments } from "@/components/calendar/week/all-day-layout";

const WEEK_21_27_SEPT = [
  "2026-09-21",
  "2026-09-22",
  "2026-09-23",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
];

describe("components/calendar/week/all-day-layout", () => {
  const [leCalle] = buildProjectCalendarItems(
    [
      {
        id: 692,
        unique_code: "26-130",
        name: "Le Calle",
        posa_data_inizio: "2026-08-24",
        posa_data_fine: "2026-10-09",
        posa_ora_inizio: "13:00:00",
        posa_ora_fine: "13:00:00",
      },
    ],
    "santini",
    "installation"
  );

  it("Le Calle nella settimana 21-27.09: una sola barra Lun->Dom che continua prima e dopo", () => {
    expect(leCalle.allDay).toBe(true);
    expect(leCalle.scheduleDisplay).toBe("date-only");
    expect(leCalle.estimatedHours).toBeNull();

    const { segments, laneCount } = layoutAllDaySegments([leCalle], WEEK_21_27_SEPT);
    expect(laneCount).toBe(1);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      startIndex: 0,
      endIndex: 6,
      lane: 0,
      continuesBefore: true,
      continuesAfter: true,
      firstVisibleDayKey: "2026-09-21",
    });
  });

  it("impila le barre sovrapposte su righe diverse e riusa le righe libere", () => {
    const [deadlineMon, deadlineWed] = buildProjectCalendarItems(
      [
        { id: 1, unique_code: "P-1", termine_produzione: "2026-09-21" },
        { id: 2, unique_code: "P-2", termine_produzione: "2026-09-23" },
      ],
      "santini",
      "production"
    );

    const { segments, laneCount } = layoutAllDaySegments(
      [leCalle, deadlineMon, deadlineWed],
      WEEK_21_27_SEPT
    );
    expect(laneCount).toBe(2);
    const byId = new Map(segments.map((segment) => [segment.item.id, segment]));
    expect(byId.get(leCalle.id)?.lane).toBe(0);
    expect(byId.get(deadlineMon.id)).toMatchObject({ lane: 1, startIndex: 0, endIndex: 0 });
    expect(byId.get(deadlineWed.id)).toMatchObject({ lane: 1, startIndex: 2, endIndex: 2 });
  });

  it("esclude gli eventi fuori settimana", () => {
    const { segments } = layoutAllDaySegments([leCalle], [
      "2026-10-12",
      "2026-10-13",
    ]);
    expect(segments).toHaveLength(0);
  });
});
