import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  getStripe,
  createPaymentIntent,
  paymentBookingDataSchema,
  type PaymentBookingData,
} from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CreditCard,
  Lock,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/payment";

// Stripe logo SVG component
const StripeLogo = ({ className = "h-6" }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 60 25"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Stripe"
  >
    <path
      fill="currentColor"
      d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-6.3-5.63c-1.03 0-1.68.73-1.81 2.34h3.53c-.08-1.53-.66-2.34-1.72-2.34zM39.04 5.57c1.65 0 2.8.71 3.16 1.7l-.04-1.45h4.06v14.06h-4.06l.04-1.67c-.37 1.03-1.58 1.9-3.3 1.9-3.12 0-5.34-2.96-5.34-7.35 0-4.4 2.15-7.19 5.48-7.19zm.95 3.57c-1.3 0-2.17 1.2-2.17 3.62 0 2.4.87 3.65 2.17 3.65 1.3 0 2.18-1.2 2.18-3.65 0-2.4-.88-3.62-2.18-3.62zM27.94 20.12h-4.06V5.77h4.02l.04 1.67c.42-1.14 1.52-1.87 3.04-1.87.2 0 .38.01.57.04v3.93c-.23-.04-.47-.06-.73-.06-1.33 0-2.76.66-2.76 2.65v7.99h-.12zm-7.7 0h-4.1V5.77h4.1v14.35zm-2.05-16c-1.35 0-2.4-.94-2.4-2.17 0-1.24 1.05-2.18 2.4-2.18s2.4.94 2.4 2.18c0 1.23-1.05 2.17-2.4 2.17zM9.3 5.57c1.65 0 2.8.71 3.16 1.7l-.04-1.5h4.1v14.35h-4.1l.04-1.67c-.36 1.03-1.57 1.9-3.29 1.9-3.12 0-5.34-2.96-5.34-7.35 0-4.4 2.15-7.19 5.48-7.19zm.95 3.57c-1.3 0-2.17 1.2-2.17 3.62 0 2.4.87 3.65 2.17 3.65 1.3 0 2.18-1.2 2.18-3.65 0-2.4-.88-3.62-2.18-3.62z"
    />
  </svg>
);

type PaymentCheckoutFormProps = {
  /** Booking data to create payment intent - NO booking exists in DB yet */
  bookingData: PaymentBookingData;
  /** Total amount for display */
  totalAmount: number;
  /** Called when payment succeeds */
  onSuccess?: () => void;
  /** Called when user wants to go back/cancel */
  onCancel?: () => void;
};

type PaymentCheckoutFormInnerProps = PaymentCheckoutFormProps & {
  paymentIntentId: string;
};

const PaymentCheckoutFormInner = ({
  totalAmount,
  onSuccess,
  onCancel,
  paymentIntentId,
}: PaymentCheckoutFormInnerProps) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe is not initialized. Please refresh the page.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/confirmation?payment_intent_id=${paymentIntentId}`,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Payment failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Payment succeeded!
      // The booking is created by the webhook, not here
      // Navigate to confirmation page
      onSuccess?.();
      void navigate(`/payment/confirmation?payment_intent_id=${paymentIntentId}`);
    } catch (err) {
      console.error("Payment error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Payment failed. Please try again or use a different payment method."
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          disabled={isProcessing}
          className="shrink-0"
          aria-label="Go back to booking"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Complete Payment</h2>
          <p className="text-muted-foreground">
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>

      {/* Main Payment Card */}
      <Card className="overflow-hidden border-2">
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Payment Details</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your card information
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <StripeLogo className="h-5 opacity-70" />
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Stripe Payment Element */}
            <div className="rounded-lg border border-input bg-background p-4">
              <PaymentElement
                options={{
                  layout: "tabs",
                }}
              />
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Your payment is secure
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  All transactions are encrypted and processed securely through Stripe. 
                  We never store your full card details.
                </p>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isProcessing}
              >
                Go Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                size="lg"
                disabled={!stripe || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Pay {formatCurrency(totalAmount)}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Trust Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: ShieldCheck, label: "Escrow Protected" },
          { icon: Lock, label: "SSL Encrypted" },
          { icon: CheckCircle2, label: "Money-Back Guarantee" },
          { icon: CreditCard, label: "Secure Payments" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50 text-center"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PaymentCheckoutForm = ({
  bookingData,
  totalAmount,
  onSuccess,
  onCancel,
}: PaymentCheckoutFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<
    import("@stripe/stripe-js").Stripe | null
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Safely serialize bookingData to create a stable dependency for useEffect
  // Uses try-catch to handle edge cases (though circular refs are unlikely for this flat object)
  const bookingDataKey = useMemo(() => {
    try {
      return JSON.stringify(bookingData);
    } catch {
      // Fallback to individual values if JSON.stringify fails
      return `${bookingData.equipment_id}-${bookingData.start_date}-${bookingData.end_date}-${bookingData.total_amount}`;
    }
  }, [bookingData]);

  useEffect(() => {
    if (isInitializingRef.current || hasInitializedRef.current) {
      return;
    }

    const initializePayment = async () => {
      isInitializingRef.current = true;
      setLoading(true);
      setError(null);

      // Validate bookingData before proceeding
      const validationResult = paymentBookingDataSchema.safeParse(bookingData);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors
          .map((e) => e.message)
          .join(", ");
        setError(`Invalid booking data: ${errorMessage}`);
        setLoading(false);
        isInitializingRef.current = false;
        return;
      }

      try {
        const stripe = getStripe();
        setStripePromise(stripe);

        // Create payment intent with validated booking data
        // NO booking is created in DB at this point!
        const { clientSecret: secret, paymentIntentId: intentId } =
          await createPaymentIntent(validationResult.data);

        setClientSecret(secret);
        setPaymentIntentId(intentId);
        hasInitializedRef.current = true;
      } catch (err) {
        console.error("Error initializing payment:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize payment. Please try again."
        );
      } finally {
        setLoading(false);
        isInitializingRef.current = false;
      }
    };

    void initializePayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingDataKey]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-medium">Initializing secure payment...</p>
          <p className="text-sm text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={onCancel} className="w-full">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!clientSecret || !paymentIntentId || !stripePromise) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to initialize payment. Please try again.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={onCancel} className="w-full">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            borderRadius: "8px",
          },
        },
      }}
    >
      <PaymentCheckoutFormInner
        bookingData={bookingData}
        totalAmount={totalAmount}
        onSuccess={onSuccess}
        onCancel={onCancel}
        paymentIntentId={paymentIntentId}
      />
    </Elements>
  );
};

export default PaymentCheckoutForm;
