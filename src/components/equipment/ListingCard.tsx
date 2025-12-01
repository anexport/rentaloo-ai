import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapPin, ChevronLeft, ChevronRight, Heart, Package } from "lucide-react";
import StarRating from "@/components/reviews/StarRating";
import type { Listing } from "@/components/equipment/services/listings";
import { cn } from "@/lib/utils";

type Props = {
  listing: Listing;
  onOpen?: (listing: Listing) => void;
  className?: string;
};

const ListingCard = ({ listing, onOpen, className }: Props) => {
  const { t } = useTranslation("equipment");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const avgRating = (() => {
    if (!listing.reviews || listing.reviews.length === 0) return 0;
    const validRatings = listing.reviews.filter(
      (r) =>
        typeof r.rating === "number" &&
        Number.isFinite(r.rating) &&
        r.rating >= 0 &&
        r.rating <= 5
    );
    if (validRatings.length === 0) return 0;
    const sum = validRatings.reduce((acc, r) => acc + r.rating, 0);
    return sum / validRatings.length;
  })();

  // Guard currentImageIndex to prevent out-of-bounds access
  useEffect(() => {
    if (listing.photos && listing.photos.length > 0) {
      const photosLength = listing.photos.length;
      setCurrentImageIndex((prev) => Math.min(prev, photosLength - 1));
    } else {
      setCurrentImageIndex(0);
    }
    // Reset image error when listing changes
    setImageError(false);
  }, [listing.photos, listing.id]);

  // Reset image error when navigating between images
  useEffect(() => {
    setImageError(false);
  }, [currentImageIndex]);

  const handleOpen = () => {
    if (onOpen) onOpen(listing);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (listing.photos && listing.photos.length > 0) {
      const photosLength = listing.photos.length;
      setCurrentImageIndex((prev) =>
        prev === 0 ? photosLength - 1 : prev - 1
      );
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (listing.photos && listing.photos.length > 0) {
      const photosLength = listing.photos.length;
      setCurrentImageIndex((prev) =>
        prev === photosLength - 1 ? 0 : prev + 1
      );
    }
  };

  const hasMultipleImages = listing.photos && listing.photos.length > 1;

  return (
    <TooltipProvider>
      <Card className={cn("overflow-hidden hover:shadow-lg transition-shadow flex flex-col", className)}>
        <div
          className="aspect-video bg-muted relative overflow-hidden cursor-pointer group flex-shrink-0"
          onClick={handleOpen}
          role="button"
          tabIndex={0}
          aria-label={t("listing_card.view_listing", { title: listing.title })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOpen();
            }
          }}
        >
          {listing.photos && listing.photos.length > 0 && !imageError ? (
            <>
              <img
                src={listing.photos[currentImageIndex]?.photo_url || ""}
                alt={listing.title}
                className="w-full h-full object-cover transition-opacity duration-300"
                loading="lazy"
                decoding="async"
                onError={() => setImageError(true)}
              />

              {hasMultipleImages && (
                <>
                  {/* Navigation arrows */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handlePrevImage}
                        size="icon-sm"
                        variant="ghost"
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow-md max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-foreground"
                        aria-label={t("listing_card.previous_image")}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("listing_card.previous_photo")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleNextImage}
                        size="icon-sm"
                        variant="ghost"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white shadow-md max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-foreground"
                        aria-label={t("listing_card.next_image")}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("listing_card.next_photo")}</TooltipContent>
                  </Tooltip>

                  {/* Dot indicators */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {listing.photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? "w-6 bg-white"
                            : "w-1.5 bg-white/60 hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-white/80"
                        }`}
                        aria-label={t("listing_card.go_to_image", { number: idx + 1 })}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted">
              <Package className="h-12 w-12 mb-2 opacity-50" />
              <span className="text-sm">
                {imageError ? t("listing_card.image_unavailable") : t("listing_card.no_image")}
              </span>
            </div>
          )}

          {/* Wishlist button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleWishlist}
                className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white hover:bg-white border border-gray-200 shadow-lg opacity-80 group-hover:opacity-100 transition-all flex items-center justify-center z-10 hover:scale-110"
                aria-label={
                  isWishlisted ? t("listing_card.wishlist_remove") : t("listing_card.wishlist_add")
                }
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    isWishlisted ? "fill-red-500 text-red-500" : "text-gray-700"
                  }`}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isWishlisted ? t("listing_card.wishlist_remove") : t("listing_card.wishlist_save")}
            </TooltipContent>
          </Tooltip>

          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className="text-xs font-medium shadow-sm"
            >
              {listing.category?.name}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg line-clamp-1">
              {listing.title}
            </h3>
            <div className="text-right">
              <div className="text-xl font-bold text-primary">
                ${listing.daily_rate}
              </div>
              <div className="text-sm text-muted-foreground">{t("listing_card.per_day")}</div>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {listing.description}
            </p>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-[120px]">
                      {listing.location}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{listing.location}</TooltipContent>
              </Tooltip>
              <div className="flex items-center space-x-2">
                {avgRating > 0 ? (
                  <>
                    <StarRating rating={avgRating} size="sm" />
                    <span className="text-xs">{avgRating.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="text-xs">{t("listing_card.no_reviews")}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-auto">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleOpen}
              aria-label={t("listing_card.view_details")}
            >
              {t("listing_card.view")}
            </Button>
            <Button
              className="flex-1"
              onClick={handleOpen}
              aria-label={t("listing_card.see_availability")}
            >
              {t("listing_card.see_availability")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ListingCard;
