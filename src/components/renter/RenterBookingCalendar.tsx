import { useState, useMemo } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingRequestWithDetails } from "@/types/booking";
import { format, parseISO, eachDayOfInterval } from "date-fns";

interface RenterBookingCalendarProps {
  bookingRequests: BookingRequestWithDetails[];
  onDateSelect?: (date: Date) => void;
}

const RenterBookingCalendar = ({
  bookingRequests,
  onDateSelect,
}: RenterBookingCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Create a map of dates to bookings for efficient lookup
  const bookingsByDate = useMemo(() => {
    const dateMap = new Map<string, BookingRequestWithDetails[]>();

    bookingRequests.forEach((booking) => {
      if (!booking.start_date || !booking.end_date) return;

      try {
        const startDate = parseISO(booking.start_date);
        const endDate = parseISO(booking.end_date);

        // Get all dates in the booking range
        const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });

        datesInRange.forEach((date) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const existing = dateMap.get(dateKey) || [];
          existing.push(booking);
          dateMap.set(dateKey, existing);
        });
      } catch (error) {
        console.error("Error parsing booking dates:", error);
      }
    });

    return dateMap;
  }, [bookingRequests]);

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date): BookingRequestWithDetails[] => {
    const dateKey = format(date, "yyyy-MM-dd");
    return bookingsByDate.get(dateKey) || [];
  };

  // Get status color for a booking
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "declined":
        return "bg-red-500";
      case "cancelled":
        return "bg-gray-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "approved":
        return "Approved";
      case "pending":
        return "Pending";
      case "declined":
        return "Declined";
      case "cancelled":
        return "Cancelled";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  // Custom day renderer with booking indicators
  const DayContent = (date: Date) => {
    const bookings = getBookingsForDate(date);
    const hasBookings = bookings.length > 0;

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <span className={cn("text-sm", hasBookings && "font-semibold")}>
          {format(date, "d")}
        </span>
        {hasBookings && (
          <div className="flex gap-0.5 mt-1">
            {bookings.slice(0, 3).map((booking, idx) => (
              <div
                key={`${booking.id}-${idx}`}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  getStatusColor(booking.status)
                )}
                title={`${booking.equipment.title} - ${getStatusLabel(booking.status)}`}
              />
            ))}
            {bookings.length > 3 && (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" title={`+${bookings.length - 3} more`} />
            )}
          </div>
        )}
      </div>
    );
  };

  const handleDateClick = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect?.(date);
    }
  };

  const selectedDateBookings = selectedDate
    ? getBookingsForDate(selectedDate)
    : [];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar View */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Booking Calendar</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCurrentMonth(newMonth);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setCurrentMonth(newMonth);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateClick}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            showOutsideDays={false}
            className="w-full"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center hidden",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex w-full",
              head_cell:
                "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: cn(
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full h-16",
                "[&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50"
              ),
              day: cn(
                "h-full w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              ),
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground font-semibold",
              day_outside:
                "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle:
                "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
            components={{
              DayContent: ({ date }) => DayContent(date),
            }}
          />

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Status Legend:
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Declined</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-xs text-muted-foreground">Cancelled</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate
              ? format(selectedDate, "MMMM d, yyyy")
              : "Select a date"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate && selectedDateBookings.length > 0 ? (
            <div className="space-y-3">
              {selectedDateBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">
                      {booking.equipment.title}
                    </h4>
                    <Badge
                      variant={
                        booking.status === "approved"
                          ? "default"
                          : booking.status === "pending"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium">Dates:</span>{" "}
                      {booking.start_date && format(parseISO(booking.start_date), "MMM d")} -{" "}
                      {booking.end_date && format(parseISO(booking.end_date), "MMM d")}
                    </p>
                    <p>
                      <span className="font-medium">Total:</span> $
                      {booking.total_amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedDate ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No bookings on this date</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Click on a date to see bookings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RenterBookingCalendar;
