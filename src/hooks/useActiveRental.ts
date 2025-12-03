import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { BookingRequestWithDetails } from "@/types/booking";

interface InspectionData {
  id: string;
  inspection_type: "pickup" | "return";
  completed_at: string;
  photos_count: number;
  checklist_count: number;
}

interface ActiveRentalData {
  booking: BookingRequestWithDetails;
  pickupInspection: InspectionData | null;
  returnInspection: InspectionData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch a specific active rental with inspection data
 */
export function useActiveRental(bookingId: string | undefined): ActiveRentalData & {
  refetch: () => Promise<void>;
} {
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingRequestWithDetails | null>(null);
  const [pickupInspection, setPickupInspection] = useState<InspectionData | null>(null);
  const [returnInspection, setReturnInspection] = useState<InspectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRental = useCallback(async () => {
    if (!bookingId || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch booking with equipment and owner details
      const { data: bookingData, error: bookingError } = await supabase
        .from("booking_requests")
        .select(`
          *,
          equipment:equipment_id (
            *,
            owner:owner_id (id, email, username, full_name, avatar_url),
            category:category_id (id, name),
            equipment_photos (id, photo_url, is_primary, order_index)
          ),
          renter:renter_id (id, email, username, full_name, avatar_url)
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Verify user has access (is renter or owner)
      const isRenter = bookingData.renter_id === user.id;
      const isOwner = bookingData.equipment?.owner_id === user.id;

      if (!isRenter && !isOwner) {
        throw new Error("You don't have access to this rental");
      }

      setBooking(bookingData as BookingRequestWithDetails);

      // Fetch inspections
      const { data: inspections, error: inspectionsError } = await supabase
        .from("equipment_inspections")
        .select(`
          id,
          inspection_type,
          timestamp,
          photos,
          checklist_items
        `)
        .eq("booking_id", bookingId);

      if (inspectionsError) throw inspectionsError;

      // Process inspections
      const pickup = inspections?.find((i) => i.inspection_type === "pickup");
      const returnInsp = inspections?.find((i) => i.inspection_type === "return");

      if (pickup) {
        const checklistItems = Array.isArray(pickup.checklist_items) 
          ? pickup.checklist_items 
          : [];
        setPickupInspection({
          id: pickup.id,
          inspection_type: "pickup",
          completed_at: pickup.timestamp,
          photos_count: pickup.photos?.length || 0,
          checklist_count: checklistItems.length,
        });
      }

      if (returnInsp) {
        const checklistItems = Array.isArray(returnInsp.checklist_items) 
          ? returnInsp.checklist_items 
          : [];
        setReturnInspection({
          id: returnInsp.id,
          inspection_type: "return",
          completed_at: returnInsp.timestamp,
          photos_count: returnInsp.photos?.length || 0,
          checklist_count: checklistItems.length,
        });
      }
    } catch (err) {
      console.error("Error fetching active rental:", err);
      setError(err instanceof Error ? err.message : "Failed to load rental");
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, user]);

  useEffect(() => {
    void fetchRental();
  }, [fetchRental]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`rental-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "booking_requests",
          filter: `id=eq.${bookingId}`,
        },
        () => {
          void fetchRental();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookingId, fetchRental]);

  return {
    booking: booking as BookingRequestWithDetails,
    pickupInspection,
    returnInspection,
    isLoading,
    error,
    refetch: fetchRental,
  };
}

/**
 * Hook to fetch all active rentals for the current user
 */
export function useActiveRentals(role: "renter" | "owner" | "both" = "both"): {
  rentals: BookingRequestWithDetails[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { user } = useAuth();
  const [rentals, setRentals] = useState<BookingRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch rentals where user is renter
      let renterRentals: BookingRequestWithDetails[] = [];
      if (role === "renter" || role === "both") {
        const { data, error: renterError } = await supabase
          .from("booking_requests")
          .select(`
            *,
            equipment:equipment_id (
              *,
              owner:owner_id (id, email, username, full_name, avatar_url),
              category:category_id (id, name),
              equipment_photos (id, photo_url, is_primary, order_index)
            ),
            renter:renter_id (id, email, username, full_name, avatar_url)
          `)
          .eq("status", "active")
          .eq("renter_id", user.id)
          .order("start_date", { ascending: true });

        if (renterError) throw renterError;
        renterRentals = (data || []) as BookingRequestWithDetails[];
      }

      // Fetch rentals where user is owner (equipment they own that's being rented)
      let ownerRentals: BookingRequestWithDetails[] = [];
      if (role === "owner" || role === "both") {
        // First get user's equipment IDs
        const { data: userEquipment, error: equipError } = await supabase
          .from("equipment")
          .select("id")
          .eq("owner_id", user.id);

        if (equipError) throw equipError;

        if (userEquipment && userEquipment.length > 0) {
          const equipmentIds = userEquipment.map((e) => e.id);
          
          const { data, error: ownerError } = await supabase
            .from("booking_requests")
            .select(`
              *,
              equipment:equipment_id (
                *,
                owner:owner_id (id, email, username, full_name, avatar_url),
                category:category_id (id, name),
                equipment_photos (id, photo_url, is_primary, order_index)
              ),
              renter:renter_id (id, email, username, full_name, avatar_url)
            `)
            .eq("status", "active")
            .in("equipment_id", equipmentIds)
            .order("start_date", { ascending: true });

          if (ownerError) throw ownerError;
          ownerRentals = (data || []) as BookingRequestWithDetails[];
        }
      }

      // Combine and deduplicate (in case user is both renter and owner somehow)
      const allRentals = [...renterRentals, ...ownerRentals];
      const uniqueRentals = allRentals.filter(
        (rental, index, self) =>
          index === self.findIndex((r) => r.id === rental.id)
      );

      setRentals(uniqueRentals);
    } catch (err) {
      console.error("Error fetching active rentals:", err);
      setError(err instanceof Error ? err.message : "Failed to load rentals");
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    void fetchRentals();
  }, [fetchRentals]);

  return { rentals, isLoading, error, refetch: fetchRentals };
}

