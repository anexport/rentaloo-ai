import { Calendar } from "@/components/ui/calendar";
import type { ComponentProps } from "react";

interface AvailabilityIndicatorCalendarProps extends ComponentProps<typeof Calendar> {
  isDateAvailable?: (date: Date) => boolean;
  loading?: boolean;
}

export const AvailabilityIndicatorCalendar = ({
  isDateAvailable,
  loading = false,
  modifiers,
  modifiersClassNames,
  disabled,
  ...props
}: AvailabilityIndicatorCalendarProps) => {
  // Helper to check if date is available
  const checkAvailability = (date: Date): boolean => {
    if (!isDateAvailable) return true;
    return isDateAvailable(date);
  };

  // Helper to check if date is disabled
  const isDateDisabled = (date: Date): boolean => {
    if (!disabled) return false;
    if (typeof disabled === "function") {
      return disabled(date);
    }
    if (Array.isArray(disabled)) {
      return disabled.some((d) => d.getTime() === date.getTime());
    }
    if (disabled instanceof Date) {
      return disabled.getTime() === date.getTime();
    }
    return false;
  };

  // Create custom modifiers for available/unavailable dates
  // Only show indicators on dates that are not disabled
  const customModifiers = {
    available: (date: Date) => {
      if (loading || isDateDisabled(date)) return false;
      return checkAvailability(date);
    },
    unavailable: (date: Date) => {
      if (loading || isDateDisabled(date)) return false;
      return !checkAvailability(date);
    },
    ...modifiers,
  };

  // Custom class names for availability indicators
  const customModifiersClassNames = {
    available: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-green-500 after:shadow-sm",
    unavailable: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-red-500 after:shadow-sm",
    ...modifiersClassNames,
  };

  return (
    <Calendar
      modifiers={customModifiers}
      modifiersClassNames={customModifiersClassNames}
      disabled={disabled}
      {...props}
    />
  );
};

