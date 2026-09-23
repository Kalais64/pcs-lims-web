import type { SupabaseClient } from "@supabase/supabase-js";

export type RpcResult = { ok: true; data?: unknown } | { ok: false; message: string };

type TransitionArgs = {
  p_id: string;
  p_to: string;
  p_reason: string | null;
  p_override?: boolean;
  p_lhu_number?: string | null;
};

async function callTransition(
  client: SupabaseClient,
  fn: "transition_job" | "transition_sample" | "transition_lhu" | "transition_invoice",
  args: TransitionArgs,
): Promise<RpcResult> {
  const { data, error } = await client.rpc(fn, args);
  if (error) return { ok: false, message: error.message || "RPC gagal." };
  return { ok: true, data };
}

export async function transitionJob(
  client: SupabaseClient,
  id: string,
  toStatus: string,
  extra?: { reason?: string | null; override?: boolean },
) {
  return callTransition(client, "transition_job", {
    p_id: id,
    p_to: toStatus,
    p_reason: extra?.reason ?? null,
    p_override: extra?.override ?? false,
  });
}

export async function transitionSample(
  client: SupabaseClient,
  id: string,
  toStatus: string,
  extra?: { reason?: string | null; override?: boolean },
) {
  return callTransition(client, "transition_sample", {
    p_id: id,
    p_to: toStatus,
    p_reason: extra?.reason ?? null,
    p_override: extra?.override ?? false,
  });
}

export async function transitionLhu(
  client: SupabaseClient,
  id: string,
  toStatus: string,
  extra?: { reason?: string | null; lhuNumber?: string },
) {
  return callTransition(client, "transition_lhu", {
    p_id: id,
    p_to: toStatus,
    p_reason: extra?.reason ?? null,
    p_lhu_number: extra?.lhuNumber ?? null,
  });
}

export async function transitionInvoice(
  client: SupabaseClient,
  id: string,
  toStatus: string,
  extra?: { reason?: string | null },
) {
  return callTransition(client, "transition_invoice", {
    p_id: id,
    p_to: toStatus,
    p_reason: extra?.reason ?? null,
  });
}
