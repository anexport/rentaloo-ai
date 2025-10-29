import type { ReviewSummary } from "../types/review";

/**
 * Calculate review summary statistics
 */
export const calculateReviewSummary = (
  reviews: Array<{ rating: number }>
): ReviewSummary => {
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  }

  const distribution = reviews.reduce(
    (acc, review) => {
      const rating = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>
  );

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  return {
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalReviews: reviews.length,
    ratingDistribution: distribution,
  };
};

/**
 * Get rating percentage for a specific star rating
 */
export const getRatingPercentage = (count: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
};

/**
 * Format review date for display
 */
export const formatReviewDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
};

/**
 * Get star rating color
 */
export const getStarRatingColor = (rating: number): string => {
  if (rating >= 4.5) return "text-green-500";
  if (rating >= 3.5) return "text-yellow-500";
  if (rating >= 2.5) return "text-orange-500";
  return "text-red-500";
};

/**
 * Get rating badge text
 */
export const getRatingBadgeText = (rating: number): string => {
  if (rating >= 4.5) return "Excellent";
  if (rating >= 3.5) return "Good";
  if (rating >= 2.5) return "Average";
  if (rating >= 1.5) return "Poor";
  return "Very Poor";
};

/**
 * Get rating badge color
 */
export const getRatingBadgeColor = (rating: number): string => {
  if (rating >= 4.5) return "bg-green-100 text-green-800";
  if (rating >= 3.5) return "bg-yellow-100 text-yellow-800";
  if (rating >= 2.5) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
};

/**
 * Validate review rating
 */
export const isValidRating = (rating: number): boolean => {
  return rating >= 1 && rating <= 5 && Number.isInteger(rating);
};

/**
 * Validate review comment
 */
export const isValidComment = (comment: string): boolean => {
  const trimmed = comment.trim();
  return trimmed.length >= 10 && trimmed.length <= 1000;
};

/**
 * Check if user can review a booking
 */
export const canReviewBooking = (
  bookingEndDate: string,
  existingReview: boolean
): { canReview: boolean; reason?: string } => {
  if (existingReview) {
    return {
      canReview: false,
      reason: "You have already reviewed this booking",
    };
  }

  const endDate = new Date(bookingEndDate);
  const now = new Date();
  const daysSinceEnd = Math.floor(
    (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceEnd < 0) {
    return {
      canReview: false,
      reason: "You can only review after the rental period ends",
    };
  }

  if (daysSinceEnd > 30) {
    return {
      canReview: false,
      reason: "The review period has expired (30 days after rental)",
    };
  }

  return { canReview: true };
};

