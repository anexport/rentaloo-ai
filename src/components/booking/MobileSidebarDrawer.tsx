import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import BookingSidebar from "./BookingSidebar";
import PaymentCheckoutForm from "@/components/payment/PaymentCheckoutForm";
import OrderSummaryCard from "@/components/payment/OrderSummaryCard";
import type { PaymentBookingData } from "@/lib/stripe";
import type { Listing } from "@/components/equipment/services/listings";
import type { BookingCalculation, BookingConflict, InsuranceType } from "@/types/booking";
import type { DateRange } from "react-day-picker";
import type { User } from "@supabase/supabase-js";

interface MobileSidebarDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  isLoading: boolean;
  user: User | null;
  equipmentId?: string;
  /** Whether to show payment mode */
  showPaymentMode?: boolean;
  /** Booking data for payment (NO booking exists in DB yet) */
  bookingData?: PaymentBookingData | null;
  /** Called when payment succeeds */
  onPaymentSuccess?: () => void;
  /** Called when user cancels payment */
  onPaymentCancel?: () => void;
}

/**
 * MobileSidebarDrawer wraps BookingSidebar in a Sheet component
 * for mobile devices, providing a drawer interface for booking.
 */
export const MobileSidebarDrawer = ({
  open,
  onOpenChange,
  showPaymentMode,
  bookingData,
  onPaymentSuccess,
  onPaymentCancel,
  ...sidebarProps
}: MobileSidebarDrawerProps) => {
  const isPaymentMode = showPaymentMode && bookingData && sidebarProps.calculation;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85dvh] max-h-[85dvh] rounded-t-2xl flex flex-col p-0"
      >
        {/* Swipe indicator */}
        <div className="flex-shrink-0 pt-3 pb-2">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto" />
        </div>
        
        <SheetHeader className="flex-shrink-0 text-left px-6 pb-4">
          <SheetTitle>
            {isPaymentMode ? "Complete Payment" : "Book This Equipment"}
          </SheetTitle>
          <SheetDescription>
            {isPaymentMode
              ? "Enter your payment details to confirm your booking"
              : "Select your dates and confirm your booking"}
          </SheetDescription>
        </SheetHeader>
        
        {/* Scrollable content area */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {isPaymentMode && bookingData && sidebarProps.calculation ? (
            <div className="space-y-6">
              {/* Order Summary - Compact for mobile */}
              <OrderSummaryCard
                listing={sidebarProps.listing}
                calculation={sidebarProps.calculation}
                startDate={sidebarProps.watchedStartDate}
                endDate={sidebarProps.watchedEndDate}
                insuranceType={sidebarProps.selectedInsurance}
              />
              
              {/* Payment Form */}
              <PaymentCheckoutForm
                bookingData={bookingData}
                totalAmount={sidebarProps.calculation.total}
                onSuccess={onPaymentSuccess}
                onCancel={onPaymentCancel}
              />
            </div>
          ) : (
            <BookingSidebar {...sidebarProps} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
