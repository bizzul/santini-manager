import {
  getOfferFollowUpHighlightState,
  getOfferTrattativaSortPriority,
  OFFER_FOLLOW_UP_HIGHLIGHT_DAYS,
} from "@/lib/offers";

describe("lib/offers - getOfferFollowUpHighlightState", () => {
  it("marks offers as recently contacted when last follow-up is within 14 days", () => {
    const result = getOfferFollowUpHighlightState(
      {
        offer_followups: [
          {
            id: "fu-1",
            contactType: "call",
            contactDate: "2026-04-01T10:00:00.000Z",
            note: "Cliente richiamato",
          },
        ],
      },
      new Date("2026-04-02T12:00:00.000Z"),
    );

    expect(result).toEqual({
      hasRecentFollowUp: true,
      daysSinceFollowUp: 1,
      daysRemaining: OFFER_FOLLOW_UP_HIGHLIGHT_DAYS - 1,
    });
  });

  it("does not highlight offers when the latest follow-up is older than 14 days", () => {
    const result = getOfferFollowUpHighlightState(
      {
        offer_followups: [
          {
            id: "fu-1",
            contactType: "email",
            contactDate: "2026-03-10T09:00:00.000Z",
            note: "Promemoria inviato",
          },
        ],
      },
      new Date("2026-04-02T12:00:00.000Z"),
    );

    expect(result).toEqual({
      hasRecentFollowUp: false,
      daysSinceFollowUp: null,
      daysRemaining: 0,
    });
  });

  it("ignores future-dated follow-ups for the green highlight", () => {
    const result = getOfferFollowUpHighlightState(
      {
        offer_followups: [
          {
            id: "fu-1",
            contactType: "other",
            contactDate: "2026-04-05T09:00:00.000Z",
            note: "Contatto pianificato",
          },
        ],
      },
      new Date("2026-04-02T12:00:00.000Z"),
    );

    expect(result).toEqual({
      hasRecentFollowUp: false,
      daysSinceFollowUp: null,
      daysRemaining: 0,
    });
  });

  it("prioritizes overdue offers without recent follow-up before green ones", () => {
    const now = new Date("2026-04-02T12:00:00.000Z");

    const orangePriority = getOfferTrattativaSortPriority(
      {
        sent_date: "2026-03-20T10:00:00.000Z",
        offer_followups: [],
      },
      now,
    );

    const greenPriority = getOfferTrattativaSortPriority(
      {
        sent_date: "2026-03-20T10:00:00.000Z",
        offer_followups: [
          {
            id: "fu-1",
            contactType: "call",
            contactDate: "2026-04-01T10:00:00.000Z",
            note: "Richiamato",
          },
        ],
      },
      now,
    );

    const neutralPriority = getOfferTrattativaSortPriority(
      {
        sent_date: "2026-03-30T10:00:00.000Z",
        offer_followups: [],
      },
      now,
    );

    expect(orangePriority).toBeLessThan(greenPriority);
    expect(greenPriority).toBeLessThan(neutralPriority);
  });
});
