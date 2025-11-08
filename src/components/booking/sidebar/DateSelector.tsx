import { Calendar as CalendarIcon, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDateRangePicker } from "@/hooks/booking/useDateRangePicker";
import { useEquipmentAvailability } from "@/hooks/booking/useEquipmentAvailability";
import { AvailabilityIndicatorCalendar } from "@/components/booking/AvailabilityIndicatorCalendar";
import type { DateRange } from "react-day-picker";
import type { BookingConflict } from "@/types/booking";
import { startOfDay } from "date-fns";

interface DateSelectorProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onStartDateSelect?: (date: Date | undefined) => void;
  onEndDateSelect?: (date: Date | undefined) => void;
  conflicts: BookingConflict[];
  loadingConflicts: boolean;
  minDate?: Date;
  equipmentId?: string;
}

const DateSelector = ({
  dateRange,
  onDateRangeChange,
  onStartDateSelect,
  onEndDateSelect,
  conflicts,
  loadingConflicts,
  minDate,
  equipmentId,
}: DateSelectorProps) => {
  const {
    startDateOpen,
    setStartDateOpen,
    endDateOpen,
    setEndDateOpen,
    handleStartDateSelect,
    handleEndDateSelect,
  } = useDateRangePicker({
    dateRange,
    onDateRangeChange,
    onStartDateSelect,
    onEndDateSelect,
  });

  // Fetch availability data
  const { isDateAvailable, loading: availabilityLoading } = useEquipmentAvailability({
    equipmentId,
    enabled: !!equipmentId,
  });

  const today = minDate || new Date();

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold flex items-center gap-2 mb-3">
        <CalendarIcon className="h-4 w-4" aria-hidden="true" />
        Select Dates
      </legend>
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal transition-colors duration-200 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Select start date"
                aria-describedby={
                  conflicts.length > 0 ? "date-conflicts" : undefined
                }
              >
                {dateRange?.from
                  ? dateRange.from.toLocaleDateString()
                  : "Select start date"}
                <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <AvailabilityIndicatorCalendar
                mode="single"
                selected={dateRange?.from}
                onSelect={handleStartDateSelect}
                disabled={(date) => startOfDay(date) < startOfDay(today)}
                isDateAvailable={isDateAvailable}
                loading={availabilityLoading}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal transition-colors duration-200 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Select end date"
                aria-describedby={
                  conflicts.length > 0 ? "date-conflicts" : undefined
                }
              >
                {dateRange?.to
                  ? dateRange.to.toLocaleDateString()
                  : "Select end date"}
                <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <AvailabilityIndicatorCalendar
                mode="single"
                selected={dateRange?.to}
                onSelect={handleEndDateSelect}
                disabled={(date) => {
                  const todayDate = startOfDay(today);
                  const startDate = dateRange?.from
                    ? startOfDay(dateRange.from)
                    : null;
                  return (
                    startOfDay(date) < todayDate ||
                    (startDate && startOfDay(date) < startDate)
                  );
                }}
                isDateAvailable={isDateAvailable}
                loading={availabilityLoading}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {conflicts.length > 0 && (
        <Alert variant="destructive" id="date-conflicts" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            <div className="space-y-1">
              {conflicts.map((conflict, index) => (
                <div key={index}>{conflict.message}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      {loadingConflicts && (
        <p className="text-xs text-muted-foreground">Checking availability...</p>
      )}
    </fieldset>
  );
};

export default DateSelector;

