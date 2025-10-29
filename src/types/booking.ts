import type { Database } from "../lib/database.types";

export type BookingStatus =
  Database["public"]["Tables"]["booking_requests"]["Row"]["status"];
export type BookingRequest =
  Database["public"]["Tables"]["booking_requests"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export interface BookingRequestWithDetails extends BookingRequest {
  equipment: Database["public"]["Tables"]["equipment"]["Row"] & {
    category: Database["public"]["Tables"]["categories"]["Row"];
  };
  renter: Database["public"]["Tables"]["profiles"]["Row"];
  owner: Database["public"]["Tables"]["profiles"]["Row"];
}

export interface BookingFormData {
  start_date: string;
  end_date: string;
  message?: string;
}

export interface BookingCalculation {
  daily_rate: number;
  days: number;
  subtotal: number;
  fees: number;
  total: number;
  currency: string;
}

export interface AvailabilitySlot {
  date: string;
  is_available: boolean;
  custom_rate?: number;
}

export interface BookingConflict {
  type: "overlap" | "unavailable" | "minimum_days" | "maximum_days";
  message: string;
  conflicting_dates?: string[];
}
