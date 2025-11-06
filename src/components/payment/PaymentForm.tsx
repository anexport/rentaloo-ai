import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe, createPaymentIntent } from "@/lib/stripe";
import { calculatePaymentSummary } from "@/lib/payment";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CreditCard, Lock, Loader2 } from "lucide-react";
import PaymentSummary from "./PaymentSummary";

interface PaymentFormProps {
  bookingRequestId: string;
  ownerId: string;
  totalAmount: number;
  onSuccess?: (paymentId: string) => void;
  onCancel?: () => void;
}

interface PaymentFormInnerProps extends PaymentFormProps {
  paymentIntentId: string;
}

const PaymentFormInner = ({
  bookingRequestId,
  ownerId,
  totalAmount,
  onSuccess,
  onCancel,
  paymentIntentId,
}: PaymentFormInnerProps) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentSummary = calculatePaymentSummary(totalAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe is not initialized. Please refresh the page.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm payment with Stripe
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

      // Payment succeeded - poll for payment record
      if (!paymentIntentId) {
        setError("Payment Intent ID not found");
        setIsProcessing(false);
        return;
      }

      // Poll for payment record (up to 10 seconds with backoff)
      const maxAttempts = 20;
      const pollInterval = 500; // 500ms

      const pollPayment = async (): Promise<string | null> => {
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));

          const { data: payment, error: fetchError } = await supabase
            .from("payments")
            .select("id")
            .eq("stripe_payment_intent_id", paymentIntentId)
            .eq("payment_status", "succeeded")
            .maybeSingle();

          if (payment) {
            return payment.id;
          }

          if (fetchError && fetchError.code !== "PGRST116") {
            // PGRST116 is "not found" which is expected during polling
            console.error("Error polling payment:", fetchError);
          }
        }
        return null;
      };

      const paymentId = await pollPayment();

      if (paymentId) {
        // Navigate to confirmation page
        void navigate(`/payment/confirmation?payment_id=${paymentId}`);
        onSuccess?.(paymentId);
      } else {
        // Payment succeeded but record not found yet
        // Still navigate but show warning
        setError(
          "Payment succeeded but confirmation is pending. Please check your payment status."
        );
        // Still navigate after a short delay
        setTimeout(() => {
          void navigate(
            `/payment/confirmation?payment_intent_id=${paymentIntentId}`
          );
        }, 2000);
      }
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Payment Information</span>
          </CardTitle>
          <CardDescription>
            Enter your card details to complete the booking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Security Notice */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start space-x-2">
              <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Your payment information is encrypted and secure. We use Stripe
                for payment processing.
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Stripe Payment Element */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <PaymentElement />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!stripe || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${paymentSummary.total.toFixed(2)}`
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <div>
        <PaymentSummary summary={paymentSummary} />

        {/* Additional Info */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p className="font-medium">Payment Protection</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Funds held in escrow until rental completion</li>
                <li>Owner receives payment after successful return</li>
                <li>Full refund if equipment not as described</li>
                <li>24/7 customer support for payment issues</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const PaymentForm = ({
  bookingRequestId,
  ownerId,
  totalAmount,
  onSuccess,
  onCancel,
}: PaymentFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<
    import("@stripe/stripe-js").Stripe | null
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize Stripe
        const stripe = getStripe();
        setStripePromise(stripe);

        // Create payment intent via Edge Function
        const { clientSecret: secret, paymentIntentId: intentId } =
          await createPaymentIntent(bookingRequestId);

        setClientSecret(secret);
        setPaymentIntentId(intentId);
      } catch (err) {
        console.error("Error initializing payment:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize payment. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    void initializePayment();
  }, [bookingRequestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Initializing payment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!clientSecret || !paymentIntentId || !stripePromise) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to initialize payment. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
        },
      }}
    >
      <PaymentFormInner
        bookingRequestId={bookingRequestId}
        ownerId={ownerId}
        totalAmount={totalAmount}
        onSuccess={onSuccess}
        onCancel={onCancel}
        paymentIntentId={paymentIntentId}
      />
    </Elements>
  );
};

export default PaymentForm;
