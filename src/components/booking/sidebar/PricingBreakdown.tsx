import { DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatBookingDuration } from "@/lib/booking";
import type { BookingCalculation } from "@/types/booking";

interface PricingBreakdownProps {
  calculation: BookingCalculation | null;
  startDate?: string;
  endDate?: string;
}

const PricingBreakdown = ({
  calculation,
  startDate,
  endDate,
}: PricingBreakdownProps) => {
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
              <dd className="font-medium">${calculation.daily_rate}</dd>
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
              <dd className="font-medium">${calculation.fees.toFixed(2)}</dd>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <dt>Total:</dt>
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

