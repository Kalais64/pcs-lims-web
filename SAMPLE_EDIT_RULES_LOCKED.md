# Sample — Edit / Delete Rules (LOCKED)

1. **Status machine only via `transition_sample`:** expected → received → in_testing → pending_verify → pending_approve → approved | rejected | archived. No raw status patch.
2. **Free field edit** only while `expected` or `received` (matrix, client code, condition/receive notes) — role Sampler / Lab receive / Admin; write live Supabase.
3. **From `in_testing` / `pending_verify`+:** no free edit of critical fields; actions = Submit results path, Verify, Approve, Reject (role-gated). Verify ≠ Approve (dua user); Admin override audited.
4. **Cancel / remove:** soft only — `archived` or `rejected` via transition. Hard-delete Sample **forbidden** once received or later (keep audit/CoC integrity).
5. **UI:** status bar/stepper shows current enum + only allowed next actions for the signed-in role (Edit / Archive / Submit / Verify / Approve) with Bahasa labels; hide illegal actions.
