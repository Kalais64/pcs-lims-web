/** Exact public.samples columns. Never send phantoms to PostgREST. */
export const SAMPLE_COLUMNS = [
  "id",
  "job_id",
  "sampling_event_id",
  "sample_code",
  "barcode",
  "matrix_id",
  "collected_at",
  "received_at",
  "hold_time_hours",
  "storage_location",
  "status",
  "notes",
  "created_at",
  "updated_at",
  "verified_by",
  "verified_at",
  "approved_by",
  "approved_at",
  "receive_notes",
] as const;

export const SAMPLE_SELECT = SAMPLE_COLUMNS.join(", ");

export const SAMPLE_SELECT_COMPACT = SAMPLE_COLUMNS.join(",");
