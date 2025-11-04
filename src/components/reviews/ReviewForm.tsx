import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { ReviewFormData } from "../../types/review";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Star } from "lucide-react";
import StarRating from "./StarRating";

const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars")
    .int("Rating must be a whole number"),
  comment: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(1000, "Review cannot exceed 1000 characters"),
});

interface ReviewFormProps {
  bookingId: string;
  revieweeId: string;
  revieweeName: string;
  equipmentTitle: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReviewForm = ({
  bookingId,
  revieweeId,
  revieweeName,
  equipmentTitle,
  onSuccess,
  onCancel,
}: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    setValue("rating", newRating, { shouldValidate: true });
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (!user) {
      setError("You must be logged in to submit a review");
      return;
    }

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: reviewError } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating: data.rating,
        comment: data.comment,
      });

      if (reviewError) throw reviewError;

      onSuccess?.();
    } catch (err) {
      console.error("Error submitting review:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit review. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-primary" />
          <span>Leave a Review</span>
        </CardTitle>
        <CardDescription>
          Share your experience renting "{equipmentTitle}" from {revieweeName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Rating */}
          <div className="space-y-3">
            <Label htmlFor="rating" className="text-base font-medium">
              Overall Rating *
            </Label>
            <div className="flex items-center space-x-4">
              <StarRating
                rating={rating}
                interactive
                onChange={handleRatingChange}
                size="lg"
              />
              {rating > 0 && (
                <span className="text-lg font-semibold text-gray-700">
                  {rating} out of 5
                </span>
              )}
            </div>
            {errors.rating && (
              <p className="text-sm text-red-600">{errors.rating.message}</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-base font-medium">
              Your Review *
            </Label>
            <Textarea
              id="comment"
              placeholder="Tell others about your experience... (minimum 10 characters)"
              rows={6}
              {...register("comment")}
            />
            {errors.comment && (
              <p className="text-sm text-red-600">{errors.comment.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Be honest and constructive. Your review will help others make
              informed decisions.
            </p>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 text-sm mb-2">
              Review Guidelines
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>
                • Be specific about your experience with the equipment and owner
              </li>
              <li>• Keep it respectful and constructive</li>
              <li>• Focus on facts rather than emotions</li>
              <li>• Mention both positives and areas for improvement</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
