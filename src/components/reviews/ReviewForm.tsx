import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation, type TFunction } from "react-i18next";
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

const createReviewSchema = (t: TFunction) =>
  z.object({
    rating: z
      .number()
      .min(1, t("form.validation_errors.min_rating"))
      .max(5, t("form.validation_errors.max_rating"))
      .int(t("form.validation_errors.rating_whole_number")),
    comment: z
      .string()
      .min(10, t("form.validation_errors.min_length"))
      .max(1000, t("form.validation_errors.max_length")),
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
  const { t } = useTranslation("reviews");
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reviewSchema = useMemo(() => createReviewSchema(t), [t]);

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
      setError(t("errors.not_logged_in"));
      return;
    }

    if (rating === 0) {
      setError(t("form.validation_errors.rating_required"));
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

      void onSuccess?.();
    } catch (err) {
      console.error("Error submitting review:", err);
      setError(
        err instanceof Error ? err.message : t("errors.submit_failed")
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
          <span>{t("form.title")}</span>
        </CardTitle>
        <CardDescription>
          {t("form.description", { equipmentTitle, revieweeName })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-6"
        >
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
              {t("form.rating_required")}
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
                  {t("form.rating_display", { rating })}
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
              {t("form.comment_required")}
            </Label>
            <Textarea
              id="comment"
              placeholder={t("form.comment_placeholder")}
              rows={6}
              {...register("comment")}
            />
            {errors.comment && (
              <p className="text-sm text-red-600">{errors.comment.message}</p>
            )}
            <p className="text-xs text-gray-500">{t("form.comment_hint")}</p>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 text-sm mb-2">
              {t("form.guidelines_title")}
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• {t("form.guideline_specific")}</li>
              <li>• {t("form.guideline_respectful")}</li>
              <li>• {t("form.guideline_facts")}</li>
              <li>• {t("form.guideline_improvements")}</li>
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
                {t("form.cancel_button")}
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting
                ? t("form.submitting_button")
                : t("form.submit_button")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm;
