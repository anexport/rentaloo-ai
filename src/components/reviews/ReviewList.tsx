import { useState } from "react";
import type { ReviewWithDetails, ReviewFilter } from "../../types/review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import ReviewCard from "./ReviewCard";
import ReviewSummary from "./ReviewSummary";
import { useReviews } from "@/hooks/useReviews";

interface ReviewListProps {
  revieweeId?: string;
  reviewerId?: string;
  equipmentId?: string;
  showSummary?: boolean;
  showEquipment?: boolean;
}

const ReviewList = ({
  revieweeId,
  reviewerId,
  equipmentId,
  showSummary = true,
  showEquipment = false,
}: ReviewListProps) => {
  const { reviews, summary, loading } = useReviews({
    revieweeId,
    reviewerId,
    equipmentId,
  });
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [displayCount, setDisplayCount] = useState(5);

  const filteredReviews = reviews.filter((review) => {
    if (filter === "positive") return review.rating >= 4;
    if (filter === "negative") return review.rating <= 2;
    if (filter === "recent")
      return (
        new Date(review.created_at || "").getTime() >
        Date.now() - 30 * 24 * 60 * 60 * 1000
      );
    return true;
  });

  const displayedReviews = filteredReviews.slice(0, displayCount);
  const hasMore = displayCount < filteredReviews.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading reviews...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {showSummary && summary && <ReviewSummary summary={summary} />}

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Reviews ({reviews.length})</span>
            </CardTitle>

            {/* Filter Buttons */}
            {reviews.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={filter === "positive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("positive")}
                >
                  Positive
                </Button>
                <Button
                  variant={filter === "negative" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("negative")}
                >
                  Negative
                </Button>
                <Button
                  variant={filter === "recent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("recent")}
                >
                  Recent
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>
                {reviews.length === 0
                  ? "No reviews yet"
                  : "No reviews match your filter"}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {displayedReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    showEquipment={showEquipment}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayCount((prev) => prev + 5)}
                  >
                    Load More Reviews
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewList;

