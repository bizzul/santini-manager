import type { Client, ClientContactPerson } from "@/types/supabase";

function normalizeContactValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : "";
}

export function getEmptyClientContactPerson(): ClientContactPerson {
  return {
    name: "",
    role: "",
    email: "",
    phone: "",
  };
}

export function normalizeClientContactPeople(
  contactPeople?: ClientContactPerson[] | null
): ClientContactPerson[] {
  if (!Array.isArray(contactPeople)) {
    return [];
  }

  return contactPeople
    .map((contact) => ({
      name: normalizeContactValue(contact?.name),
      role: normalizeContactValue(contact?.role),
      email: normalizeContactValue(contact?.email),
      phone: normalizeContactValue(contact?.phone),
    }))
    .filter((contact) =>
      [contact.name, contact.role, contact.email, contact.phone].some(Boolean)
    );
}

function clientDisplayName(client: Client | null | undefined) {
  if (!client) return "";
  return (
    `${client.individualLastName || ""} ${client.individualFirstName || ""}`.trim() ||
    client.businessName?.trim() ||
    ""
  );
}

export function getPrimaryClientContact(client: Client | null | undefined): {
  name: string;
  phone: string;
} {
  const people = normalizeClientContactPeople(client?.contactPeople);
  const first = people[0];
  return {
    name: first?.name || clientDisplayName(client),
    phone:
      first?.phone ||
      client?.mobilePhone?.trim() ||
      client?.phone?.trim() ||
      client?.landlinePhone?.trim() ||
      "",
  };
}

export function isEquivalentClientContact(
  left: { name: string; phone: string },
  right: { name: string; phone: string },
) {
  const normalizePhone = (value: string) => value.replace(/\s+/g, "");
  return (
    left.name.trim().toLowerCase() === right.name.trim().toLowerCase() &&
    normalizePhone(left.phone) === normalizePhone(right.phone)
  );
}
