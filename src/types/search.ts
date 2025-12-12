import type { DateRange } from "react-day-picker";
import type { Database } from "@/lib/database.types";

export type SearchBarFilters = {
  search: string;
  location: string;
  condition: Database["public"]["Enums"]["equipment_condition"] | "all";
  priceMin?: number;
  priceMax?: number;
  dateRange?: DateRange;
  equipmentType?: string;
  equipmentCategoryId?: string;
};
