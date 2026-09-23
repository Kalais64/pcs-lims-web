import { SAMPLE_SELECT_COMPACT } from "../data/samples-schema";

const BLOCKED_TABLES = new Set(["units", "unit", "lab_samples", "sample_records"]);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function restTable(url: string): string | null {
  try {
    const path = new URL(url, "https://local.invalid").pathname;
    const match = path.match(/\/rest\/v1\/([A-Za-z0-9_]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function blockedResponse() {
  return new Response(JSON.stringify({ message: "blocked table", code: "PGRST205" }), {
    status: 404,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Drop units / lab_samples / sample_records at the wire. Rewrite samples GET select. */
export function limsFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = requestUrl(input);
  const table = restTable(raw);
  if (table && BLOCKED_TABLES.has(table)) {
    return Promise.resolve(blockedResponse());
  }

  if (table === "samples") {
    try {
      const next = new URL(raw);
      next.searchParams.set("select", SAMPLE_SELECT_COMPACT);
      if (typeof input === "string" || input instanceof URL) {
        return fetch(next.toString(), init);
      }
      return fetch(new Request(next.toString(), input), init);
    } catch {
      return fetch(input, init);
    }
  }

  return fetch(input, init);
}
