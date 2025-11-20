import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePrefetchData } from "@/hooks/usePrefetchData";
import HeroSection from "@/components/explore/HeroSection";
import HowItWorksSection from "@/components/explore/HowItWorksSection";
import OwnerCTASection from "@/components/explore/OwnerCTASection";
import SocialProofSection from "@/components/explore/SocialProofSection";
import FeaturedListingsSection from "@/components/explore/FeaturedListingsSection";
import SearchBarPopover from "@/components/explore/SearchBarPopover";
import CategoryBar from "@/components/explore/CategoryBar";
import CategoryBarSkeleton from "@/components/explore/CategoryBarSkeleton";
import VirtualListingGrid from "@/components/equipment/VirtualListingGrid";
import ListingCard from "@/components/equipment/ListingCard";
import EquipmentDetailDialog from "@/components/equipment/detail/EquipmentDetailDialog";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import EmptyState from "@/components/explore/EmptyState";
import FiltersSheet, {
  type FilterValues,
} from "@/components/explore/FiltersSheet";
import {
  fetchListings,
  type ListingsFilters,
  type Listing,
} from "@/components/equipment/services/listings";
import {
  VIRTUAL_SCROLL_THRESHOLD,
  DEFAULT_PRICE_MIN,
  DEFAULT_PRICE_MAX,
} from "@/config/pagination";
import type { SearchBarFilters } from "@/types/search";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

type SortOption =
  | "recommended"
  | "price-low"
  | "price-high"
  | "newest"
  | "rating";

