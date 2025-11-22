import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, DollarSign, X, Check, Ban } from "lucide-react";
import type { Database } from "../lib/database.types";
import { formatDateForStorage } from "@/lib/utils";

interface AvailabilityCalendarProps {
  equipmentId: string;
  defaultDailyRate: number;
  viewOnly?: boolean;
}

type AvailabilityRecord =
  Database["public"]["Tables"]["availability_calendar"]["Row"];

const AvailabilityCalendar = ({
  equipmentId,
  defaultDailyRate,
  viewOnly = false,
}: AvailabilityCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilityRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAvailability = useCallback(async () => {
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );

    const { data, error } = await supabase
      .from("availability_calendar")
      .select("*")
      .eq("equipment_id", equipmentId)
      .gte("date", formatDateForStorage(startOfMonth))
      .lte("date", formatDateForStorage(endOfMonth));

    if (error) {
      console.error("Error fetching availability:", error);
      return;
    }

    setAvailability(data || []);
  }, [equipmentId, currentMonth]);

  useEffect(() => {
    void fetchAvailability();
  }, [fetchAvailability]);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getAvailabilityForDate = (date: Date) => {
    const dateStr = formatDateForStorage(date);
    return availability.find((a) => a.date === dateStr);
  };

  const handleDateClick = (date: Date) => {
    if (viewOnly) return;
    setSelectedDate(date);
    const existing = getAvailabilityForDate(date);
    if (existing) {
      setCustomPrice(existing.custom_rate?.toString() || "");
      setIsBlocked(existing.is_available === false);
    } else {
      setCustomPrice("");
      setIsBlocked(false);
    }
  };

  const handleSaveAvailability = async () => {
    if (!selectedDate) return;

    setLoading(true);
    const dateStr = formatDateForStorage(selectedDate);
    const existing = getAvailabilityForDate(selectedDate);

    try {
      const availabilityData = {
        equipment_id: equipmentId,
        date: dateStr,
        is_available: !isBlocked,
        custom_rate: customPrice ? parseFloat(customPrice) : null,
      };

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("availability_calendar")
          .update(availabilityData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("availability_calendar")
          .insert(availabilityData);

        if (error) throw error;
      }

      await fetchAvailability();
      setSelectedDate(null);
      setCustomPrice("");
      setIsBlocked(false);
    } catch (error) {
      console.error("Error saving availability:", error);
      alert("Failed to save availability. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvailability = async () => {
    if (!selectedDate) return;

    const existing = getAvailabilityForDate(selectedDate);
    if (!existing) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("availability_calendar")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;

      await fetchAvailability();
      setSelectedDate(null);
      setCustomPrice("");
      setIsBlocked(false);
    } catch (error) {
      console.error("Error deleting availability:", error);
      alert("Failed to delete availability. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const renderCalendar = () => {
    const days = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Weekday headers
    const headers = weekdays.map((day) => (
      <div
        key={day}
        className="text-center text-xs font-semibold text-muted-foreground py-2"
      >
        {day}
      </div>
    ));

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      const dateAvailability = getAvailabilityForDate(date);
      const isPast = date < today;
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      let bgColor = "bg-background hover:bg-muted";
      let textColor = "text-foreground";
      let border = "border border-border";

      if (isPast) {
        bgColor = "bg-muted/50";
        textColor = "text-muted-foreground";
      } else if (dateAvailability?.is_available === false) {
        bgColor = "bg-red-100 dark:bg-red-950";
        textColor = "text-red-700 dark:text-red-300";
        border = "border border-red-300 dark:border-red-700";
      } else if (dateAvailability?.custom_rate) {
        bgColor = "bg-blue-100 dark:bg-blue-950";
        textColor = "text-blue-700 dark:text-blue-300";
        border = "border border-blue-300 dark:border-blue-700";
      }

      if (isSelected) {
        border = "border-2 border-primary";
      }

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(date)}
          disabled={isPast || viewOnly}
          className={`p-2 rounded-lg text-sm transition-colors ${bgColor} ${textColor} ${border} ${
            isPast || viewOnly ? "cursor-default" : "cursor-pointer"
          } relative group`}
        >
          <div className="font-medium">{day}</div>
          {dateAvailability && (
            <div className="text-xs mt-1">
              {dateAvailability.is_available === false ? (
                <Ban className="h-3 w-3 mx-auto" />
              ) : dateAvailability.custom_rate ? (
                <span className="font-bold">
                  ${dateAvailability.custom_rate}
                </span>
              ) : null}
            </div>
          )}
          {!isPast && !viewOnly && (
            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity" />
          )}
        </button>
      );
    }

    return (
      <>
        {headers}
        {days}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>
              {viewOnly ? "Availability" : "Manage Availability Calendar"}
            </span>
          </CardTitle>
          <CardDescription>
            {viewOnly
              ? "View when this equipment is available"
              : "Set custom pricing or block dates when your equipment is unavailable"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              ← Previous
            </Button>
            <h3 className="text-lg font-semibold">
              {currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              Next →
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">{renderCalendar()}</div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-background border border-border rounded" />
              <span>Available (${defaultDailyRate}/day)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded" />
              <span>Custom Price</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-700 rounded" />
              <span>Blocked</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Panel */}
      {selectedDate && !viewOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Edit{" "}
              {selectedDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="blocked"
                checked={isBlocked}
                onChange={(e) => setIsBlocked(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <Label htmlFor="blocked" className="cursor-pointer">
                Block this date (mark as unavailable)
              </Label>
            </div>

            {!isBlocked && (
              <div className="space-y-2">
                <Label htmlFor="customPrice">
                  Custom Price (leave empty for default: ${defaultDailyRate}
                  /day)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="customPrice"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder={defaultDailyRate.toString()}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setSelectedDate(null)}
                disabled={loading}
              >
                Cancel
              </Button>
              <div className="flex space-x-2">
                {getAvailabilityForDate(selectedDate) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      void handleDeleteAvailability();
                    }}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
                <Button
                  onClick={() => {
                    void handleSaveAvailability();
                  }}
                  disabled={loading}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {loading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
