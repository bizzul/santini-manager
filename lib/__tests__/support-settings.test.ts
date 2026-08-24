import {
  formatTicketNumber,
  isUsefulKbHit,
  parseSupportBotEnabled,
} from "@/lib/support/settings";

describe("support settings helpers", () => {
  it("formats ticket numbers", () => {
    expect(formatTicketNumber(12)).toBe("SUP-12");
  });

  it("parses the support bot flag", () => {
    expect(parseSupportBotEnabled(true)).toBe(true);
    expect(parseSupportBotEnabled("true")).toBe(true);
    expect(parseSupportBotEnabled(false)).toBe(false);
    expect(parseSupportBotEnabled(undefined)).toBe(false);
  });

  it("applies kb usefulness thresholds", () => {
    expect(isUsefulKbHit(0.09, 0)).toBe(true);
    expect(isUsefulKbHit(0.01, 0.5)).toBe(true);
    expect(isUsefulKbHit(0.01, 0.1)).toBe(false);
  });
});
