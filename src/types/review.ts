import type { Database } from "../lib/database.types";

export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"];
export type ReviewUpdate = Database["public"]["Tables"]["reviews"]["Update"];

export type ReviewWithDetails = Review & {
  reviewer: {
    id: string;
    email: string;
    full_name?: string;
  };
  reviewee: {
    id: string;
    email: string;
    full_name?: string;
  };
  booking: {
    id: string;
    equipment: {
      id: string;
      title: string;
    };
  };
};

export type ReviewFormData = {
  rating: number;
  comment: string;
  photos?: string[];
};

export type RatingCategory = {
  name: string;
  score: number;
};

export type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  categories?: RatingCategory[];
};

export type ReviewFilter = "all" | "positive" | "negative" | "recent";

