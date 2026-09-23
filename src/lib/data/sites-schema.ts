/** Exact public.customer_sites columns. Table is not `sites`. */
export const SITE_COLUMNS = [
  "id",
  "customer_id",
  "name",
  "address",
  "city",
  "province",
  "latitude",
  "longitude",
  "created_at",
  "updated_at",
] as const;

export const SITE_SELECT = SITE_COLUMNS.join(", ");
