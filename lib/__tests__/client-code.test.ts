import { generateClientCode, normalizeClientType } from "@/lib/client-code";

describe("generateClientCode", () => {
  it("keeps an existing code", () => {
    expect(
      generateClientCode({
        clientType: "BUSINESS",
        businessName: "Santini SA",
        code: "SAN-01",
      }),
    ).toBe("SAN-01");
  });

  it("uses the business name for company clients", () => {
    expect(
      generateClientCode({
        clientType: "BUSINESS",
        businessName: "Bianchi SA",
      }),
    ).toBe("BIAN");
  });

  it("does not insert an empty code when a company has no person name", () => {
    expect(
      generateClientCode({
        clientType: "BUSINESS",
        businessName: "",
        individualFirstName: "",
        individualLastName: "",
      }),
    ).toBe("CLI");
  });

  it("uses initials for private clients", () => {
    expect(
      generateClientCode({
        clientType: "INDIVIDUAL",
        individualFirstName: "Mauro",
        individualLastName: "Rossi",
      }),
    ).toBe("MARO");
  });
});

describe("normalizeClientType", () => {
  it("defaults unknown values to BUSINESS", () => {
    expect(normalizeClientType(undefined)).toBe("BUSINESS");
    expect(normalizeClientType("")).toBe("BUSINESS");
    expect(normalizeClientType("INDIVIDUAL")).toBe("INDIVIDUAL");
  });
});
