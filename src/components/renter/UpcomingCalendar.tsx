import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatDateForStorage, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isToday, isSameDay, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, differenceInDays, startOfDay, endOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { BookingRequestWithDetails } from "@/types/booking";

const UpcomingCalendar = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const today = formatDateForStorage(new Date());
        
        // Fetch approved bookings starting today or in the future
        const { data, error } = await supabase
          .from("booking_requests")
          .select(`
            *,
            equipment:equipment(
              *,
              category:categories(*),
              photos:equipment_photos(*),
              owner:profiles!equipment_owner_id_fkey(*)
            ),
            renter:profiles!booking_requests_renter_id_fkey(*)
          `)
          .eq("renter_id", user.id)
          .eq("status", "approved")
          .gte("start_date", today)
          .order("start_date", { ascending: true })
          .limit(10);

        if (error) throw error;

        setBookings((data || []) as BookingRequestWithDetails[]);
      } catch (error) {
        console.error("Error fetching upcoming bookings:", error);
        toast.error("Failed to load upcoming bookings");
      } finally {
        setLoading(false);
      }
    };

    void fetchBookings();
  }, [user]);

  // Get dates that have bookings
  const getBookingDates = () => {
    const dates = new Set<string>();
    bookings.forEach((booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      const days = eachDayOfInterval({ start, end });
      days.forEach((day) => {
        dates.add(format(day, "yyyy-MM-dd"));
      });
    });
    return dates;
  };

  const bookingDates = getBookingDates();

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    const checkDate = startOfDay(date);
    return bookings.filter((booking) => {
      const startDate = startOfDay(new Date(booking.start_date));
      const endDate = endOfDay(new Date(booking.end_date));
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  // Calendar generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Upcoming Rentals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading calendar...
          </div>
        </CardContent>
      </Card>
    );
  }

  const upcomingBookings = bookings.slice(0, 3);

  // Empty state - compact card without calendar
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">No upcoming rentals</p>
            <p className="text-xs text-muted-foreground">Approved bookings appear here</p>
          </div>
          <Link to="/explore">
            <Button variant="outline" size="sm">
              Browse
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          Upcoming Rentals
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Month Navigation */}
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            ←
          </Button>
          <span className="text-xs font-medium w-24 text-center">
            {format(currentMonth, "MMM yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            →
          </Button>
        </div>

        {/* Compact Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label="Calendar">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-medium text-muted-foreground"
              role="columnheader"
            >
              {day.charAt(0)}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const isCurrentMonth = day >= monthStart && day <= monthEnd;
            const hasBooking = bookingDates.has(dayStr);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const dayBookings = getBookingsForDate(day);
            const bookingCount = dayBookings.length;

            return (
              <button
                key={dayStr}
                onClick={() => {
                  if (hasBooking) {
                    setSelectedDate(isSelected ? null : day);
                  }
                }}
                className={cn(
                  "aspect-square text-[10px] rounded transition-colors relative",
                  !isCurrentMonth && "text-muted-foreground/30",
                  isToday(day) && "ring-1 ring-primary",
                  hasBooking && "bg-primary/15 hover:bg-primary/25 cursor-pointer font-semibold",
                  isSelected && "bg-primary/30 ring-1 ring-primary",
                  !hasBooking && isCurrentMonth && "hover:bg-muted"
                )}
                disabled={!hasBooking}
                role="gridcell"
                aria-label={`${format(day, "MMMM d, yyyy")}${hasBooking ? `, ${bookingCount} booking${bookingCount > 1 ? 's' : ''}` : ''}`}
                aria-pressed={isSelected}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        {/* Selected Date Details (when clicked) */}
        {selectedDate && getBookingsForDate(selectedDate).length > 0 && (
          <div className="pt-3 border-t">
            {getBookingsForDate(selectedDate).slice(0, 1).map((booking) => (
              booking.equipment ? (
                <Link
                  key={booking.id}
                  to={`/renter/dashboard?tab=bookings`}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{booking.equipment.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(booking.start_date), "MMM d")} - {format(new Date(booking.end_date), "MMM d")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {differenceInDays(new Date(booking.start_date), new Date()) === 0
                      ? "Today"
                      : differenceInDays(new Date(booking.start_date), new Date()) === 1
                      ? "Tomorrow"
                      : `${differenceInDays(new Date(booking.start_date), new Date())}d`}
                  </Badge>
                </Link>
              ) : null
            ))}
          </div>
        )}

        {/* Next rental (when no date selected) */}
        {!selectedDate && upcomingBookings.length > 0 && upcomingBookings[0].equipment && (
          <div className="pt-3 border-t">
            <Link
              to={`/renter/dashboard?tab=bookings`}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{upcomingBookings[0].equipment.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(upcomingBookings[0].start_date), "MMM d")} - {format(new Date(upcomingBookings[0].end_date), "MMM d")}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {differenceInDays(new Date(upcomingBookings[0].start_date), new Date()) === 0
                  ? "Today"
                  : differenceInDays(new Date(upcomingBookings[0].start_date), new Date()) === 1
                  ? "Tomorrow"
                  : `${differenceInDays(new Date(upcomingBookings[0].start_date), new Date())}d`}
              </Badge>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingCalendar;

