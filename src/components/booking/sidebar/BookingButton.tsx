import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface BookingButtonProps {
  user: User | null;
  isOwner: boolean;
  hasValidDates: boolean;
  hasConflicts: boolean;
  isLoading: boolean;
  hasCalculation: boolean;
  onBook: () => void;
}

const getButtonText = ({
  user,
  isOwner,
  hasValidDates,
  hasConflicts,
  isLoading,
}: Omit<BookingButtonProps, "hasCalculation" | "onBook">): string => {
  if (!user) return "Login to Book";
  if (isOwner) return "Your Equipment";
  if (!hasValidDates) return "Select Dates to Book";
  if (hasConflicts) return "Dates Unavailable";
  if (isLoading) return "Processing...";
  return "Book & Pay Now";
};

const BookingButton = ({
  user,
  isOwner,
  hasValidDates,
  hasConflicts,
  isLoading,
  hasCalculation,
  onBook,
}: BookingButtonProps) => {
  const buttonText = getButtonText({
    user,
    isOwner,
    hasValidDates,
    hasConflicts,
    isLoading,
  });

  return (
    <Button
      className="w-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      size="lg"
      aria-label="Book & Pay for this equipment"
      aria-busy={isLoading}
      disabled={
        !hasValidDates ||
        hasConflicts ||
        isLoading ||
        !hasCalculation ||
        isOwner
      }
      onClick={onBook}
    >
      {isLoading && (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {!isLoading && buttonText === "Book & Pay Now" && (
        <CreditCard className="h-4 w-4" aria-hidden="true" />
      )}
      {buttonText}
    </Button>
  );
};

export default BookingButton;

