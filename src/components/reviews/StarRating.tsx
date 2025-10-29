import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const StarRating = ({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
}: StarRatingProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (newRating: number) => {
    if (interactive && onChange) {
      onChange(newRating);
    }
  };

  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: maxRating }, (_, index) => {
        const starNumber = index + 1;
        const isFilled = starNumber <= rating;
        const isPartial = starNumber > rating && starNumber - 1 < rating;

        return (
          <button
            key={index}
            type="button"
            className={`${
              interactive
                ? "cursor-pointer hover:scale-110 transition-transform"
                : "cursor-default"
            } disabled:opacity-50`}
            onClick={() => handleClick(starNumber)}
            disabled={!interactive}
            aria-label={`Rate ${starNumber} star${starNumber > 1 ? "s" : ""}`}
          >
            {isFilled ? (
              <Star
                className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
              />
            ) : isPartial ? (
              <div className="relative">
                <Star className={`${sizeClasses[size]} text-gray-300`} />
                <div
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{ width: `${(rating % 1) * 100}%` }}
                >
                  <Star
                    className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
                  />
                </div>
              </div>
            ) : (
              <Star className={`${sizeClasses[size]} text-gray-300`} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;

