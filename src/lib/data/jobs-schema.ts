/** Exact public.jobs columns. Never send phantoms to PostgREST. */
export const JOB_COLUMNS = [
  "id",
  "number",
  "customer_id",
  "site_id",
  "quotation_id",
  "status",
  "due_date",
  "scope_notes",
  "created_by",
  "created_at",
  "updated_at",
] as const;

export const JOB_SELECT = JOB_COLUMNS.join(", ");
