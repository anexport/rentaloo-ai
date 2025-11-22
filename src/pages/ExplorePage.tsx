import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SearchBarPopover from "@/components/explore/SearchBarPopover";
import type { SearchBarFilters } from "@/types/search";
import CategoryBar from "@/components/explore/CategoryBar";
import CategoryBarSkeleton from "@/components/explore/CategoryBarSkeleton";
import VirtualListingGrid from "@/components/equipment/VirtualListingGrid";
import ListingCard from "@/components/equipment/ListingCard";
import EquipmentDetailDialog from "@/components/equipment/detail/EquipmentDetailDialog";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import {
  VIRTUAL_SCROLL_THRESHOLD,
  DEFAULT_PRICE_MIN,
  DEFAULT_PRICE_MAX,
} from "@/config/pagination";
import FiltersSheet, {
  type FilterValues,
} from "@/components/explore/FiltersSheet";
import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";
import ExploreHeader from "@/components/layout/ExploreHeader";
import EmptyState from "@/components/explore/EmptyState";
import {
  fetchListings,
  type ListingsFilters,
  type Listing,
} from "@/components/equipment/services/listings";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

type SortOption =
  | "recommended"
  | "price-low"
  | "price-high"
  | "newest"
  | "rating";

const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Track if we've initialized from URL params
  const hasInitialized = useRef(false);

  // Initialize filters from URL params once on mount
  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) return;

    const search = searchParams.get("search");
    const location = searchParams.get("location");
    const category = searchParams.get("category");
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");

    if (search || location || category || priceMin || priceMax) {
      setSearchFilters((prev) => ({
        ...prev,
        search: search || prev.search,
        location: location || prev.location,
      }));

      if (category) setCategoryId(category);
      if (priceMin || priceMax) {
        const minPrice = priceMin ? parseInt(priceMin) : DEFAULT_PRICE_MIN;
        const maxPrice = priceMax ? parseInt(priceMax) : DEFAULT_PRICE_MAX;

        // Validate that priceMin <= priceMax
        setFilterValues((prev) => ({
          ...prev,
          priceRange: [
            Math.min(minPrice, maxPrice),
            Math.max(minPrice, maxPrice),
          ],
        }));
      }

      hasInitialized.current = true;
    }
  }, [searchParams]);

  // Login modal state from URL query param
  const loginOpen = searchParams.get("login") === "true";

  const handleLoginOpenChange = (open: boolean) => {
    if (open) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("login", "true");
      setSearchParams(newParams, { replace: true });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("login");
      setSearchParams(newParams, { replace: true });
    }
  };

  // Signup modal state from URL query params
  const signupOpen = searchParams.get("signup") === "true";
  const signupRole = searchParams.get("role") as "renter" | "owner" | null;

  const handleSignupOpenChange = (open: boolean) => {
    if (open) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("signup", "true");
      setSearchParams(newParams, { replace: true });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("signup");
      newParams.delete("role");
      setSearchParams(newParams, { replace: true });
    }
  };

  const handleSubmitSearch = (filters: SearchBarFilters) => {
    setSearchFilters(filters);
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

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
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
      {/* Header with navbar when logged in */}
      {user && (
        <ExploreHeader
          onLoginClick={() => handleLoginOpenChange(true)}
          onSignupClick={() => handleSignupOpenChange(true)}
        />
      )}

      {/* Sticky Header with Search */}
      <div className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <SearchBarPopover
            value={searchFilters}
            onChange={setSearchFilters}
            onSubmit={handleSubmitSearch}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        <nav className="mb-4 flex items-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-foreground">Browse Equipment</span>
          {categoryId !== "all" && (
            <>
              <ChevronRight className="h-4 w-4 mx-2" />
              <span className="text-foreground capitalize">{categoryId}</span>
            </>
          )}
        </nav>

        {/* Categories - Sticky */}
        <div className="sticky top-[73px] z-40 bg-background py-3 -mx-4 px-4 sm:px-6 lg:px-8 border-b border-border">
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
        <div className="flex items-center justify-between gap-4 mt-4 mb-4">
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

        <EquipmentDetailDialog
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) setSelectedListingId(null);
          }}
          listingId={selectedListingId ?? undefined}
        />
        <LoginModal open={loginOpen} onOpenChange={handleLoginOpenChange} />
        <SignupModal
          open={signupOpen}
          onOpenChange={handleSignupOpenChange}
          initialRole={signupRole}
        />
      </main>
    </div>
  );
};

export default ExplorePage;
