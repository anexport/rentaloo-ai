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

  // Get primary status for a date (highest priority booking)
  const getPrimaryStatus = (bookings: BookingRequestWithDetails[]): string => {
    if (bookings.length === 0) return "";

    // Priority: approved > pending > completed > cancelled > declined
    const priorities = {
      approved: 1,
      pending: 2,
      completed: 3,
      cancelled: 4,
      declined: 5,
    };

    return bookings.reduce((prev, current) => {
      const prevPriority = priorities[prev.status as keyof typeof priorities] || 999;
      const currentPriority = priorities[current.status as keyof typeof priorities] || 999;
      return currentPriority < prevPriority ? current : prev;
    }).status;
  };

  // Custom day renderer with booking indicators
  const DayContent = (date: Date) => {
    const bookings = getBookingsForDate(date);
    const hasBookings = bookings.length > 0;
    const primaryStatus = hasBookings ? getPrimaryStatus(bookings) : "";

    return (
      <div className="relative w-full h-full flex items-center justify-center p-2">
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            "text-sm font-medium",
            hasBookings && "text-foreground"
          )}>
            {format(date, "d")}
          </span>
          {hasBookings && (
            <div className={cn(
              "w-1 h-1 rounded-full",
              getStatusColor(primaryStatus)
            )} />
          )}
        </div>
        {bookings.length > 1 && (
          <div className="absolute top-1 right-1">
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full w-4 h-4 flex items-center justify-center">
              {bookings.length}
            </span>
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
              months: "flex flex-col w-full",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center hidden",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex w-full mb-2",
              head_cell:
                "text-muted-foreground rounded-md w-full font-semibold text-xs uppercase tracking-wide text-center py-2",
              row: "flex w-full",
              cell: cn(
                "relative p-0.5 text-center w-full aspect-square",
                "[&:has([aria-selected])]:bg-accent/50"
              ),
              day: cn(
                "h-full w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent/50 rounded-lg transition-all border border-transparent hover:border-border"
              ),
              day_selected:
                "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/30",
              day_today: "bg-accent/50 border-accent-foreground/20 font-bold",
              day_outside:
                "text-muted-foreground/40 opacity-40",
              day_disabled: "text-muted-foreground/30 opacity-30",
              day_hidden: "invisible",
            }}
            components={{
              DayContent: ({ date }) => DayContent(date),
            }}
          />

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-sm text-foreground">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="text-sm text-foreground">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-sm text-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-sm text-foreground">Declined</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                <span className="text-sm text-foreground">Cancelled</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card className="lg:col-span-1 h-fit sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {selectedDate
              ? format(selectedDate, "EEEE, MMMM d")
              : "Select a date"}
          </CardTitle>
          {selectedDate && selectedDateBookings.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedDateBookings.length} {selectedDateBookings.length === 1 ? "booking" : "bookings"}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {selectedDate && selectedDateBookings.length > 0 ? (
            <div className="space-y-2">
              {selectedDateBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-3 rounded-md border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm line-clamp-1">
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
                      className="text-[10px] px-2 py-0 shrink-0"
                    >
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground/70">Period</span>
                      <span className="font-medium text-foreground">
                        {booking.start_date && format(parseISO(booking.start_date), "MMM d")} -{" "}
                        {booking.end_date && format(parseISO(booking.end_date), "MMM d")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground/70">Amount</span>
                      <span className="font-semibold text-foreground">
                        ${booking.total_amount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedDate ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No bookings</p>
              <p className="text-xs mt-1 text-muted-foreground/70">on this date</p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a date</p>
              <p className="text-xs mt-1 text-muted-foreground/70">to view bookings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RenterBookingCalendar;
