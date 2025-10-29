import type { ReviewSummary as ReviewSummaryType } from "../../types/review";
import { getRatingPercentage } from "../../lib/reviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import StarRating from "./StarRating";

interface ReviewSummaryProps {
  summary: ReviewSummaryType;
}

const ReviewSummary = ({ summary }: ReviewSummaryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-primary" />
          <span>Overall Rating</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary.totalReviews === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No reviews yet</p>
            <p className="text-sm">Be the first to leave a review!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Average Rating */}
            <div className="text-center pb-6 border-b border-gray-200">
              <div className="text-5xl font-bold text-gray-900 mb-2">
                {summary.averageRating.toFixed(1)}
              </div>
              <StarRating rating={summary.averageRating} size="lg" />
              <p className="text-sm text-gray-600 mt-2">
                Based on {summary.totalReviews}{" "}
                {summary.totalReviews === 1 ? "review" : "reviews"}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count =
                  summary.ratingDistribution[stars as 1 | 2 | 3 | 4 | 5];
                const percentage = getRatingPercentage(
                  count,
                  summary.totalReviews
                );

                return (
                  <div key={stars} className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 w-12">
                      <span className="text-sm font-medium text-gray-700">
                        {stars}
                      </span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </div>

                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <span className="text-sm text-gray-600 w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewSummary;

