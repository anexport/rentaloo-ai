import { useTranslation } from "react-i18next";
import type { ReviewWithDetails } from "../../types/review";
import { formatReviewDate } from "../../lib/reviews";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, CheckCircle } from "lucide-react";
import StarRating from "./StarRating";

interface ReviewCardProps {
  review: ReviewWithDetails;
  showEquipment?: boolean;
}

const ReviewCard = ({ review, showEquipment = false }: ReviewCardProps) => {
  const { t } = useTranslation("reviews");

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Reviewer Info */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900">
                  {review.reviewer.full_name || review.reviewer.email}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t("display.verified_badge")}
                </Badge>
              </div>
              <span className="text-sm text-gray-500">
                {formatReviewDate(review.created_at || "")}
              </span>
            </div>
          </div>

          {/* Rating */}
          <div className="text-right">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-sm text-gray-600 mt-1 block">
              {t("display.rating_display", { rating: review.rating.toFixed(1) })}
            </span>
          </div>
        </div>

        {/* Equipment Info (if showing) */}
        {showEquipment && review.booking?.equipment && (
          <div className="mb-3 pb-3 border-b border-gray-200">
            <span className="text-sm text-gray-600">
              {t("display.equipment_label")}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {review.booking.equipment.title}
            </span>
          </div>
        )}

        {/* Review Comment */}
        {review.comment && (
          <div className="text-gray-700 leading-relaxed">
            <p>{review.comment}</p>
          </div>
        )}

        {/* Photos (if any) */}
        {review.photos &&
          Array.isArray(review.photos) &&
          review.photos.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {(review.photos as string[]).slice(0, 4).map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={t("display.review_photo_alt", { number: index + 1 })}
                  className="w-full h-20 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default ReviewCard;

