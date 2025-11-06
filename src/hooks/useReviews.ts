import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { ReviewWithDetails, ReviewSummary } from "../types/review";
import { calculateReviewSummary } from "../lib/reviews";

interface UseReviewsOptions {
  revieweeId?: string;
  reviewerId?: string;
  bookingId?: string;
  equipmentId?: string;
}

export const useReviews = (options: UseReviewsOptions = {}) => {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("reviews")
        .select(
          `
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(id, email),
          reviewee:profiles!reviews_reviewee_id_fkey(id, email),
          booking:bookings(
            id,
            booking_request:booking_requests(
              equipment:equipment(id, title)
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (options.revieweeId) {
        query = query.eq("reviewee_id", options.revieweeId);
      }

      if (options.reviewerId) {
        query = query.eq("reviewer_id", options.reviewerId);
      }

      if (options.bookingId) {
        query = query.eq("booking_id", options.bookingId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Process the data to match ReviewWithDetails type
      const processedReviews = (data || []).map((review) => ({
        ...review,
        booking: {
          id: review.booking?.id || "",
          equipment: {
            id: review.booking?.booking_request?.equipment?.id || "",
            title: review.booking?.booking_request?.equipment?.title || "",
          },
        },
      })) as ReviewWithDetails[];

      setReviews(processedReviews);

      // Calculate summary
      const reviewSummary = calculateReviewSummary(processedReviews);
      setSummary(reviewSummary);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, [options.revieweeId, options.reviewerId, options.bookingId]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const submitReview = useCallback(
    async (reviewData: {
      bookingId: string;
      revieweeId: string;
      rating: number;
      comment: string;
      photos?: string[];
    }) => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("User not authenticated");

        const { error: insertError } = await supabase.from("reviews").insert({
          booking_id: reviewData.bookingId,
          reviewer_id: userData.user.id,
          reviewee_id: reviewData.revieweeId,
          rating: reviewData.rating,
          comment: reviewData.comment,
          photos: reviewData.photos || null,
        });

        if (insertError) throw insertError;

        // Refresh reviews after submission
        await fetchReviews();

        return { success: true };
      } catch (err) {
        console.error("Error submitting review:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to submit review",
        };
      }
    },
    [fetchReviews]
  );

  const checkIfUserReviewed = useCallback(
    async (bookingId: string, userId: string): Promise<boolean> => {
      try {
        const { data, error: checkError } = await supabase
          .from("reviews")
          .select("id")
          .eq("booking_id", bookingId)
          .eq("reviewer_id", userId)
          .single();

        if (checkError && checkError.code !== "PGRST116") throw checkError;

        return !!data;
      } catch (err) {
        console.error("Error checking review status:", err);
        return false;
      }
    },
    []
  );

  return {
    reviews,
    summary,
    loading,
    error,
    fetchReviews,
    submitReview,
    checkIfUserReviewed,
  };
};

