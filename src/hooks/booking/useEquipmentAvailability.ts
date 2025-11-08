import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDateForStorage } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type AvailabilityRecord = Database["public"]["Tables"]["availability_calendar"]["Row"];

export interface EquipmentAvailability {
  date: string;
  isAvailable: boolean;
  customRate?: number | null;
}

interface UseEquipmentAvailabilityProps {
  equipmentId?: string;
  enabled?: boolean;
}

export const useEquipmentAvailability = ({
  equipmentId,
  enabled = true,
}: UseEquipmentAvailabilityProps) => {
  const [availability, setAvailability] = useState<Map<string, EquipmentAvailability>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!equipmentId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch availability for the next 6 months
      const today = new Date();
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(today.getMonth() + 6);

      const { data, error: fetchError } = await supabase
        .from("availability_calendar")
        .select("*")
        .eq("equipment_id", equipmentId)
        .gte("date", formatDateForStorage(today))
        .lte("date", formatDateForStorage(sixMonthsFromNow));

      if (fetchError) throw fetchError;

      // Convert to Map for fast lookup
      const availabilityMap = new Map<string, EquipmentAvailability>();
      (data || []).forEach((record: AvailabilityRecord) => {
        availabilityMap.set(record.date, {
          date: record.date,
          isAvailable: record.is_available ?? true,
          customRate: record.custom_rate,
        });
      });

      setAvailability(availabilityMap);
    } catch (err) {
      console.error("Error fetching availability:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch availability"));
    } finally {
      setLoading(false);
    }
  }, [equipmentId, enabled]);

  useEffect(() => {
    void fetchAvailability();
  }, [fetchAvailability]);

  const getAvailabilityForDate = useCallback(
    (date: Date): EquipmentAvailability | undefined => {
      const dateStr = formatDateForStorage(date);
      return availability.get(dateStr);
    },
    [availability]
  );

  const isDateAvailable = useCallback(
    (date: Date): boolean => {
      const dateStr = formatDateForStorage(date);
      const record = availability.get(dateStr);
      // If no record exists, assume available
      return record?.isAvailable ?? true;
    },
    [availability]
  );

  return {
    availability,
    loading,
    error,
    getAvailabilityForDate,
    isDateAvailable,
    refetch: fetchAvailability,
  };
};

