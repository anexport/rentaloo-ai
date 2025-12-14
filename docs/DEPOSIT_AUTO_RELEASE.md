# Deposit Auto-Release (Supabase)

This repo includes a scheduled Edge Function to automatically release security deposits after:
- the owner confirms the renter-submitted return inspection, **or**
- the claim window expires (auto-accept).

## Edge Function

- Function: `supabase/functions/auto-release-deposits`
- Endpoint: `https://<PROJECT_REF>.functions.supabase.co/auto-release-deposits`
- Auth: requires a JWT with `role=service_role` in the `Authorization: Bearer <token>` header.

Query params:
- `limit` (default `50`, max `250`): how many `payments` rows to scan per run
- `dryRun=true`: compute eligibility without refunding

## Deploy

Deploy normally (keep JWT verification enabled):
- `supabase functions deploy auto-release-deposits --project-ref <PROJECT_REF>`

## Schedule (Supabase Dashboard)

Create a scheduled trigger that calls the function (recommended: every 15–60 minutes).

In the trigger config, make sure the request uses **service role** authorization (not anon), e.g.:
- Header: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

Example cron:
- `*/15 * * * *` (every 15 minutes)

## What It Releases

For each eligible `payments` row (`deposit_status='held'`):
- requires a renter-submitted return inspection (`verified_by_renter=true`)
- blocks release if there are pending/disputed claims
- releases immediately if `verified_by_owner=true`
- otherwise releases after `equipment.deposit_refund_timeline_hours` (default `48`) and auto-accepts the return inspection.

  Next steps on Supabase:

  - Deploy: supabase functions deploy auto-release-deposits --project-ref <PROJECT_REF>
  - In Supabase Dashboard, create a scheduled trigger (e.g. */15 * * * *) that
    calls auto-release-deposits with service role auth: Authorization: Bearer
    <SUPABASE_SERVICE_ROLE_KEY>
  - Optional dry run test: curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
    "https://<PROJECT_REF>.functions.supabase.co/auto-release-deposits?dryRun=true"