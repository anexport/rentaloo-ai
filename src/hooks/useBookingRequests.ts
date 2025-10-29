import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { BookingRequestWithDetails } from "../types/booking";

export const useBookingRequests = (userRole?: "renter" | "owner") => {
  const { user } = useAuth();
  const [bookingRequests, setBookingRequests] = useState<
    BookingRequestWithDetails[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookingRequests = async () => {
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
              owner:profiles!equipment_owner_id_fkey(*)
            ),
            renter:profiles!booking_requests_renter_id_fkey(*)
          `
          )
          .in("equipment_id", equipmentIds)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Transform the data to flatten the owner from equipment
        const transformedData = (data || []).map((item: any) => ({
          ...item,
          owner: item.equipment?.owner || null,
        }));

        setBookingRequests(transformedData || []);
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
              owner:profiles!equipment_owner_id_fkey(*)
            ),
            renter:profiles!booking_requests_renter_id_fkey(*)
          `
          )
          .eq("renter_id", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Transform the data to flatten the owner from equipment
        const transformedData = (data || []).map((item: any) => ({
          ...item,
          owner: item.equipment?.owner || null,
        }));

        setBookingRequests(transformedData || []);
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
              owner:profiles!equipment_owner_id_fkey(*)
            ),
            renter:profiles!booking_requests_renter_id_fkey(*)
          `
          )
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Transform the data to flatten the owner from equipment
        const transformedData = (data || []).map((item: any) => ({
          ...item,
          owner: item.equipment?.owner || null,
        }));

        setBookingRequests(transformedData || []);
      }
    } catch (err) {
      console.error("Error fetching booking requests:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch booking requests"
      );
    } finally {
      setLoading(false);
    }
  };

  const createBookingRequest = async (bookingData: {
    equipment_id: string;
    start_date: string;
    end_date: string;
    total_amount: number;
    message?: string;
  }) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const { data, error } = await supabase
        .from("booking_requests")
        .insert({
          ...bookingData,
          renter_id: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh the list
      await fetchBookingRequests();
      return data;
    } catch (err) {
      console.error("Error creating booking request:", err);
      throw err;
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
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
      pending: bookingRequests.filter((r) => r.status === "pending").length,
      approved: bookingRequests.filter((r) => r.status === "approved").length,
      declined: bookingRequests.filter((r) => r.status === "declined").length,
      cancelled: bookingRequests.filter((r) => r.status === "cancelled").length,
      completed: bookingRequests.filter((r) => r.status === "completed").length,
    };

    return stats;
  };

  useEffect(() => {
    if (user) {
      fetchBookingRequests();
    }
  }, [user, userRole]);

  return {
    bookingRequests,
    loading,
    error,
    fetchBookingRequests,
    createBookingRequest,
    updateBookingStatus,
    getBookingStats,
  };
};
