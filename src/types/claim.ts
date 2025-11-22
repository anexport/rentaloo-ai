import type { Database } from "@/lib/database.types";

export type ClaimStatus = 'pending' | 'accepted' | 'disputed' | 'resolved' | 'escalated';
export type ClaimAction = 'accept' | 'dispute' | 'negotiate';

export interface RenterResponse {
  action: ClaimAction;
  notes?: string;
  counter_offer?: number;
  responded_at: string;
}

export interface ClaimResolution {
  final_amount: number;
  paid_from_deposit: number;
  paid_from_insurance: number;
  additional_charge: number;
  resolved_at: string;
  resolved_by: string;
}

export type DamageClaim = Database['public']['Tables']['damage_claims']['Row'];
export type DamageClaimInsert = Database['public']['Tables']['damage_claims']['Insert'];
export type DamageClaimUpdate = Database['public']['Tables']['damage_claims']['Update'];

export interface DamageClaimFormData {
  damage_description: string;
  evidence_photos: File[];
  estimated_cost: number;
  repair_quotes: File[];
}

export interface DamageClaimWithDetails extends DamageClaim {
  booking: {
    equipment: {
      title: string;
      owner_id: string;
    };
    renter_id: string;
  };
}
