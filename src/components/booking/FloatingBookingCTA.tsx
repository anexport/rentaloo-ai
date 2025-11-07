import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FloatingBookingCTAProps {
  /**
   * Daily rental rate to display
   */
  dailyRate: number;
  
  /**
   * Callback when user clicks the CTA button
   */
  onOpenBooking: () => void;
  
  /**
   * Whether the button should be shown (typically mobile only)
   */
  isVisible: boolean;
  
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * FloatingBookingCTA is a sticky button that appears on mobile
 * after the user scrolls past the header, providing quick access
 * to the booking sidebar/drawer.
 */
export const FloatingBookingCTA = ({
  dailyRate,
  onOpenBooking,
  isVisible,
  className,
}: FloatingBookingCTAProps) => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setShouldShow(false);
      return;
    }

    // Show button after user scrolls 400px down
    const handleScroll = () => {
      const scrolled = window.scrollY > 400;
      setShouldShow(scrolled);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isVisible]);

  if (!shouldShow) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4",
        "bg-gradient-to-t from-background via-background to-transparent pt-8",
        "animate-in slide-in-from-bottom duration-300",
        className
      )}
    >
      <Button
        onClick={onOpenBooking}
        size="lg"
        className="w-full shadow-2xl text-base font-semibold"
      >
        <Calendar className="mr-2 h-5 w-5" />
        Book Now · ${dailyRate}/day
      </Button>
    </div>
  );
};

