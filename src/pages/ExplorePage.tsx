import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePrefetchData } from "@/hooks/usePrefetchData";
import SearchBarPopover from "@/components/explore/SearchBarPopover";
import type { SearchBarFilters } from "@/types/search";
import CategoryBar from "@/components/explore/CategoryBar";
import CategoryBarSkeleton from "@/components/explore/CategoryBarSkeleton";
import VirtualListingGrid from "@/components/equipment/VirtualListingGrid";
import ListingCard from "@/components/equipment/ListingCard";
import EquipmentDetailDialog from "@/components/equipment/detail/EquipmentDetailDialog";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import FiltersSheet, {
  type FilterValues,
} from "@/components/explore/FiltersSheet";
import ExploreHeader from "@/components/layout/ExploreHeader";
import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";
import HeroSection from "@/components/explore/HeroSection";
import HowItWorksSection from "@/components/explore/HowItWorksSection";
import OwnerCTASection from "@/components/explore/OwnerCTASection";
import SocialProofSection from "@/components/explore/SocialProofSection";
import FeaturedListingsSection from "@/components/explore/FeaturedListingsSection";
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
    priceRange: [0, 500],
    conditions: [],
    equipmentTypes: [],
    verified: false,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null
  );

  // Prefetch critical data
  usePrefetchData();

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
  const roleParam = searchParams.get("role");
  const signupRole =
    roleParam === "renter" || roleParam === "owner" ? roleParam : undefined;

  const handleSignupOpenChange = (open: boolean) => {
    if (open) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("signup", "true");
      if (signupRole) {
        newParams.set("role", signupRole);
      }
      setSearchParams(newParams, { replace: true });
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("signup");
      newParams.delete("role");
      setSearchParams(newParams, { replace: true });
    }
  };

  // Close modal and redirect authenticated users after OAuth
  useEffect(() => {
    if (user && (loginOpen || signupOpen)) {
      // Close modal by removing login/signup params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("login");
      newParams.delete("signup");
      newParams.delete("role");
      setSearchParams(newParams, { replace: true });
      // Redirect based on user role
      const role = user.user_metadata?.role;
      if (role === "renter") {
        void navigate("/renter/dashboard");
      } else if (role === "owner") {
        void navigate("/owner/dashboard");
      }
    }
  }, [user, loginOpen, signupOpen, navigate, searchParams, setSearchParams]);

  // Debounce filters for querying
  const [debouncedFilters, setDebouncedFilters] = useState(searchFilters);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(searchFilters), 300);
    return () => clearTimeout(t);
  }, [searchFilters]);

  const effectiveFilters: ListingsFilters = useMemo(
    () => ({
      search: debouncedFilters.search,
      location: debouncedFilters.location,
      condition:
        debouncedFilters.condition !== "all"
          ? debouncedFilters.condition
          : undefined,
      priceMin:
        filterValues.priceRange[0] > 0 ? filterValues.priceRange[0] : undefined,
      priceMax:
        filterValues.priceRange[1] < 500
          ? filterValues.priceRange[1]
          : undefined,
      categoryId,
    }),
    [debouncedFilters, categoryId, filterValues]
  );

  const { data, isLoading, refetch, isFetching, isError } = useQuery({
    queryKey: ["listings", effectiveFilters],
    queryFn: () => fetchListings(effectiveFilters),
  });

  const handleSubmitSearch = () => {
    void refetch();
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterValues.priceRange[0] > 0 || filterValues.priceRange[1] < 500)
      count++;
    if (filterValues.conditions.length > 0)
      count += filterValues.conditions.length;
    if (filterValues.equipmentTypes.length > 0)
      count += filterValues.equipmentTypes.length;
    if (filterValues.verified) count++;
    return count;
  }, [filterValues]);

  // Sort listings
  const sortedListings = useMemo(() => {
    if (!data) return [];

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
        return sorted.sort((a, b) => {
          const avgA =
            a.reviews && a.reviews.length > 0
              ? a.reviews.reduce((sum, r) => sum + r.rating, 0) /
                a.reviews.length
              : 0;
          const avgB =
            b.reviews && b.reviews.length > 0
              ? b.reviews.reduce((sum, r) => sum + r.rating, 0) /
                b.reviews.length
              : 0;
          return avgB - avgA;
        });
      }
      case "recommended":
      default:
        return sorted;
    }
  }, [data, sortBy]);

  const handleOpenListing = (listing: Listing) => {
    setSelectedListingId(listing.id);
    setDetailsOpen(true);
  };

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
      priceRange: [0, 500],
      conditions: [],
      equipmentTypes: [],
      verified: false,
    });
    setCategoryId("all");
  };

  const hasSearched =
    debouncedFilters.search ||
    debouncedFilters.location ||
    categoryId !== "all";

  return (
    <div className="min-h-screen bg-background">
      <ExploreHeader onLoginClick={() => handleLoginOpenChange(true)} />

      {/* Hero Section with Search */}
      {!hasSearched && (
        <HeroSection>
          <SearchBarPopover
            value={searchFilters}
            onChange={setSearchFilters}
            onSubmit={handleSubmitSearch}
          />
        </HeroSection>
      )}

      {/* How It Works Section */}
      {!hasSearched && <HowItWorksSection />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search bar for when user has searched */}
        {hasSearched && (
          <div className="mb-6">
            <SearchBarPopover
              value={searchFilters}
              onChange={setSearchFilters}
              onSubmit={handleSubmitSearch}
            />
          </div>
        )}

        {/* Categories */}
        <div className="sticky top-16 z-10 bg-background py-3 -mx-4 px-4 sm:px-6 lg:px-8 border-b border-border">
          {isLoading ? (
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
              <SelectTrigger className="w-[180px]" aria-label="Sort by">
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
              onCategorySelect={setCategoryId}
            />
          ) : sortedListings.length > 50 ? (
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

      {/* Featured Listings Section */}
      {!hasSearched && (
        <FeaturedListingsSection onOpenListing={handleOpenListing} />
      )}

      {/* Owner CTA Section */}
      {!hasSearched && <OwnerCTASection />}

      {/* Social Proof Section */}
      {!hasSearched && <SocialProofSection />}
    </div>
  );
};

export default ExplorePage;
