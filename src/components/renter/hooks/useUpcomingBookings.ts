import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatDateForStorage } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type BookingRequest = Database["public"]["Tables"]["booking_requests"]["Row"];

interface UpcomingBookingsResult {
  count: number;
  nextDate: BookingRequest["start_date"] | null;
}

export const useUpcomingBookings = (userId?: string): UseQueryResult<UpcomingBookingsResult> => {
  return useQuery({
    queryKey: ["upcoming-bookings", userId],
    queryFn: async () => {
      if (!userId) return { count: 0, nextDate: null };

      const today = formatDateForStorage(new Date());

      // Fetch first booking to get the next rental date
      const { data: firstBooking, error: firstError } = await supabase
        .from("booking_requests")
        .select("start_date")
        .eq("renter_id", userId)
        .eq("status", "approved")
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(1);

      if (firstError) throw firstError;

      // Fetch count of all upcoming bookings
      const { count, error: countError } = await supabase
        .from("booking_requests")
        .select("*", { count: "exact", head: true })
        .eq("renter_id", userId)
        .eq("status", "approved")
        .gte("start_date", today);

      if (countError) throw countError;

      return {
        count: count || 0,
        nextDate: firstBooking && firstBooking.length > 0 ? firstBooking[0].start_date : null,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
