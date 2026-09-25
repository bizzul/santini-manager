import {
  formatEventDayProgress,
  mapTaskToEvents,
  type DatedCalendarEvent,
} from "@/lib/calendar/mapTaskToEvents";

const TODAY = new Date(2026, 8, 25);

function single(events: ReturnType<typeof mapTaskToEvents>): DatedCalendarEvent {
  expect(events).toHaveLength(1);
  const [event] = events;
  if (event.missingDate) throw new Error("atteso evento con data");
  return event;
}

describe("lib/calendar/mapTaskToEvents", () => {
  it("26-130 Le Calle: posa 24.08-09.10 13:00-13:00 e' un intervallo all-day di 47 giorni", () => {
    const event = single(
      mapTaskToEvents(
        {
          posa_data_inizio: "2026-08-24",
          posa_data_fine: "2026-10-09",
          posa_ora_inizio: "13:00:00",
          posa_ora_fine: "13:00:00",
          deliveryDate: "2026-10-09T00:00:00",
        },
        "installation",
        { today: TODAY }
      )
    );

    expect(event.kind).toBe("intervallo");
    expect(event.allDay).toBe(true);
    expect(event.startDate).toBe("2026-08-24");
    expect(event.endDate).toBe("2026-10-09");
    expect(event.durataGiorni).toBe(47);
    expect(event.timePending).toBe(false);
    expect(event.oraInizio).toBe("13:00");
    expect(event.start).toEqual(new Date(2026, 7, 24));
    expect(event.end).toEqual(new Date(2026, 9, 10));
    expect(formatEventDayProgress(event, "2026-09-21")).toBe("g 29 di 47");
    expect(formatEventDayProgress(event, "2026-10-10")).toBeNull();
  });

  it("posa con sola data fine: evento di un giorno sulla data fine", () => {
    const event = single(
      mapTaskToEvents({ posa_data_inizio: null, posa_data_fine: "2026-09-23" }, "installation")
    );

    expect(event.kind).toBe("appuntamento");
    expect(event.allDay).toBe(false);
    expect(event.startDate).toBe("2026-09-23");
    expect(event.endDate).toBe("2026-09-23");
    expect(event.durataGiorni).toBe(1);
    expect(event.inferredStart).toBe(true);
    expect(event.timePending).toBe(true);
  });

  it("produzione con solo termine_produzione: scadenza su termine_produzione", () => {
    const task = {
      produzione_data_fine: null,
      termine_produzione: "2026-09-22",
      isInFinalColumn: false,
    };
    const event = single(mapTaskToEvents(task, "production", { today: TODAY }));

    expect(event.kind).toBe("scadenza");
    expect(event.allDay).toBe(true);
    expect(event.startDate).toBe("2026-09-22");
    expect(event.endDate).toBe("2026-09-22");
    expect(event.durataGiorni).toBe(1);
    expect(event.inRitardo).toBe(true);

    const done = single(
      mapTaskToEvents({ ...task, isInFinalColumn: true }, "production", { today: TODAY })
    );
    expect(done.inRitardo).toBe(false);

    const future = single(
      mapTaskToEvents({ ...task, termine_produzione: "2026-09-30" }, "production", {
        today: TODAY,
      })
    );
    expect(future.inRitardo).toBe(false);
  });

  it("produzione: produzione_data_fine ha precedenza su termine_produzione", () => {
    const event = single(
      mapTaskToEvents(
        {
          produzione_data_inizio: "2026-09-01",
          produzione_data_fine: "2026-09-10",
          termine_produzione: "2026-09-12",
        },
        "production",
        { today: TODAY }
      )
    );
    expect(event.kind).toBe("scadenza");
    expect(event.startDate).toBe("2026-09-10");
    expect(event.endDate).toBe("2026-09-10");
  });

  it("service con orario ma senza data: evento 'Manca data'", () => {
    const [event] = mapTaskToEvents(
      { service_ora_inizio: "09:00:00", service_ora_fine: "11:00:00" },
      "service"
    );

    expect(event.missingDate).toBe(true);
    expect(event.start).toBeNull();
    expect(event.oraInizio).toBe("09:00");
    expect(event.oraFine).toBe("11:00");
  });

  it("service completo 08:00-10:00: appuntamento con orario", () => {
    const event = single(
      mapTaskToEvents(
        {
          service_data_inizio: "2026-09-24",
          service_data_fine: "2026-09-24",
          service_ora_inizio: "08:00:00",
          service_ora_fine: "10:00:00",
        },
        "service"
      )
    );

    expect(event.kind).toBe("appuntamento");
    expect(event.allDay).toBe(false);
    expect(event.timePending).toBe(false);
    expect(event.start).toEqual(new Date(2026, 8, 24, 8, 0));
    expect(event.end).toEqual(new Date(2026, 8, 24, 10, 0));
  });

  it("nessuna data e nessun orario di fase: nessun evento", () => {
    expect(mapTaskToEvents({}, "installation")).toEqual([]);
    expect(mapTaskToEvents({ ora_inizio: "08:00" }, "service")).toEqual([]);
    expect(mapTaskToEvents({}, "production")).toEqual([]);
  });
});
