import type { Contact, Customer } from "@/lib/domain/types";

export function customersForJobPicker(
  customers: Customer[],
  keepId?: string | null,
): Customer[] {
  const keep = keepId?.trim() ?? "";
  return customers.filter((row) => row.isActive || (keep && row.id === keep));
}

export function firstActiveCustomerId(customers: Customer[], fallback = ""): string {
  return customers.find((row) => row.isActive)?.id ?? fallback;
}

export function primaryContact(contacts: Contact[], customerId: string): Contact | undefined {
  const rows = contacts.filter((row) => row.customerId === customerId);
  return rows.find((row) => row.isPrimary) ?? rows[0];
}

export function withPrimaryPic(customers: Customer[], contacts: Contact[]): Customer[] {
  return customers.map((customer) => {
    const pic = primaryContact(contacts, customer.id)?.fullName;
    return pic ? { ...customer, pic } : customer;
  });
}
