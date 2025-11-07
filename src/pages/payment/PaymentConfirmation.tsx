import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  formatCurrency,
  formatTransactionDate,
  getEscrowStatusText,
} from "../../lib/payment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Home, MessageSquare, Calendar } from "lucide-react";
import type { Database } from "@/lib/database.types";

type PaymentWithRelations = Database["public"]["Tables"]["payments"]["Row"] & {
  booking_request?: Database["public"]["Tables"]["booking_requests"]["Row"] & {
    equipment?: Database["public"]["Tables"]["equipment"]["Row"] & {
      owner?: Database["public"]["Tables"]["profiles"]["Row"];
    };
  };
};

const PaymentConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [payment, setPayment] = useState<PaymentWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paymentId = searchParams.get("payment_id");
  // Handle both Stripe's redirect param (payment_intent) and our custom param (payment_intent_id)
  const paymentIntentId = searchParams.get("payment_intent_id") || searchParams.get("payment_intent");

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // Early authentication check - avoid unnecessary queries
      if (!user) {
        void navigate("/");
        return;
      }

      if (!paymentId && !paymentIntentId) {
        void navigate("/");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Poll for payment (up to 10 seconds with backoff) - similar to PaymentForm
        const maxAttempts = 20;
        const pollInterval = 500; // 500ms

        const pollPayment = async (): Promise<PaymentWithRelations | null> => {
          for (let i = 0; i < maxAttempts; i++) {
            let query = supabase
              .from("payments")
              .select(
                `
                *,
                booking_request:booking_requests (
                  *,
                  equipment:equipment (
                    title,
                    owner:profiles!equipment_owner_id_fkey (
                      id,
                      email
                    )
                  )
                )
              `
              );

            // Query by payment_id if available, otherwise use payment_intent_id
            if (paymentId) {
              query = query.eq("id", paymentId);
            } else if (paymentIntentId) {
              query = query.eq("stripe_payment_intent_id", paymentIntentId);
            }

            const { data, error: queryError } = await query.maybeSingle();

            if (data) {
              // Verify user is authorized to view this payment
              if (!user || (data.renter_id !== user.id && data.owner_id !== user.id)) {
                console.error("Unauthorized access attempt to payment:", data.id);
                void navigate("/");
                return null;
              }
              return data;
            }

            if (queryError && queryError.code !== "PGRST116") {
              // PGRST116 is "not found" which is expected during polling
              console.error("Error polling payment:", queryError);
              // If it's a real error (not just "not found"), throw on first attempt
              if (i === 0) {
                throw queryError;
              }
            }

            // Wait before next poll (except on last iteration)
            if (i < maxAttempts - 1) {
              await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
          }
          return null;
        };

        const paymentData = await pollPayment();

        if (paymentData) {
          setPayment(paymentData);
        } else {
          // Payment not found after polling - show error but don't redirect
          setError(
            "Payment confirmation is still processing. Please check back in a moment or contact support if this persists."
          );
        }
      } catch (error) {
        console.error("Error fetching payment:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load payment details. Please try again or contact support."
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchPaymentDetails();
  }, [paymentId, paymentIntentId, navigate, user, authLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Payment Confirmation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => void navigate("/renter/dashboard")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Go to My Bookings
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void navigate("/")}
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Payment Successful!
          </h1>
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Payment successful! Your booking is confirmed and the owner has been notified.
            </AlertDescription>
          </Alert>
          <p className="text-muted-foreground">
            Your booking has been automatically confirmed. You can now contact the owner to arrange pickup.
          </p>
        </div>

        {/* Payment Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Equipment Info */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Equipment
              </div>
              <div className="text-lg font-semibold">
                {payment.booking_request?.equipment?.title ||
                  "Unknown Equipment"}
              </div>
            </div>

            {/* Rental Dates */}
            {payment.booking_request && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Start Date
                  </div>
                  <div className="font-medium">
                    {new Date(
                      payment.booking_request.start_date
                    ).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    End Date
                  </div>
                  <div className="font-medium">
                    {new Date(
                      payment.booking_request.end_date
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Amount */}
            <div className="border-t border-border pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rental Cost</span>
                  <span>{formatCurrency(payment.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span>{formatCurrency(payment.service_fee)}</span>
                </div>
                {payment.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(payment.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                  <span>Total Paid</span>
                  <span className="text-primary">
                    {formatCurrency(payment.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Info */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-900 dark:text-blue-100 font-medium">
                  Transaction ID
                </span>
                <span className="text-blue-700 dark:text-blue-300 font-mono">
                  {payment.id.substring(0, 16)}...
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-900 dark:text-blue-100 font-medium">
                  Payment Date
                </span>
                <span className="text-blue-700 dark:text-blue-300">
                  {formatTransactionDate(payment.created_at)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-900 dark:text-blue-100 font-medium">
                  Escrow Status
                </span>
                <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100">
                  {getEscrowStatusText(payment.escrow_status)}
                </Badge>
              </div>
            </div>

            {/* Escrow Information */}
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-2">
                Payment Protection
              </h4>
              <p className="text-sm text-muted-foreground">
                Your payment of {formatCurrency(payment.total_amount)} is
                securely held in escrow until the rental is completed. The
                equipment owner will receive their payout after you confirm
                successful equipment return.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <div className="font-medium">Contact the owner</div>
                  <div className="text-sm text-muted-foreground">
                    Coordinate pickup details and any special instructions
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <div className="font-medium">Pick up equipment</div>
                  <div className="text-sm text-muted-foreground">
                    Inspect the equipment and ensure it's in good condition
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <div className="font-medium">Enjoy your adventure</div>
                  <div className="text-sm text-muted-foreground">
                    Use the equipment responsibly and have a great time!
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <div className="font-medium">Return equipment</div>
                  <div className="text-sm text-muted-foreground">
                    Return in the same condition and leave a review
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              void navigate("/");
            }}
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              void navigate("/messages");
            }}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Message Owner
          </Button>

          <Button
            className="w-full"
            onClick={() => {
              void navigate("/renter/dashboard");
            }}
          >
            <Calendar className="h-4 w-4 mr-2" />
            My Bookings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
