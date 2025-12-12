import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usePrefetchData } from "@/hooks/usePrefetchData";
import ExploreHeader from "@/components/layout/ExploreHeader";
import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";
import HeroSection from "@/components/explore/HeroSection";
import HowItWorksSection from "@/components/explore/HowItWorksSection";
import OwnerCTASection from "@/components/explore/OwnerCTASection";
import SocialProofSection from "@/components/explore/SocialProofSection";
import FeaturedListingsSection from "@/components/explore/FeaturedListingsSection";
import RecommendationsSection from "@/components/renter/RecommendationsSection";
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
import { format } from "date-fns";

type SortOption =
  | "recommended"
  | "price-low"
  | "price-high"
  | "newest"
  | "rating";

export default function HomePage() {
  const { t } = useTranslation("equipment");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryId, setCategoryId] = useState<string>("all");

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
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [searchFilters, setSearchFilters] = useState<SearchBarFilters>({
    search: "",
    location: "",
    condition: "all",
    priceMin: undefined,
    priceMax: undefined,
    dateRange: undefined,
    equipmentType: undefined,
    equipmentCategoryId: undefined,
  });

  const [filterValues, setFilterValues] = useState<FilterValues>({
    priceRange: [DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX],
    conditions: [],
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
    if (categoryId && categoryId !== "all") {
      params.set("category", categoryId);
    }
    if (searchFilters.priceMin !== undefined) {
      params.set("priceMin", searchFilters.priceMin.toString());
    }
    if (searchFilters.priceMax !== undefined) {
      params.set("priceMax", searchFilters.priceMax.toString());
    }
    if (searchFilters.dateRange?.from) {
      params.set("dateFrom", format(searchFilters.dateRange.from, "yyyy-MM-dd"));
    }
    if (searchFilters.dateRange?.to) {
      params.set("dateTo", format(searchFilters.dateRange.to, "yyyy-MM-dd"));
    }
    if (searchFilters.equipmentType) {
      params.set("equipmentType", searchFilters.equipmentType);
    }
    if (searchFilters.equipmentCategoryId) {
      params.set("equipmentCategoryId", searchFilters.equipmentCategoryId);
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
    if (debouncedFilters.dateRange?.from) {
      filters.dateFrom = format(debouncedFilters.dateRange.from, "yyyy-MM-dd");
    }
    if (debouncedFilters.dateRange?.to) {
      filters.dateTo = format(debouncedFilters.dateRange.to, "yyyy-MM-dd");
    }
    if (debouncedFilters.equipmentCategoryId) {
      // Use specific category id from "what" when category bar is at "all"
      filters.categoryId = filters.categoryId ?? debouncedFilters.equipmentCategoryId;
    }
    if (debouncedFilters.equipmentType) {
      filters.equipmentTypeName = debouncedFilters.equipmentType;
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

  // Apply client-side filters (conditions, verified)
  const clientFilteredListings = useMemo(() => {
    if (!data) return [];

    let filtered = data;

    // Filter by conditions (if any selected)
    if (filterValues.conditions.length > 0) {
      filtered = filtered.filter((listing) =>
        filterValues.conditions.includes(listing.condition)
      );
    }

    // Filter by owner verification
    if (filterValues.verified) {
      filtered = filtered.filter(
        (listing) => listing.owner?.identity_verified === true
      );
    }

    return filtered;
  }, [data, filterValues.conditions, filterValues.verified]);

  // Sort listings
  const sortedListings = useMemo(() => {
    if (!clientFilteredListings) return [];

    // Early return for recommended to avoid unnecessary array copy
    if (sortBy === "recommended") return clientFilteredListings;

    const sorted = [...clientFilteredListings];

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
  }, [clientFilteredListings, sortBy]);

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
      equipmentCategoryId: undefined,
    });
    setFilterValues({
      priceRange: [DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX],
      conditions: [],
      verified: false,
    });
    setCategoryId("all");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Sign In / Sign Up */}
      <ExploreHeader
        onLoginClick={() => handleLoginOpenChange(true)}
        onSignupClick={() => handleSignupOpenChange(true)}
      />

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

      {/* Personalized Recommendations (only shows for logged-in users) */}
      <RecommendationsSection onOpenListing={handleOpenListing} />

      {/* Browse All Equipment Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">{t("browse.title")}</h2>
            <p className="text-muted-foreground">
              {t("browse.subtitle")}
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
                {t("browse.items_count", { count: clientFilteredListings.length })}
                {debouncedFilters.location && (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    {t("browse.in_location", { location: debouncedFilters.location })}
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("browse.available_near_you")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FiltersSheet
                value={filterValues}
                onChange={setFilterValues}
                resultCount={clientFilteredListings.length}
                activeFilterCount={activeFilterCount}
              />
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
              >
                <SelectTrigger className="min-w-[180px]" aria-label={t("filters.sort_by")}>
                  <SelectValue placeholder={t("filters.sort_by")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">{t("filters.recommended")}</SelectItem>
                  <SelectItem value="price-low">{t("filters.price_low_high")}</SelectItem>
                  <SelectItem value="price-high">{t("filters.price_high_low")}</SelectItem>
                  <SelectItem value="newest">{t("filters.newest_first")}</SelectItem>
                  <SelectItem value="rating">{t("filters.highest_rated")}</SelectItem>
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
                  {t("errors.load_failed")}
                </div>
                <Button
                  onClick={() => {
                    void refetch();
                  }}
                  aria-label={t("errors.retry")}
                >
                  {t("errors.retry")}
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
                {t("browse.view_all")}
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
            {t("cta.ready_title")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("cta.ready_message")}
          </p>
          <Button size="lg" onClick={handleBrowseAll}>
            {t("cta.start_browsing")}
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

      {/* Auth Modals */}
      <LoginModal open={loginOpen} onOpenChange={handleLoginOpenChange} />
      <SignupModal
        open={signupOpen}
        onOpenChange={handleSignupOpenChange}
        initialRole={signupRole}
      />
    </div>
  );
}
