/** Exact public.customers / contacts columns — no alias probes. */
export const CUSTOMER_COLUMNS = [
  "id",
  "code",
  "name",
  "npwp",
  "billing_address",
  "phone",
  "email",
  "notes",
  "is_active",
  "created_at",
  "updated_at",
] as const;

export const CUSTOMER_SELECT = CUSTOMER_COLUMNS.join(", ");

export const CONTACT_COLUMNS = [
  "id",
  "customer_id",
  "full_name",
  "title",
  "phone",
  "email",
  "is_primary",
  "created_at",
  "updated_at",
] as const;

export const CONTACT_SELECT = CONTACT_COLUMNS.join(", ");
