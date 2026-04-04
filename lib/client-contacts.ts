import type { ClientContactPerson } from "@/types/supabase";

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
