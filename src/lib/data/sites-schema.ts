/** Exact public.customer_sites columns used by Job pickers. Table is not `sites`. */
export const SITE_COLUMNS = ["id", "customer_id", "name", "address"] as const;

export const SITE_SELECT = SITE_COLUMNS.join(", ");
