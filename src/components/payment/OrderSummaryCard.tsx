import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Shield,
  CheckCircle2,
  Clock,
  ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/payment";
import type { Listing } from "@/components/equipment/services/listings";
import type { BookingCalculation, InsuranceType } from "@/types/booking";

type OrderSummaryCardProps = {
  listing: Listing;
  calculation: BookingCalculation;
  startDate: string;
  endDate: string;
  insuranceType?: InsuranceType;
};

const OrderSummaryCard = ({
  listing,
  calculation,
  startDate,
  endDate,
  insuranceType = "none",
}: OrderSummaryCardProps) => {
  const primaryPhoto = listing.photos?.find((p) => p.is_primary) || listing.photos?.[0];
  const hasInsurance = calculation.insurance > 0;
  const hasDeposit = calculation.deposit > 0;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "EEE, MMM d");
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Equipment Preview */}
      <div className="relative">
        {primaryPhoto?.photo_url ? (
          <img
            src={primaryPhoto.photo_url}
            alt={listing.title}
            className="w-full h-40 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-40 bg-muted flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-semibold text-lg line-clamp-1 drop-shadow-md">
            {listing.title}
          </h3>
          {listing.category?.name && (
            <Badge variant="secondary" className="mt-1 text-xs bg-white/90">
              {listing.category.name}
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Rental Period
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dates */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Start</p>
            <p className="font-medium">{formatDate(startDate)}</p>
          </div>
          <div className="flex-shrink-0 px-3">
            <div className="w-8 h-px bg-border" />
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">End</p>
            <p className="font-medium">{formatDate(endDate)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{calculation.days} day{calculation.days !== 1 ? "s" : ""} rental</span>
        </div>

        <Separator />

        {/* Pricing Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {formatCurrency(listing.daily_rate)} × {calculation.days} day{calculation.days !== 1 ? "s" : ""}
            </span>
            <span>{formatCurrency(calculation.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Service fee</span>
            <span>{formatCurrency(calculation.serviceFee)}</span>
          </div>

          {hasInsurance && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {insuranceType === "basic" ? "Basic" : "Premium"} Protection
              </span>
              <span>{formatCurrency(calculation.insurance)}</span>
            </div>
          )}

          {hasDeposit && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span className="flex items-center gap-1">
                Refundable deposit
              </span>
              <span>{formatCurrency(calculation.deposit)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(calculation.total)}
          </span>
        </div>

        {/* Trust Indicators */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Secure escrow protection until rental completion
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Full refund if equipment not as described
            </span>
          </div>
          {hasDeposit && (
            <div className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                Deposit refunded after successful return
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderSummaryCard;

