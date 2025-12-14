import Stripe from "npm:stripe@13.10.0";
import { createClient } from "npm:@supabase/supabase-js@2.46.1";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!stripeSecretKey || !supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required environment variables");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type CandidatePayment = {
  id: string;
  booking_request_id: string;
  deposit_amount: number | null;
  deposit_status: string | null;
  stripe_payment_intent_id: string | null;
  booking_request: {
    id: string;
    status: string | null;
    equipment: {
      deposit_refund_timeline_hours: number | null;
    } | null;
  } | null;
};

type ReturnInspection = {
  id: string;
  booking_id: string;
  verified_by_owner: boolean | null;
  verified_by_renter: boolean | null;
  timestamp: string | null;
  created_at: string | null;
};

const getBearerToken = (authHeader: string | null): string | null => {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const base64UrlPayload = parts[1];
  const base64Payload = base64UrlPayload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64Payload.padEnd(
    base64Payload.length + ((4 - (base64Payload.length % 4)) % 4),
    "="
  );

  try {
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  const token = getBearerToken(authHeader);
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = decodeJwtPayload(token);
  if (payload?.role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const rawLimit = url.searchParams.get("limit");
  const limit = Math.min(250, Math.max(1, Number(rawLimit || "50")));

  const dryRun = url.searchParams.get("dryRun") === "true";

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: candidatePayments, error: paymentErr } = await supabase
      .from("payments")
      .select(
        `
          id,
          booking_request_id,
          deposit_amount,
          deposit_status,
          stripe_payment_intent_id,
          booking_request:booking_requests(
            id,
            status,
            equipment:equipment(deposit_refund_timeline_hours)
          )
        `
      )
      .eq("deposit_status", "held")
      .gt("deposit_amount", 0)
      .not("stripe_payment_intent_id", "is", null)
      .limit(limit);

    if (paymentErr) {
      throw paymentErr;
    }

    const payments = (candidatePayments || []) as CandidatePayment[];
    const bookingIds = payments.map((p) => p.booking_request_id).filter(Boolean);

    if (bookingIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun,
          scanned: 0,
          eligible: 0,
          released: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: returnInspections, error: inspectionErr } = await supabase
      .from("equipment_inspections")
      .select(
        "id, booking_id, verified_by_owner, verified_by_renter, timestamp, created_at"
      )
      .in("booking_id", bookingIds)
      .eq("inspection_type", "return");

    if (inspectionErr) {
      throw inspectionErr;
    }

    const inspections = (returnInspections || []) as ReturnInspection[];
    const returnInspectionByBookingId = new Map<string, ReturnInspection>();
    for (const inspection of inspections) {
      const existing = returnInspectionByBookingId.get(inspection.booking_id);
      if (!existing) {
        returnInspectionByBookingId.set(inspection.booking_id, inspection);
        continue;
      }

      const existingTimestamp = Date.parse(
        existing.timestamp || existing.created_at || ""
      );
      const nextTimestamp = Date.parse(
        inspection.timestamp || inspection.created_at || ""
      );

      if (
        Number.isNaN(existingTimestamp) ||
        (!Number.isNaN(nextTimestamp) && nextTimestamp > existingTimestamp)
      ) {
        returnInspectionByBookingId.set(inspection.booking_id, inspection);
      }
    }

    const { data: pendingClaims, error: claimsErr } = await supabase
      .from("damage_claims")
      .select("booking_id")
      .in("booking_id", bookingIds)
      .in("status", ["pending", "disputed"]);

    if (claimsErr) {
      throw claimsErr;
    }

    const pendingClaimBookingIds = new Set<string>(
      (pendingClaims || []).map((c) => c.booking_id as string)
    );

    let eligible = 0;
    let released = 0;
    const errors: Array<{ paymentId: string; bookingId: string; error: string }> = [];

    for (const payment of payments) {
      const bookingId = payment.booking_request_id;
      const depositAmount = Number(payment.deposit_amount || 0);
      if (!bookingId || depositAmount <= 0) continue;

      if (pendingClaimBookingIds.has(bookingId)) continue;

      const returnInspection = returnInspectionByBookingId.get(bookingId);
      if (!returnInspection?.verified_by_renter) continue;

      const windowHours =
        payment.booking_request?.equipment?.deposit_refund_timeline_hours ?? 48;
      const submittedAt = returnInspection.timestamp || returnInspection.created_at;
      const submittedAtMs = Date.parse(submittedAt || "");
      if (Number.isNaN(submittedAtMs)) continue;

      const claimWindowExpired = Date.now() > submittedAtMs + windowHours * 60 * 60 * 1000;

      const canReleaseNow = !!returnInspection.verified_by_owner || claimWindowExpired;
      if (!canReleaseNow) continue;

      eligible += 1;
      if (dryRun) continue;

      // Lock deposit to prevent concurrent refunds
      const { data: depositLock, error: lockErr } = await supabase
        .from("payments")
        .update({ deposit_status: "releasing" })
        .eq("id", payment.id)
        .eq("deposit_status", "held")
        .select("id")
        .maybeSingle();

      if (lockErr) {
        errors.push({
          paymentId: payment.id,
          bookingId,
          error: lockErr.message,
        });
        continue;
      }

      if (!depositLock) {
        continue;
      }

      // Re-check for pending claims after locking.
      const { data: claimsAfterLock, error: claimsAfterLockErr } = await supabase
        .from("damage_claims")
        .select("id")
        .eq("booking_id", bookingId)
        .in("status", ["pending", "disputed"]);

      if (claimsAfterLockErr) {
        const { error: resetErr } = await supabase
          .from("payments")
          .update({ deposit_status: "held" })
          .eq("id", payment.id)
          .eq("deposit_status", "releasing");
        if (resetErr) {
          console.error("Failed to reset deposit status after claims re-check error:", resetErr);
        }

        errors.push({
          paymentId: payment.id,
          bookingId,
          error: claimsAfterLockErr.message,
        });
        continue;
      }

      if (claimsAfterLock && claimsAfterLock.length > 0) {
        const { error: resetErr } = await supabase
          .from("payments")
          .update({ deposit_status: "held" })
          .eq("id", payment.id)
          .eq("deposit_status", "releasing");
        if (resetErr) {
          console.error("Failed to reset deposit status after late claim:", resetErr);
        }
        continue;
      }

      // Auto-accept the return if claim window expired and the owner never confirmed.
      if (claimWindowExpired && !returnInspection.verified_by_owner) {
        const { error: acceptErr } = await supabase
          .from("equipment_inspections")
          .update({ verified_by_owner: true, owner_signature: "auto_accepted" })
          .eq("id", returnInspection.id)
          .or("verified_by_owner.eq.false,verified_by_owner.is.null");
        if (acceptErr) {
          console.error("Failed to auto-accept return inspection:", acceptErr);
          errors.push({
            paymentId: payment.id,
            bookingId,
            error: `Failed to auto-accept return inspection (${returnInspection.id}): ${acceptErr.message}`,
          });
        }
      }

      try {
        await stripe.refunds.create(
          {
            payment_intent: payment.stripe_payment_intent_id!,
            amount: Math.round(depositAmount * 100),
            reason: "requested_by_customer",
            metadata: {
              type: "deposit_release_auto",
              booking_id: bookingId,
              payment_id: payment.id,
            },
          },
          {
            idempotencyKey: `deposit_release_${payment.id}`,
          }
        );
      } catch (stripeError) {
        console.error("Stripe refund error:", stripeError);
        const { error: resetErr } = await supabase
          .from("payments")
          .update({ deposit_status: "held" })
          .eq("id", payment.id)
          .eq("deposit_status", "releasing");
        if (resetErr) {
          console.error("Failed to reset deposit status after Stripe error:", resetErr);
        }

        errors.push({
          paymentId: payment.id,
          bookingId,
          error: stripeError instanceof Error ? stripeError.message : "Stripe refund failed",
        });
        continue;
      }

      // Finalize payment record
      const nowIso = new Date().toISOString();
      const { error: finalizeErr } = await supabase
        .from("payments")
        .update({
          deposit_status: "released",
          deposit_released_at: nowIso,
        })
        .eq("id", payment.id);

      if (finalizeErr) {
        errors.push({
          paymentId: payment.id,
          bookingId,
          error: finalizeErr.message,
        });
        continue;
      }

      released += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        scanned: payments.length,
        eligible,
        released,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error auto-releasing deposits:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

