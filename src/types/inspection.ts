import type { Database } from "@/lib/database.types";

export type InspectionType = 'pickup' | 'return';

export type ChecklistItemStatus = 'good' | 'fair' | 'damaged';

export interface ChecklistItem {
  item: string;
  status: ChecklistItemStatus;
  notes?: string;
}

export interface InspectionLocation {
  lat: number;
  lng: number;
}

export type EquipmentInspection = Database['public']['Tables']['equipment_inspections']['Row'];
export type EquipmentInspectionInsert = Database['public']['Tables']['equipment_inspections']['Insert'];
export type EquipmentInspectionUpdate = Database['public']['Tables']['equipment_inspections']['Update'];

export interface InspectionFormData {
  inspection_type: InspectionType;
  photos: File[];
  condition_notes: string;
  checklist_items: ChecklistItem[];
  signature: string;
}
