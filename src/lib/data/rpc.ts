import type { SupabaseClient } from "@supabase/supabase-js";

export type RpcResult = { ok: true; data?: unknown } | { ok: false; message: string };

function isMissingFn(message: string) {
  return /could not find the function|PGRST202|schema cache/i.test(message);
}

export async function callRpc(
  client: SupabaseClient,
  fn: string,
  variants: Record<string, unknown>[],
): Promise<RpcResult> {
  let last = "RPC gagal.";
  for (const args of variants) {
    const { data, error } = await client.rpc(fn, args);
    if (!error) return { ok: true, data };
    last = error.message || last;
    if (!isMissingFn(last)) return { ok: false, message: last };
  }
  return { ok: false, message: last };
}

export function transitionVariants(
  id: string,
  toStatus: string,
  extra?: { reason?: string | null; override?: boolean; lhuNumber?: string },
) {
  const reason = extra?.reason ?? null;
  const override = extra?.override ?? false;
  const withLhu = extra?.lhuNumber
    ? [
        {
          p_id: id,
          p_to_status: toStatus,
          p_reason: reason,
          p_lhu_number: extra.lhuNumber,
        },
        {
          id,
          to_status: toStatus,
          reason,
          lhu_number: extra.lhuNumber,
        },
      ]
    : [];
  return [
    ...withLhu,
    { p_id: id, p_to_status: toStatus, p_reason: reason, p_override: override },
    { id, to_status: toStatus, reason, override },
    { p_job_id: id, p_to_status: toStatus, p_reason: reason, p_override: override },
    { p_sample_id: id, p_to_status: toStatus, p_reason: reason, p_override: override },
    { p_invoice_id: id, p_to_status: toStatus, p_reason: reason },
    { p_lhu_id: id, p_to_status: toStatus, p_reason: reason, p_lhu_number: extra?.lhuNumber ?? null },
  ];
}

export async function transitionJob(
  client: SupabaseClient,
  id: string,
  toStatus: string,
  extra?: { reason?: string | null; override?: boolean },
) {
  return callRpc(client, "transition_job", transitionVariants(id, toStatus, extra));
}

export async function transitionSample(
  client: SupabaseClient,
  id: string,
  toStatus: string,
  extra?: { reason?: string | null; override?: boolean },
) {
  return callRpc(client, "transition_sample", transitionVariants(id, toStatus, extra));
}

export async function transitionLhu(
  client: SupabaseClient,
  id: string,
  toStatus: string,
  extra?: { reason?: string | null; lhuNumber?: string },
) {
  return callRpc(client, "transition_lhu", transitionVariants(id, toStatus, extra));
}

export async function transitionInvoice(
  client: SupabaseClient,
  id: string,
  toStatus: string,
  extra?: { reason?: string | null },
) {
  return callRpc(client, "transition_invoice", transitionVariants(id, toStatus, extra));
}
