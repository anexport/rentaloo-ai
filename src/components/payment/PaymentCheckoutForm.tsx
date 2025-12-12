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
    viewBox="0 0 512 214"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Stripe"
  >
    <path
      fill="currentColor"
      d="M512 110.08c0-36.409-17.636-65.138-51.342-65.138c-33.85 0-54.33 28.73-54.33 64.854c0 42.808 24.179 64.426 58.88 64.426c16.925 0 29.725-3.84 39.396-9.244v-28.445c-9.67 4.836-20.764 7.823-34.844 7.823c-13.796 0-26.027-4.836-27.591-21.618h69.547c0-1.85.284-9.245.284-12.658m-70.258-13.511c0-16.071 9.814-22.756 18.774-22.756c8.675 0 17.92 6.685 17.92 22.756zm-90.31-51.627c-13.939 0-22.899 6.542-27.876 11.094l-1.85-8.818h-31.288v165.83l35.555-7.537l.143-40.249c5.12 3.698 12.657 8.96 25.173 8.96c25.458 0 48.64-20.48 48.64-65.564c-.142-41.245-23.609-63.716-48.498-63.716m-8.534 97.991c-8.391 0-13.37-2.986-16.782-6.684l-.143-52.765c3.698-4.124 8.818-6.968 16.925-6.968c12.942 0 21.902 14.506 21.902 33.137c0 19.058-8.818 33.28-21.902 33.28M241.493 36.551l35.698-7.68V0l-35.698 7.538zm0 10.809h35.698v124.444h-35.698zm-38.257 10.524L200.96 47.36h-30.72v124.444h35.556V87.467c8.39-10.951 22.613-8.96 27.022-7.396V47.36c-4.551-1.707-21.191-4.836-29.582 10.524m-71.112-41.386l-34.702 7.395l-.142 113.92c0 21.05 15.787 36.551 36.836 36.551c11.662 0 20.195-2.133 24.888-4.693V140.8c-4.55 1.849-27.022 8.391-27.022-12.658V77.653h27.022V47.36h-27.022zM35.982 83.484c0-5.546 4.551-7.68 12.09-7.68c10.808 0 24.461 3.272 35.27 9.103V51.484c-11.804-4.693-23.466-6.542-35.27-6.542C19.2 44.942 0 60.018 0 85.192c0 39.252 54.044 32.995 54.044 49.92c0 6.541-5.688 8.675-13.653 8.675c-11.804 0-26.88-4.836-38.827-11.378v33.849c13.227 5.689 26.596 8.106 38.827 8.106c29.582 0 49.92-14.648 49.92-40.106c-.142-42.382-54.329-34.845-54.329-50.774"
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
