export type ClientCodeInput = {
  clientType?: string | null;
  businessName?: string | null;
  individualFirstName?: string | null;
  individualLastName?: string | null;
  code?: string | null;
};

function compactUpper(value?: string | null) {
  return (value || "").replace(/\s+/g, "").toUpperCase();
}

/**
 * `Client.code` is NOT NULL. Business clients often have no first/last name,
 * so initials-only generation would insert an empty string and fail (or collide).
 */
export function generateClientCode(
  input: ClientCodeInput,
  fallback = "CLI",
): string {
  const existing = input.code?.trim();
  if (existing) return existing;

  const clientType =
    input.clientType === "INDIVIDUAL" ? "INDIVIDUAL" : "BUSINESS";

  if (clientType === "INDIVIDUAL") {
    const initials = compactUpper(
      `${(input.individualFirstName || "").slice(0, 2)}${(input.individualLastName || "").slice(0, 2)}`,
    );
    if (initials) return initials;
  }

  const fromBusiness = compactUpper(input.businessName).slice(0, 4);
  if (fromBusiness) return fromBusiness;

  const fromPerson = compactUpper(
    `${input.individualFirstName || ""}${input.individualLastName || ""}`,
  ).slice(0, 4);
  if (fromPerson) return fromPerson;

  return fallback;
}

export function normalizeClientType(
  value?: string | null,
): "BUSINESS" | "INDIVIDUAL" {
  return value === "INDIVIDUAL" ? "INDIVIDUAL" : "BUSINESS";
}
