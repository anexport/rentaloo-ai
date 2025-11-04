import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { usePayment } from "@/hooks/usePayment";
import { calculatePaymentSummary } from "../../lib/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CreditCard, Lock } from "lucide-react";
import PaymentSummary from "./PaymentSummary";

const paymentFormSchema = z.object({
  card_number: z
    .string()
    .min(13, "Invalid card number")
    .max(19, "Invalid card number"),
  card_holder: z.string().min(2, "Cardholder name is required"),
  expiry_month: z.string().regex(/^(0[1-9]|1[0-2])$/, "Invalid month"),
  expiry_year: z.string().regex(/^\d{4}$/, "Invalid year"),
  cvv: z.string().regex(/^\d{3,4}$/, "Invalid CVV"),
  save_card: z.boolean().default(false),
});

interface PaymentFormProps {
  bookingRequestId: string;
  ownerId: string;
  totalAmount: number;
  onSuccess?: (paymentId: string) => void;
  onCancel?: () => void;
}

const PaymentForm = ({
  bookingRequestId,
  ownerId,
  totalAmount,
  onSuccess,
  onCancel,
}: PaymentFormProps) => {
  const navigate = useNavigate();
  const { createPayment, loading: paymentLoading } = usePayment();
  const [error, setError] = useState<string | null>(null);

  const paymentSummary = calculatePaymentSummary(totalAmount);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      save_card: false,
    },
  });

  const onSubmit = async (formData: z.infer<typeof paymentFormSchema>) => {
    setError(null);
    void formData;

    try {
      // In a production environment, this would:
      // 1. Create a payment intent via your backend API
      // 2. Use Stripe.js to securely collect and tokenize card details
      // 3. Confirm the payment with Stripe
      // 4. Update the booking and payment records in Supabase

      // For MVP, we'll simulate the payment process using our usePayment hook
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create mock payment method ID (in production, this comes from Stripe)
      const paymentMethodId = `pm_mock_${Date.now()}`;

      // Create payment using the usePayment hook
      const payment = await createPayment({
        bookingRequestId,
        ownerId,
        totalAmount: paymentSummary.total,
        paymentMethodId,
      });

      if (payment) {
        // Navigate to payment confirmation page
        navigate(`/payment/confirmation?payment_id=${payment.id}`);
        onSuccess?.(payment.id);
      } else {
        throw new Error("Payment creation failed");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Payment failed. Please try again or use a different payment method."
      );
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-2">
              <Lock className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700">
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

            {/* Card Number */}
            <div className="space-y-2">
              <Label htmlFor="card_number">Card Number</Label>
              <Input
                id="card_number"
                type="text"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                {...register("card_number")}
              />
              {errors.card_number && (
                <p className="text-sm text-red-600">
                  {errors.card_number.message}
                </p>
              )}
            </div>

            {/* Cardholder Name */}
            <div className="space-y-2">
              <Label htmlFor="card_holder">Cardholder Name</Label>
              <Input
                id="card_holder"
                type="text"
                placeholder="John Doe"
                {...register("card_holder")}
              />
              {errors.card_holder && (
                <p className="text-sm text-red-600">
                  {errors.card_holder.message}
                </p>
              )}
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expiry_month">Month</Label>
                <Input
                  id="expiry_month"
                  type="text"
                  placeholder="MM"
                  maxLength={2}
                  {...register("expiry_month")}
                />
                {errors.expiry_month && (
                  <p className="text-xs text-red-600">
                    {errors.expiry_month.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_year">Year</Label>
                <Input
                  id="expiry_year"
                  type="text"
                  placeholder="YYYY"
                  maxLength={4}
                  {...register("expiry_year")}
                />
                {errors.expiry_year && (
                  <p className="text-xs text-red-600">
                    {errors.expiry_year.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="text"
                  placeholder="123"
                  maxLength={4}
                  {...register("cvv")}
                />
                {errors.cvv && (
                  <p className="text-xs text-red-600">{errors.cvv.message}</p>
                )}
              </div>
            </div>

            {/* Save Card Option */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="save_card"
                className="rounded border-gray-300"
                {...register("save_card")}
              />
              <Label htmlFor="save_card" className="text-sm font-normal">
                Save card for future bookings
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={paymentLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={paymentLoading}
              >
                {paymentLoading
                  ? "Processing..."
                  : `Pay ${paymentSummary.total.toFixed(2)}`}
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
            <div className="text-sm text-gray-600 space-y-2">
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

export default PaymentForm;
