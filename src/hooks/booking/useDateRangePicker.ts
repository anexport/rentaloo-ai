import { useState, useCallback } from "react";
import type { DateRange } from "react-day-picker";

interface UseDateRangePickerProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onStartDateSelect?: (date: Date | undefined) => void;
  onEndDateSelect?: (date: Date | undefined) => void;
}

export const useDateRangePicker = ({
  dateRange,
  onDateRangeChange,
  onStartDateSelect,
  onEndDateSelect,
}: UseDateRangePickerProps) => {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const handleStartDateSelect = useCallback(
    (date: Date | undefined) => {
      if (onStartDateSelect) {
        onStartDateSelect(date);
      } else {
        if (!date) {
          onDateRangeChange(undefined);
          setStartDateOpen(false);
          return;
        }

        const newRange: DateRange = {
          from: date,
          to: dateRange?.to,
        };
        onDateRangeChange(newRange);
        setStartDateOpen(false);
      }
    },
    [dateRange, onDateRangeChange, onStartDateSelect]
  );

  const handleEndDateSelect = useCallback(
    (date: Date | undefined) => {
      if (onEndDateSelect) {
        onEndDateSelect(date);
      } else {
        if (!date) {
          if (dateRange?.from) {
            onDateRangeChange({ from: dateRange.from, to: undefined });
          } else {
            onDateRangeChange(undefined);
          }
          setEndDateOpen(false);
          return;
        }

        if (!dateRange?.from) {
          onDateRangeChange({ from: date, to: undefined });
          setEndDateOpen(false);
          return;
        }

        const newRange: DateRange = {
          from: dateRange.from,
          to: date,
        };
        onDateRangeChange(newRange);
        setEndDateOpen(false);
      }
    },
    [dateRange, onDateRangeChange, onEndDateSelect]
  );

  return {
    startDateOpen,
    setStartDateOpen,
    endDateOpen,
    setEndDateOpen,
    handleStartDateSelect,
    handleEndDateSelect,
  };
};

