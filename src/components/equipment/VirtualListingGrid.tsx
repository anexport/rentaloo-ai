import { useEffect, useRef, useState } from "react";
import ListingCard from "@/components/equipment/ListingCard";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import type { Listing } from "@/components/equipment/services/listings";

type Props = {
  listings: Listing[];
  onOpenListing?: (listing: Listing) => void;
  threshold?: number; // Number of items to render at once
};

const VirtualListingGrid = ({
  listings,
  onOpenListing,
  threshold = 50,
}: Props) => {
  const [visibleCount, setVisibleCount] = useState(threshold);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset visible count when listings change
    setVisibleCount(threshold);
  }, [listings, threshold]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (visibleCount >= listings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          // Load more items when sentinel comes into view
          setVisibleCount((prev) =>
            Math.min(prev + threshold, listings.length)
          );
        }
      },
      {
        rootMargin: "200px", // Start loading before user reaches the end
      }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [visibleCount, listings.length, threshold]);

  const visibleListings = listings.slice(0, visibleCount);
  const hasMore = visibleCount < listings.length;

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleListings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onOpen={onOpenListing}
          />
        ))}
      </div>

      {/* Sentinel element for intersection observer */}
      {hasMore && (
        <div ref={sentinelRef} className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default VirtualListingGrid;
