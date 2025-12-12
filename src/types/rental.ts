import type { Database } from "@/lib/database.types";
import type { BookingRequestWithDetails } from "./booking";

/**
 * Rental status type - extracted from database enum
 * Note: 'active' status is added for rentals that are currently in progress
 */
export type RentalStatus = Database["public"]["Enums"]["booking_status"];

/**
 * Active rental - a booking that's currently in progress (status = 'active')
 */
export interface ActiveRental extends BookingRequestWithDetails {
  status: "active";
  activated_at?: string | null;
}

/**
 * Completed rental - a booking that has finished (status = 'completed')
 */
export interface CompletedRental extends BookingRequestWithDetails {
  status: "completed";
  completed_at?: string | null;
  renter_reviewed_at?: string | null;
  owner_reviewed_at?: string | null;
}

/**
 * Rental event types for audit trail
 */
export type RentalEventType =
  | "pickup_confirmed"
  | "rental_started"
  | "return_confirmed"
  | "rental_completed"
  | "review_submitted"
  | "deposit_released";

/**
 * Rental event record from the rental_events table
 */
export interface RentalEvent {
  id: string;
  booking_id: string;
  event_type: RentalEventType;
  event_data: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

/**
 * Rental countdown data for active rentals
 */
export interface RentalCountdownData {
  totalDays: number;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  progressPercentage: number;
  endDate: Date;
  isOverdue: boolean;
}

/**
 * Calculate countdown data for an active rental
 */
export const calculateRentalCountdown = (
  startDate: string | Date,
  endDate: string | Date
): RentalCountdownData => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date provided");
  }

  if (end < start) {
    throw new Error("End date must be after start date");
  }

  const totalMs = end.getTime() - start.getTime();
  const remainingMs = Math.max(end.getTime() - now.getTime(), 0);
  const elapsedMs = Math.max(now.getTime() - start.getTime(), 0);

  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor(
    (remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutesRemaining = Math.floor(
    (remainingMs % (1000 * 60 * 60)) / (1000 * 60)
  );

  // Handle divide-by-zero case when start equals end
  const progressPercentage =
    totalMs > 0 ? Math.min(Math.round((elapsedMs / totalMs) * 100), 100) : 100;

  return {
    totalDays,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    progressPercentage,
    endDate: end,
    isOverdue: now > end,
  };
};

/**
 * Format countdown text for display
 */
export const formatRentalCountdown = (countdown: RentalCountdownData): string => {
  if (countdown.isOverdue) {
    return "Overdue - return required";
  }

  if (countdown.daysRemaining > 0) {
    const hours = countdown.hoursRemaining > 0 ? `, ${countdown.hoursRemaining}h` : "";
    return `${countdown.daysRemaining} day${countdown.daysRemaining !== 1 ? "s" : ""}${hours}`;
  }

  if (countdown.hoursRemaining > 0) {
    return `${countdown.hoursRemaining}h ${countdown.minutesRemaining}m`;
  }

  return `${countdown.minutesRemaining} minutes`;
};

/**
 * Rental inspection summary for confirmation steps
 */
export interface InspectionSummary {
  photosCount: number;
  checklistItemsCount: number;
  checklistPassedCount: number;
  timestamp: string;
  location?: { lat: number; lng: number } | null;
}

/**
 * Rental period info
 */
export interface RentalPeriodInfo {
  startDate: string;
  endDate: string;
  returnTime?: string;
}

/**
 * Deposit info for rental completion
 */
export interface DepositInfo {
  amount: number;
  claimWindowHours: number;
  status?: "held" | "releasing" | "released" | "claimed" | "refunded";
}

