import type { PaymentSummary } from "../types/payment";

/**
 * Calculate payment breakdown including service fees, taxes, insurance, and deposit
 */
export const calculatePaymentSummary = (
  subtotal: number,
  serviceFeePercentage: number = 0.05, // 5% service fee
  taxPercentage: number = 0.0, // No tax for MVP
  insuranceAmount: number = 0,
  depositAmount: number = 0
): PaymentSummary => {
  const service_fee = parseFloat((subtotal * serviceFeePercentage).toFixed(2));
  const tax = parseFloat((subtotal * taxPercentage).toFixed(2));
  const insurance = parseFloat(insuranceAmount.toFixed(2));
  const deposit = parseFloat(depositAmount.toFixed(2));
  const total = parseFloat((subtotal + service_fee + tax + insurance + deposit).toFixed(2));

  // Escrow holds the full total amount
  const escrow_amount = total;

  // Owner receives subtotal (total minus platform fees, insurance, and deposit)
  const owner_payout = subtotal;

  return {
    subtotal,
    service_fee,
    tax,
    insurance,
    deposit,
    total,
    escrow_amount,
    owner_payout,
  };
};

/**
 * Format currency for display
 */
export const formatCurrency = (
  amount: number,
  currency: string = "USD"
): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

/**
 * Get payment status display text
 */
export const getPaymentStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    succeeded: "Completed",
    failed: "Failed",
    refunded: "Refunded",
    cancelled: "Cancelled",
  };

  return statusMap[status] || status;
};

/**
 * Get payment status color for UI
 */
export const getPaymentStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    succeeded: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  return colorMap[status] || "bg-gray-100 text-gray-800";
};

/**
 * Get escrow status display text
 */
export const getEscrowStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    held: "Funds Held in Escrow",
    released: "Released to Owner",
    refunded: "Refunded to Renter",
    disputed: "Under Dispute",
  };

  return statusMap[status] || status;
};

/**
 * Get escrow status color for UI
 */
export const getEscrowStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    held: "bg-blue-100 text-blue-800",
    released: "bg-green-100 text-green-800",
    refunded: "bg-yellow-100 text-yellow-800",
    disputed: "bg-red-100 text-red-800",
  };

  return colorMap[status] || "bg-gray-100 text-gray-800";
};

/**
 * Format transaction date for display
 */
export const formatTransactionDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Validate payment amount
 */
export const isValidPaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 10000 && Number.isFinite(amount);
};

/**
 * Calculate refund amount based on cancellation policy
 */
export const calculateRefundAmount = (
  totalAmount: number,
  startDate: string,
  cancellationDate: string = new Date().toISOString()
): { refundAmount: number; refundPercentage: number } => {
  const start = new Date(startDate);
  const cancellation = new Date(cancellationDate);
  const daysUntilStart = Math.ceil(
    (start.getTime() - cancellation.getTime()) / (1000 * 60 * 60 * 24)
  );

  let refundPercentage = 0;

  // Cancellation policy:
  // - 7+ days before: 100% refund
  // - 3-6 days before: 50% refund
  // - 0-2 days before: 0% refund
  if (daysUntilStart >= 7) {
    refundPercentage = 1.0;
  } else if (daysUntilStart >= 3) {
    refundPercentage = 0.5;
  } else {
    refundPercentage = 0;
  }

  const refundAmount = parseFloat((totalAmount * refundPercentage).toFixed(2));

  return {
    refundAmount,
    refundPercentage: refundPercentage * 100,
  };
};

/**
 * Check if rental is complete and escrow can be released
 */
export const canReleaseEscrow = (
  endDate: string,
  bufferDays: number = 1
): boolean => {
  const end = new Date(endDate);
  const releaseDate = new Date(end);
  releaseDate.setDate(releaseDate.getDate() + bufferDays);

  return new Date() >= releaseDate;
};