export default function HomePage() {
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [searchFilters, setSearchFilters] = useState<SearchBarFilters>({
    search: "",
    location: "",
    condition: "all",
    priceMin: undefined,
    priceMax: undefined,
    dateRange: undefined,
    equipmentType: undefined,
  });

  const [filterValues, setFilterValues] = useState<FilterValues>({
    priceRange: [DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX],
    conditions: [],
    equipmentTypes: [],
    verified: false,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null
  );

  // Prefetch data for better performance
  usePrefetchData();

  const handleSearchSubmit = () => {
    const params = new URLSearchParams();

    if (searchFilters.search) params.set("search", searchFilters.search);
    if (searchFilters.location) params.set("location", searchFilters.location);
    if (searchFilters.category && searchFilters.category !== "all") {
      params.set("category", searchFilters.category);
    }
    if (searchFilters.priceMin !== undefined) {
      params.set("priceMin", searchFilters.priceMin.toString());
    }
    if (searchFilters.priceMax !== undefined) {
      params.set("priceMax", searchFilters.priceMax.toString());
    }

    navigate(`/explore?${params.toString()}`);
  };

  const handleBrowseAll = () => {
    navigate("/explore");
  };

  // Debounce filters for better performance
  const debouncedFilters = useDebounce(searchFilters, 300);

  // Build filters for API
  const effectiveFilters: ListingsFilters = useMemo(() => {
    const filters: ListingsFilters = {};

    if (debouncedFilters.search && debouncedFilters.search.trim()) {
      filters.search = debouncedFilters.search.trim();
    }

    if (debouncedFilters.location && debouncedFilters.location.trim()) {
      filters.location = debouncedFilters.location.trim();
    }

    if (categoryId !== "all") {
      filters.categoryId = categoryId;
    }

    if (
      filterValues.priceRange[0] > DEFAULT_PRICE_MIN ||
      filterValues.priceRange[1] < DEFAULT_PRICE_MAX
    ) {
      filters.priceMin = filterValues.priceRange[0];
      filters.priceMax = filterValues.priceRange[1];
    }

    return filters;
  }, [debouncedFilters, categoryId, filterValues.priceRange]);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["listings", effectiveFilters],
    queryFn: () => fetchListings(effectiveFilters),
    staleTime: 1000 * 60 * 5,
  });

  // Sort listings
  const sortedListings = useMemo(() => {
    if (!data) return [];

    // Early return for recommended to avoid unnecessary array copy
    if (sortBy === "recommended") return data;

    const sorted = [...data];

    switch (sortBy) {
      case "price-low":
        return sorted.sort((a, b) => a.daily_rate - b.daily_rate);
      case "price-high":
        return sorted.sort((a, b) => b.daily_rate - a.daily_rate);
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "rating": {
        // Precompute ratings once to avoid O(n × m × log n) complexity
        const listingsWithRatings = sorted.map((listing) => {
          const reviews = listing.reviews ?? [];
          const avgRating = reviews.length
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;
          return { listing, avgRating };
        });

        // Sort using precomputed values (O(n log n))
        listingsWithRatings.sort((a, b) => b.avgRating - a.avgRating);

        // Extract listings
        return listingsWithRatings.map(({ listing }) => listing);
      }
      default:
        return sorted;
    }
  }, [data, sortBy]);

  const handleOpenListing = (listing: Listing) => {
    setSelectedListingId(listing.id);
    setDetailsOpen(true);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (
      filterValues.priceRange[0] > DEFAULT_PRICE_MIN ||
      filterValues.priceRange[1] < DEFAULT_PRICE_MAX
    ) {
      count++;
    }
    if (filterValues.conditions.length > 0) count++;
    if (filterValues.equipmentTypes.length > 0) count++;
    if (filterValues.verified) count++;
    return count;
  }, [filterValues]);

  const handleClearFilters = () => {
    setSearchFilters({
      search: "",
      location: "",
      condition: "all",
      priceMin: undefined,
      priceMax: undefined,
      dateRange: undefined,
      equipmentType: undefined,
    });
    setFilterValues({
      priceRange: [DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX],
      conditions: [],
      equipmentTypes: [],
      verified: false,
    });
    setCategoryId("all");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection>
        <SearchBarPopover
          value={searchFilters}
          onChange={setSearchFilters}
          onSubmit={handleSearchSubmit}
        />
      </HeroSection>

      {/* Featured Listings */}
      <FeaturedListingsSection onOpenListing={handleOpenListing} />

      {/* Browse All Equipment Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Browse all equipment</h2>
            <p className="text-muted-foreground">
              Explore our full collection of available gear
            </p>
          </div>

          {/* Categories */}
          <div className="mb-6">
            {isLoading && !data ? (
              <CategoryBarSkeleton />
            ) : (
              <CategoryBar
                activeCategoryId={categoryId}
                onCategoryChange={setCategoryId}
              />
            )}
          </div>

          {/* Filters row and Grid Header */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {data?.length ?? 0} {(data?.length ?? 0) === 1 ? "item" : "items"}
                {debouncedFilters.location && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    in {debouncedFilters.location}
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                Available for rent near you
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FiltersSheet
                value={filterValues}
                onChange={setFilterValues}
                resultCount={data?.length ?? 0}
                activeFilterCount={activeFilterCount}
              />
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
              >
                <SelectTrigger className="min-w-[180px]" aria-label="Sort by">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />

          {/* Listing grid */}
          <div className="mt-6">
            {isError ? (
              <div className="text-center py-10">
                <div className="text-muted-foreground mb-4">
                  Failed to load equipment. Please try again.
                </div>
                <Button
                  onClick={() => {
                    void refetch();
                  }}
                  aria-label="Retry"
                >
                  Retry
                </Button>
              </div>
            ) : isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : !data || data.length === 0 ? (
              <EmptyState
                filters={effectiveFilters}
                onClearFilters={handleClearFilters}
              />
            ) : sortedListings.length > VIRTUAL_SCROLL_THRESHOLD ? (
              <VirtualListingGrid
                listings={sortedListings}
                onOpenListing={handleOpenListing}
              />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    onOpen={handleOpenListing}
                  />
                ))}
              </div>
            )}
          </div>

          {/* View More CTA */}
          {data && data.length > 0 && (
            <div className="text-center mt-12">
              <Button
                size="lg"
                onClick={handleBrowseAll}
                className="group"
              >
                View All on Browse Page
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <HowItWorksSection />

      {/* Owner CTA */}
      <OwnerCTASection />

      {/* Social Proof */}
      <SocialProofSection />

      {/* Footer CTA */}
      <div className="bg-muted py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to start renting?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of renters and owners making the most of their outdoor
            gear. Start browsing equipment near you today.
          </p>
          <Button size="lg" onClick={handleBrowseAll}>
            Start Browsing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Equipment Detail Dialog */}
      <EquipmentDetailDialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedListingId(null);
        }}
        listingId={selectedListingId ?? undefined}
      />
    </div>
  );
}
