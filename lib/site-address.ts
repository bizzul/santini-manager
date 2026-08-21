export type SiteAddressParts = {
  street: string;
  town: string;
};

const STREET_HINT =
  /\d|via|viale|piazza|strada|corso|vicolo|rue|route|platz|strasse|weg/i;

export function looksLikeStreetPart(value: string) {
  return STREET_HINT.test(value.trim());
}

export function formatSiteAddress(street: string, town: string) {
  return [street.trim(), town.trim()].filter(Boolean).join(", ");
}

export function splitSiteAddress(value: string | null | undefined): SiteAddressParts {
  const normalized = (value || "").trim();
  if (!normalized) {
    return { street: "", town: "" };
  }

  const [firstPart, ...rest] = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (rest.length > 0) {
    const street = firstPart || "";
    const town = rest.join(", ");
    if (!looksLikeStreetPart(street) && looksLikeStreetPart(town)) {
      return { street: town, town: street };
    }
    return { street, town };
  }

  return looksLikeStreetPart(normalized)
    ? { street: normalized, town: "" }
    : { street: "", town: normalized };
}

export function getClientSiteAddress(client: {
  address?: string | null;
  city?: string | null;
} | null | undefined): SiteAddressParts {
  if (!client) {
    return { street: "", town: "" };
  }
  return {
    street: String(client.address || "").trim(),
    town: String(client.city || "").trim(),
  };
}

export function isEquivalentSiteAddress(
  left: SiteAddressParts,
  right: SiteAddressParts,
) {
  const a = formatSiteAddress(left.street, left.town).toLowerCase();
  const b = formatSiteAddress(right.street, right.town).toLowerCase();
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a === b) return true;
  return (
    formatSiteAddress(left.town, left.street).toLowerCase() === b ||
    formatSiteAddress(right.town, right.street).toLowerCase() === a
  );
}
