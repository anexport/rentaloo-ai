import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import ListingCard from "@/components/equipment/ListingCard";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import { fetchListings } from "@/components/equipment/services/listings";
import { ChevronRight, ChevronLeft, TrendingUp } from "lucide-react";
import type { Listing } from "@/components/equipment/services/listings";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

type Props = {
  onOpenListing?: (listing: Listing) => void;
};

const FeaturedListingsSection = ({ onOpenListing }: Props) => {
  const navigate = useNavigate();
  const { data: featuredListings, isLoading } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: () => fetchListings({ limit: 10 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      skipSnaps: false,
      dragFree: false,
    },
    [
      Autoplay({
        delay: 3000,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    ]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleViewAll = () => {
    navigate("/explore");
  };

  // Resume autoplay after manual navigation
  useEffect(() => {
    if (!emblaApi) return;

    const autoplay = emblaApi.plugins()?.autoplay;
    if (!autoplay) return;

    const onSelect = () => {
      // Reset autoplay timer on manual scroll
      autoplay.reset();
    };

    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  if (isLoading) {
    return (
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Popular Near You</h2>
              <p className="text-muted-foreground">
                Trending equipment in your area
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!featuredListings || featuredListings.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold">Popular Near You</h2>
            </div>
            <p className="text-muted-foreground">
              Trending equipment in your area
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollPrev}
              className="hidden sm:flex h-10 w-10 rounded-full"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollNext}
              className="hidden sm:flex h-10 w-10 rounded-full"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleViewAll}
              className="hidden sm:flex items-center gap-2"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {featuredListings.map((listing) => (
              <div
                key={listing.id}
                className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(25%-18px)]"
              >
                <ListingCard listing={listing} onOpen={onOpenListing} className="h-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 sm:hidden">
          <div className="flex justify-center gap-2 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollPrev}
              className="h-10 w-10 rounded-full"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollNext}
              className="h-10 w-10 rounded-full"
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={handleViewAll}
              className="flex items-center gap-2"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedListingsSection;
