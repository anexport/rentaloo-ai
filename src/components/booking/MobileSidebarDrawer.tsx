import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import BookingSidebar from "./BookingSidebar";
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
  isCreatingBooking: boolean;
  user: User | null;
  equipmentId?: string;
}

/**
 * MobileSidebarDrawer wraps BookingSidebar in a Sheet component
 * for mobile devices, providing a drawer interface for booking.
 */
export const MobileSidebarDrawer = ({
  open,
  onOpenChange,
  ...sidebarProps
}: MobileSidebarDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[min(85dvh,calc(100dvh-4rem))] rounded-t-2xl overflow-y-auto"
      >
        {/* Swipe indicator */}
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        
        <SheetHeader className="text-left mb-6">
          <SheetTitle>Book This Equipment</SheetTitle>
          <SheetDescription>
            Select your dates and confirm your booking
          </SheetDescription>
        </SheetHeader>
        
        {/* Render BookingSidebar inside drawer */}
        <div className="pb-6">
          <BookingSidebar {...sidebarProps} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

