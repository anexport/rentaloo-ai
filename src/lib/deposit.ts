import type { DepositStatus } from "@/types/payment";

export interface PaymentWithDeposit {
  id: string;
  deposit_amount: number;
  deposit_status: DepositStatus | null;
  deposit_released_at: string | null;
  stripe_payment_intent_id: string;
}

export interface DepositReleaseValidation {
  canRelease: boolean;
  reason?: string;
}

/**
 * Check if a deposit can be released
 */
export function canReleaseDeposit(
  payment: PaymentWithDeposit,
  returnInspectionCompleted: boolean,
  hasPendingClaims: boolean
): DepositReleaseValidation {
  if (!payment.deposit_amount || payment.deposit_amount <= 0) {
    return { canRelease: false, reason: "No deposit to release" };
  }

  if (payment.deposit_status !== "held") {
    return { canRelease: false, reason: "Deposit already processed" };
  }

  if (!returnInspectionCompleted) {
    return { canRelease: false, reason: "Return inspection not completed" };
  }

  if (hasPendingClaims) {
    return { canRelease: false, reason: "Pending damage claims exist" };
  }

  return { canRelease: true };
}

/**
 * Calculate the deposit refund amount after any claim deductions
 */
export function calculateDepositRefund(
  depositAmount: number,
  claimedAmount: number
): number {
  return Math.max(0, depositAmount - claimedAmount);
}

/**
 * Get a human-readable deposit status
 */
export function getDepositStatusText(status: DepositStatus | null): string {
  switch (status) {
    case "held":
      return "Held in escrow";
    case "released":
      return "Released to renter";
    case "claimed":
      return "Used for damage claim";
    case "refunded":
      return "Refunded";
    default:
      return "No deposit";
  }
}

/**
 * Get deposit status color for badges
 */
export function getDepositStatusColor(status: DepositStatus | null): string {
  switch (status) {
    case "held":
      return "bg-yellow-100 text-yellow-800";
    case "released":
      return "bg-green-100 text-green-800";
    case "claimed":
      return "bg-red-100 text-red-800";
    case "refunded":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
