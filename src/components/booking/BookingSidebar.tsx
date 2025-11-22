import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import PricingHeader from "./sidebar/PricingHeader";
import LocationContact from "./sidebar/LocationContact";
import DateSelector from "./sidebar/DateSelector";
import PricingBreakdown from "./sidebar/PricingBreakdown";
import InsuranceSelector from "./sidebar/InsuranceSelector";
import BookingButton from "./sidebar/BookingButton";
import type { Listing } from "@/components/equipment/services/listings";
import type { BookingCalculation, BookingConflict, InsuranceType } from "@/types/booking";
import type { DateRange } from "react-day-picker";
import type { User } from "@supabase/supabase-js";

interface BookingSidebarProps {
  listing: Listing;
  avgRating: number;
  reviewCount: number;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onStartDateSelect?: (date: Date | undefined) => void;
  onEndDateSelect?: (date: Date | undefined) => void;
  conflicts: BookingConflict[];
  loadingConflicts: boolean;
  calculation: BookingCalculation | null;
  watchedStartDate: string;
  watchedEndDate: string;
  selectedInsurance: InsuranceType;
  onInsuranceChange: (type: InsuranceType) => void;
  onBooking: () => void;
  isCreatingBooking: boolean;
  user: User | null;
  equipmentId?: string;
}

const BookingSidebar = ({
  listing,
  avgRating,
  reviewCount,
  dateRange,
  onDateRangeChange,
  onStartDateSelect,
  onEndDateSelect,
  conflicts,
  loadingConflicts,
  calculation,
  watchedStartDate,
  watchedEndDate,
  selectedInsurance,
  onInsuranceChange,
  onBooking,
  isCreatingBooking,
  user,
  equipmentId,
}: BookingSidebarProps) => {
  const isOwner = listing.owner?.id === user?.id;
  const hasValidDates = !!dateRange?.from && !!dateRange?.to;
  const hasConflicts = conflicts.length > 0;

  return (
    <aside
      className="order-first lg:order-last lg:sticky lg:top-6 lg:max-h-[calc(100vh-4rem)] h-fit"
      aria-label="Booking information"
    >
      <Card className="p-6 space-y-6">
        <>
            <section aria-labelledby="pricing-section">
              <h3 id="pricing-section" className="sr-only">
                Pricing
              </h3>
              <PricingHeader
                dailyRate={listing.daily_rate}
                avgRating={avgRating}
                reviewCount={reviewCount}
              />
            </section>

            <Separator />

            <section aria-labelledby="location-section">
              <h3 id="location-section" className="sr-only">
                Location and Contact
              </h3>
              <LocationContact location={listing.location} />
            </section>

            <Separator />

            <section aria-labelledby="dates-section">
              <h3 id="dates-section" className="sr-only">
                Dates
              </h3>
              <DateSelector
                dateRange={dateRange}
                onDateRangeChange={onDateRangeChange}
                onStartDateSelect={onStartDateSelect}
                onEndDateSelect={onEndDateSelect}
                conflicts={conflicts}
                loadingConflicts={loadingConflicts}
                equipmentId={equipmentId}
              />
            </section>

            <Separator />

            <section aria-labelledby="pricing-breakdown-section">
              <h3 id="pricing-breakdown-section" className="sr-only">
                Pricing Breakdown
              </h3>
              <PricingBreakdown
                calculation={calculation}
                startDate={watchedStartDate}
                endDate={watchedEndDate}
                insuranceType={selectedInsurance}
              />
            </section>

            {hasValidDates && calculation && (
              <>
                <Separator />

                <section aria-labelledby="insurance-section">
                  <h3 id="insurance-section" className="sr-only">
                    Insurance Options
                  </h3>
                  <InsuranceSelector
                    selectedInsurance={selectedInsurance}
                    onInsuranceChange={onInsuranceChange}
                    rentalSubtotal={calculation.subtotal}
                  />
                </section>
              </>
            )}

            <BookingButton
              user={user}
              isOwner={isOwner}
              hasValidDates={hasValidDates}
              hasConflicts={hasConflicts}
              isLoading={isCreatingBooking || loadingConflicts}
              hasCalculation={!!calculation}
              onBook={onBooking}
            />
        </>
      </Card>
    </aside>
  );
};

export default BookingSidebar;

