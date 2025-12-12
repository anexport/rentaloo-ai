import { DollarSign, Shield, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatBookingDuration } from "@/lib/booking";
import type { BookingCalculation } from "@/types/booking";
import type { InsuranceType } from "@/types/booking";

interface PricingBreakdownProps {
  calculation: BookingCalculation | null;
  startDate?: string;
  endDate?: string;
  insuranceType?: InsuranceType;
}

const PricingBreakdown = ({
  calculation,
  startDate,
  endDate,
  insuranceType,
}: PricingBreakdownProps) => {
  const hasInsurance = Boolean(
    calculation &&
      calculation.insurance > 0 &&
      insuranceType &&
      insuranceType !== "none",
  );
  const insuranceLabel =
    insuranceType === "basic"
      ? "Basic"
      : insuranceType === "premium"
        ? "Premium"
        : "Insurance";
  const displayInsuranceLabel =
    insuranceLabel === "Insurance"
      ? insuranceLabel
      : `Insurance (${insuranceLabel})`;
  const hasDeposit = calculation && calculation.deposit > 0;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <DollarSign className="h-4 w-4" aria-hidden="true" />
        Pricing Breakdown
      </h4>
      {calculation && startDate && endDate ? (
        <div aria-live="polite" aria-atomic="true">
          <span className="sr-only">
            Total price: ${calculation.total.toFixed(2)} for {calculation.days}{" "}
            {calculation.days === 1 ? "day" : "days"}
          </span>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Duration:</dt>
              <dd className="font-medium">
                {formatBookingDuration(startDate, endDate)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Daily Rate:</dt>
              <dd className="font-medium">${calculation.dailyRate.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Subtotal ({calculation.days} {calculation.days === 1 ? "day" : "days"}):
              </dt>
              <dd className="font-medium">
                ${calculation.subtotal.toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Service Fee (5%):</dt>
              <dd className="font-medium">${calculation.serviceFee.toFixed(2)}</dd>
            </div>

            {hasInsurance && (
              <div className="flex justify-between">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  {displayInsuranceLabel}:
                </dt>
                <dd className="font-medium">${calculation.insurance.toFixed(2)}</dd>
              </div>
            )}

            <Separator />

            <div className="flex justify-between font-semibold">
              <dt>Rental Total:</dt>
              <dd>${(calculation.subtotal + calculation.serviceFee + calculation.insurance).toFixed(2)}</dd>
            </div>

            {hasDeposit && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <RefreshCw className="h-3 w-3 text-green-600" />
                    Damage Deposit (Refundable):
                  </dt>
                  <dd className="font-medium text-green-600">${calculation.deposit.toFixed(2)}</dd>
                </div>
                <p className="text-xs text-muted-foreground">
                  Refunded after successful return
                </p>
              </>
            )}

            <Separator />

            <div className="flex justify-between font-semibold text-base">
              <dt>Total Due Now:</dt>
              <dd>${calculation.total.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select dates to see pricing breakdown.
        </p>
      )}
    </div>
  );
};

export default PricingBreakdown;
