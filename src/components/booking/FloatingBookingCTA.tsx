import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useEffect, useState, RefObject, useRef } from "react";
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
  
  /**
   * Optional ref to the scrollable container element.
   * If provided, listens to this element's scroll events.
   * If not provided, falls back to window scroll.
   */
  scrollContainerRef?: RefObject<HTMLElement>;
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
  scrollContainerRef,
}: FloatingBookingCTAProps) => {
  const [shouldShow, setShouldShow] = useState(false);
  const currentListenerRef = useRef<HTMLElement | Window | null>(null);

  useEffect(() => {
    if (!isVisible) {
      setShouldShow(false);
      return;
    }

    // Show button after user scrolls 400px down
    const handleScroll = () => {
      // Always check the ref dynamically in case it's set after mount
      const container = scrollContainerRef?.current || window;
      const isWindowContainer = container === window;
      const scrollTop = isWindowContainer
        ? window.scrollY
        : (container as HTMLElement).scrollTop;
      const scrolled = scrollTop > 400;
      setShouldShow(scrolled);
    };

    // Check initial scroll position
    handleScroll();

    // Determine which element to listen to
    const container = scrollContainerRef?.current;
    const scrollTarget: HTMLElement | Window = container || window;
    
    // Add listener to the appropriate target
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    currentListenerRef.current = scrollTarget;

    // Set up a check to switch to element listener when ref becomes available
    const checkRef = setInterval(() => {
      const currentContainer = scrollContainerRef?.current;
      if (currentContainer && currentContainer !== container) {
        // Ref was just set, switch listeners
        const oldListener = currentListenerRef.current;
        if (oldListener) {
          oldListener.removeEventListener("scroll", handleScroll);
        }
        currentContainer.addEventListener("scroll", handleScroll, { passive: true });
        currentListenerRef.current = currentContainer;
        handleScroll(); // Check scroll position immediately
      }
    }, 100);

    return () => {
      const listener = currentListenerRef.current;
      if (listener) {
        listener.removeEventListener("scroll", handleScroll);
        currentListenerRef.current = null;
      }
      clearInterval(checkRef);
    };
  }, [isVisible, scrollContainerRef]);

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

