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

export type InsuranceType = 'none' | 'basic' | 'premium';

export interface InsuranceOption {
  type: InsuranceType;
  label: string;
  coverage: string;
  cost_percentage: number;
  description: string;
}

export interface BookingWithInsurance extends BookingRequest {
  insurance_type: InsuranceType;
  insurance_cost: number;
  damage_deposit_amount: number;
}

export interface BookingCalculation {
  days: number;
  dailyRate: number;
  subtotal: number;
  serviceFee: number;
  tax: number;
  insurance: number;
  deposit: number;
  total: number;
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
