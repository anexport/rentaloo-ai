import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import ListingCard from "@/components/equipment/ListingCard";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import { fetchListings } from "@/components/equipment/services/listings";
import { ChevronRight, TrendingUp } from "lucide-react";
import type { Listing } from "@/components/equipment/services/listings";

type Props = {
  onOpenListing?: (listing: Listing) => void;
};

const FeaturedListingsSection = ({ onOpenListing }: Props) => {
  const { data: featuredListings, isLoading } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: () => fetchListings({ limit: 4 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  if (isLoading) {
    return (
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Popular this week</h2>
              <p className="text-muted-foreground">
                Trending gear in your area
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
              <h2 className="text-3xl font-bold">Popular this week</h2>
            </div>
            <p className="text-muted-foreground">
              Trending gear in your area
            </p>
          </div>
          <Button variant="ghost" className="hidden sm:flex items-center gap-2">
            View all
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredListings.slice(0, 4).map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onOpen={onOpenListing}
            />
          ))}
        </div>

        <div className="flex justify-center mt-8 sm:hidden">
          <Button variant="ghost" className="flex items-center gap-2">
            View all
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedListingsSection;
