import type { Database } from "../lib/database.types";

export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];

export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "cancelled";

export type EscrowStatus = "held" | "released" | "refunded" | "disputed";

export type PaymentMethod = {
  id: string;
  type: "card";
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
};

export type PaymentFormData = {
  payment_method_id: string;
  save_payment_method?: boolean;
};

export type PaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  client_secret: string;
  metadata: {
    booking_request_id: string;
    renter_id: string;
    owner_id: string;
  };
};

export type PaymentSummary = {
  subtotal: number;
  service_fee: number;
  tax: number;
  total: number;
  escrow_amount: number;
  owner_payout: number;
};

export type TransactionHistory = {
  id: string;
  booking_request_id: string;
  amount: number;
  status: PaymentStatus;
  type: "payment" | "refund" | "payout";
  created_at: string;
  equipment_title: string;
  counterparty_name: string;
};

export type PayoutRequest = {
  id: string;
  owner_id: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  booking_request_id: string;
  created_at: string;
  processed_at?: string;
};

