import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatDateForStorage } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { format, isToday, isSameDay, addDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, differenceInDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Upcoming Rentals
        </CardTitle>
        <CardDescription>
          Your upcoming approved bookings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Calendar */}
        <div className="space-y-2">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
            >
              ←
            </Button>
            <span className="text-sm font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              →
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
                role="columnheader"
              >
                {day}
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
                    "aspect-square text-xs rounded-md transition-colors relative",
                    !isCurrentMonth && "text-muted-foreground/30",
                    isToday(day) && "ring-2 ring-primary",
                    hasBooking && "bg-primary/10 hover:bg-primary/20 cursor-pointer",
                    isSelected && "bg-primary/30 ring-2 ring-primary",
                    !hasBooking && isCurrentMonth && "hover:bg-muted"
                  )}
                  disabled={!hasBooking}
                  role="gridcell"
                  aria-label={`${format(day, "MMMM d, yyyy")}${hasBooking ? `, ${bookingCount} booking${bookingCount > 1 ? 's' : ''}` : ''}`}
                  aria-pressed={isSelected}
                >
                  <span className={cn(
                    "block",
                    isToday(day) && "font-bold",
                    hasBooking && "font-semibold"
                  )}>
                    {format(day, "d")}
                  </span>
                  {hasBooking && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Bookings */}
        {selectedDate && getBookingsForDate(selectedDate).length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-semibold">
              {format(selectedDate, "EEEE, MMMM d")}
            </p>
            {getBookingsForDate(selectedDate).map((booking) => (
              <Link
                key={booking.id}
                to={`/renter/dashboard?tab=bookings`}
                className="block p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
              >
                <p className="text-sm font-medium line-clamp-1">
                  {booking.equipment.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(booking.start_date), "MMM d")} -{" "}
                  {format(new Date(booking.end_date), "MMM d")}
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* Upcoming Rentals List */}
        {upcomingBookings.length > 0 && (
          <div className="pt-4 border-t space-y-3">
            <p className="text-sm font-semibold">Next Rentals</p>
            {upcomingBookings.map((booking) => {
              const startDate = new Date(booking.start_date);
              const daysUntil = differenceInDays(startDate, new Date());

              return (
                <Link
                  key={booking.id}
                  to={`/renter/dashboard?tab=bookings`}
                  className="block p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold line-clamp-1">
                        {booking.equipment.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(startDate, "MMM d")} -{" "}
                          {format(new Date(booking.end_date), "MMM d")}
                        </span>
                      </div>
                      {booking.equipment.location && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{booking.equipment.location}</span>
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={daysUntil <= 3 ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {daysUntil === 0
                        ? "Today"
                        : daysUntil === 1
                        ? "Tomorrow"
                        : `${daysUntil}d`}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {bookings.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming rentals</p>
          </div>
        )}

        {bookings.length > 3 && (
          <Link to="/renter/dashboard?tab=bookings">
            <Button variant="outline" className="w-full" size="sm">
              View All Bookings
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingCalendar;

