import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import type { Payment } from "../types/payment";
import { PAYMENT_STATUS, ESCROW_STATUS } from "../types/payment";
import { calculatePaymentSummary } from "../lib/payment";

interface CreatePaymentParams {
  bookingRequestId: string;
  ownerId: string;
  totalAmount: number;
  paymentMethodId: string;
}

interface ProcessRefundParams {
  paymentId: string;
  reason: string;
}

interface ReleaseEscrowParams {
  paymentId: string;
}

export const usePayment = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a payment and hold funds in escrow
   */
  const createPayment = useCallback(
    async ({
      bookingRequestId,
      ownerId,
      totalAmount,
      paymentMethodId,
    }: CreatePaymentParams): Promise<Payment | null> => {
      if (!user) {
        setError("User must be authenticated");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // Calculate payment breakdown
        const paymentSummary = calculatePaymentSummary(totalAmount);

        // In production, this would call your backend API to:
        // 1. Create a Stripe Payment Intent
        // 2. Confirm the payment with the payment method
        // 3. Store the payment record in Supabase

        // For MVP, we'll simulate the payment process
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .insert({
            booking_request_id: bookingRequestId,
            renter_id: user.id,
            owner_id: ownerId,
            subtotal: paymentSummary.subtotal,
            service_fee: paymentSummary.service_fee,
            tax: paymentSummary.tax,
            total_amount: paymentSummary.total,
            escrow_amount: paymentSummary.escrow_amount,
            owner_payout_amount: paymentSummary.owner_payout,
            payment_status: PAYMENT_STATUS.SUCCEEDED,
            escrow_status: ESCROW_STATUS.HELD,
            payment_method_id: paymentMethodId,
            currency: "usd",
            stripe_payment_intent_id: `pi_mock_${Date.now()}`, // Mock Stripe PI ID
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Update booking request status to approved
        const { error: bookingError } = await supabase
          .from("booking_requests")
          .update({ status: "approved" })
          .eq("id", bookingRequestId);

        if (bookingError) throw bookingError;

        return payment;
      } catch (err) {
        console.error("Payment creation error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to process payment. Please try again."
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Get payment details
   */
  const getPayment = useCallback(async (paymentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("payments")
        .select(
          `
          *,
          booking_request:booking_requests (
            *,
            equipment:equipment (
              title,
              owner:profiles (
                id,
                email,
                full_name
              )
            ),
            renter:profiles (
              id,
              email,
              full_name
            )
          )
        `
        )
        .eq("id", paymentId)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err) {
      console.error("Get payment error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch payment details"
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get all payments for a user
   */
  const getUserPayments = useCallback(
    async (userType: "renter" | "owner") => {
      if (!user) return [];

      setLoading(true);
      setError(null);

      try {
        const column = userType === "renter" ? "renter_id" : "owner_id";

        const { data, error: fetchError } = await supabase
          .from("payments")
          .select(
            `
            *,
            booking_request:booking_requests (
              *,
              equipment:equipment (
                title
              )
            )
          `
          )
          .eq(column, user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        return data || [];
      } catch (err) {
        console.error("Get user payments error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch payments"
        );
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Process a refund via Stripe Edge Function
   */
  const processRefund = useCallback(
    async ({ paymentId, reason }: ProcessRefundParams): Promise<boolean> => {
      if (!user) {
        setError("User must be authenticated");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        // Get session token
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        if (!token) {
          throw new Error("Authentication required");
        }

        // Get Supabase URL
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error("VITE_SUPABASE_URL is not configured");
        }

        // Call Edge Function for refund
        const response = await fetch(
          `${supabaseUrl}/functions/v1/process-refund`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentId, reason }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: "Unknown error",
          }));
          throw new Error(
            errorData.error || `Failed to process refund: ${response.status}`
          );
        }

        return true;
      } catch (err) {
        console.error("Refund error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to process refund"
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Release escrow funds to owner
   */
  const releaseEscrow = useCallback(
    async ({ paymentId }: ReleaseEscrowParams): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        // Get payment details first
        const { data: payment, error: fetchError } = await supabase
          .from("payments")
          .select("*, booking_request:booking_requests(*)")
          .eq("id", paymentId)
          .single();

        if (fetchError) throw fetchError;

        // Verify escrow is currently held
        if (payment.escrow_status !== "held") {
          throw new Error("Escrow funds are not available for release");
        }

        // In production, this would call your backend API to:
        // 1. Create a Stripe Transfer to the owner's connected account
        // 2. Update the escrow status
        // 3. Notify the owner

        const { error: updateError } = await supabase
          .from("payments")
          .update({
            escrow_status: ESCROW_STATUS.RELEASED,
            escrow_released_at: new Date().toISOString(),
          })
          .eq("id", paymentId);

        if (updateError) throw updateError;

        // Update booking request status to completed
        if (payment.booking_request_id) {
          await supabase
            .from("booking_requests")
            .update({ status: "completed" })
            .eq("id", payment.booking_request_id);
        }

        return true;
      } catch (err) {
        console.error("Release escrow error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to release escrow funds"
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get escrow balance for an owner
   */
  const getEscrowBalance = useCallback(async (ownerId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get all payments where escrow is held
      const { data, error: fetchError } = await supabase
        .from("payments")
        .select("escrow_amount")
        .eq("owner_id", ownerId)
        .eq("escrow_status", "held");

      if (fetchError) throw fetchError;

      const totalEscrow = data.reduce(
        (sum, payment) => sum + (payment.escrow_amount || 0),
        0
      );

      return totalEscrow;
    } catch (err) {
      console.error("Get escrow balance error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get escrow balance"
      );
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if escrow can be released for a booking
   */
  const canReleaseEscrow = useCallback(
    async (bookingRequestId: string): Promise<boolean> => {
      try {
        // Get booking details
        const { data: booking, error: bookingError } = await supabase
          .from("booking_requests")
          .select("end_date, status")
          .eq("id", bookingRequestId)
          .single();

        if (bookingError) throw bookingError;

        // Check if rental has ended
        const endDate = new Date(booking.end_date);
        const now = new Date();
        const hasEnded = now > endDate;

        // Check booking status
        const isCompleted = booking.status === "completed";

        return hasEnded && isCompleted;
      } catch (err) {
        console.error("Check escrow release error:", err);
        return false;
      }
    },
    []
  );

  return {
    loading,
    error,
    createPayment,
    getPayment,
    getUserPayments,
    processRefund,
    releaseEscrow,
    getEscrowBalance,
    canReleaseEscrow,
  };
};
