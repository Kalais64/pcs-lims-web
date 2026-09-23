const BLOCKED = new Set(["units", "unit", "lab_samples", "sample_records"]);
const SAMPLE_SELECT_COMPACT =
  "id,job_id,sampling_event_id,sample_code,barcode,matrix_id,collected_at,received_at,hold_time_hours,storage_location,status,notes,created_at,updated_at,verified_by,verified_at,approved_by,approved_at,receive_notes";

function restTable(url) {
  const path = new URL(url, "https://local.invalid").pathname;
  return path.match(/\/rest\/v1\/([A-Za-z0-9_]+)/)?.[1] ?? null;
}

function wouldHitNetwork(url) {
  const table = restTable(url);
  return !(table && BLOCKED.has(table));
}

for (const url of [
  "https://example.supabase.co/rest/v1/units?select=*&limit=1",
  "https://example.supabase.co/rest/v1/lab_samples?select=id,sample_no",
  "https://example.supabase.co/rest/v1/sample_records?select=id,sample_number",
]) {
  if (wouldHitNetwork(url)) throw new Error(`would leak ${url}`);
}

const samples = new URL(
  "https://example.supabase.co/rest/v1/samples?select=id,sample_id,sample_no,sample_number",
);
samples.searchParams.set("select", SAMPLE_SELECT_COMPACT);
if (["sample_no", "sample_number", "sample_id"].some((col) => samples.searchParams.get("select").includes(col))) {
  throw new Error("phantom columns in rewritten select");
}

console.log("lims-fetch rules: blocked tables silent; samples select locked");
