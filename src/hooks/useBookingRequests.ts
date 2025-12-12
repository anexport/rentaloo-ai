import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type {
  BookingRequestWithDetails,
  BookingStatus,
} from "../types/booking";
import type { Database } from "@/lib/database.types";

type BookingRequestRow =
  Database["public"]["Tables"]["booking_requests"]["Row"];
type EquipmentRow = Database["public"]["Tables"]["equipment"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type BookingRequestWithRelations = BookingRequestRow & {
  equipment: EquipmentRow & {
    category: CategoryRow;
    owner: ProfileRow;
  };
  renter: ProfileRow;
};

export const useBookingRequests = (userRole?: "renter" | "owner") => {
  const { user } = useAuth();
  const [bookingRequests, setBookingRequests] = useState<
    BookingRequestWithDetails[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookingRequests = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // For owners, first get their equipment IDs
      if (userRole === "owner") {
        // Get all equipment owned by this user
        const { data: equipmentData, error: equipmentError } = await supabase
          .from("equipment")
          .select("id")
          .eq("owner_id", user.id);

        if (equipmentError) throw equipmentError;

        const equipmentIds = (equipmentData || []).map((eq) => eq.id);

        // If no equipment, return empty array
        if (equipmentIds.length === 0) {
          setBookingRequests([]);
          setLoading(false);
          return;
        }

        // Get booking requests for those equipment
        const { data, error: fetchError } = await supabase
          .from("booking_requests")
          .select(
            `
            *,
            equipment:equipment(
              *,
              category:categories(*),
              photos:equipment_photos(*),
              owner:profiles!equipment_owner_id_fkey(*)
            ),
            renter:profiles!booking_requests_renter_id_fkey(*)
          `
          )
          .in("equipment_id", equipmentIds)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Transform the data to flatten the owner from equipment
        const transformedData: BookingRequestWithDetails[] = (data || []).map(
          (item: BookingRequestWithRelations) => ({
            ...item,
            owner: item.equipment?.owner || null,
          })
        );

        setBookingRequests(transformedData);
      } else if (userRole === "renter") {
        // For renters, filter by renter_id
        const { data, error: fetchError } = await supabase
          .from("booking_requests")
          .select(
            `
            *,
            equipment:equipment(
              *,
              category:categories(*),
              photos:equipment_photos(*),
              owner:profiles!equipment_owner_id_fkey(*)
            ),
            renter:profiles!booking_requests_renter_id_fkey(*)
          `
          )
          .eq("renter_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Transform the data to flatten the owner from equipment
        const transformedData: BookingRequestWithDetails[] = (data || []).map(
          (item: BookingRequestWithRelations) => ({
            ...item,
            owner: item.equipment?.owner || null,
          })
        );

        setBookingRequests(transformedData);
      } else {
        // No filter - get all (shouldn't happen normally)
        const { data, error: fetchError } = await supabase
          .from("booking_requests")
          .select(
            `
            *,
            equipment:equipment(
              *,
              category:categories(*),
              photos:equipment_photos(*),
              owner:profiles!equipment_owner_id_fkey(*)
            ),
            renter:profiles!booking_requests_renter_id_fkey(*)
          `
          )
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Transform the data to flatten the owner from equipment
        const transformedData: BookingRequestWithDetails[] = (data || []).map(
          (item: BookingRequestWithRelations) => ({
            ...item,
            owner: item.equipment?.owner || null,
          })
        );

        setBookingRequests(transformedData);
      }
    } catch (err) {
      console.error("Error fetching booking requests:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch booking requests"
      );
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  const updateBookingStatus = async (
    bookingId: string,
    status: BookingStatus
  ) => {
    try {
      const { error } = await supabase
        .from("booking_requests")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (error) throw error;

      // Refresh the list
      await fetchBookingRequests();
    } catch (err) {
      console.error("Error updating booking status:", err);
      throw err;
    }
  };

  const getBookingStats = () => {
    const stats = {
      total: bookingRequests.length,
      approved: bookingRequests.filter((r) => r.status === "approved").length,
      active: bookingRequests.filter((r) => r.status === "active").length,
      cancelled: bookingRequests.filter((r) => r.status === "cancelled").length,
      completed: bookingRequests.filter((r) => r.status === "completed").length,
    };

    return stats;
  };

  useEffect(() => {
    if (user) {
      void fetchBookingRequests();
    }
  }, [user, fetchBookingRequests]);

  return {
    bookingRequests,
    loading,
    error,
    fetchBookingRequests,
    updateBookingStatus,
    getBookingStats,
  };
};
