import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useQueryState,
  parseAsStringEnum,
  parseAsInteger,
  parseAsArrayOf,
  parseAsBoolean,
} from "nuqs";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import SearchBarPopover from "@/components/explore/SearchBarPopover";
import type { SearchBarFilters } from "@/types/search";
import CategoryBar from "@/components/explore/CategoryBar";
import CategoryBarSkeleton from "@/components/explore/CategoryBarSkeleton";
import ListingCard from "@/components/equipment/ListingCard";
import EquipmentDetailDialog from "@/components/equipment/detail/EquipmentDetailDialog";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import {
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
import MapView from "@/components/explore/MapView";
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
import type { SortOption } from "@/components/explore/ListingsGridHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMaxWidthQuery } from "@/config/breakpoints";
import { cn } from "@/lib/utils";

const CONDITION_VALUES: Array<Listing["condition"]> = [
  "new",
  "excellent",
  "good",
  "fair",
];

const ExplorePage = () => {
  const { t } = useTranslation("equipment");
  const { t: tNav } = useTranslation("navigation");
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const isMobile = useMediaQuery(createMaxWidthQuery("md"));
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);
  const listItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Filter params managed via nuqs
  const [searchQuery, setSearchQuery] = useQueryState("search", {
    defaultValue: "",
  });
  const [locationQuery, setLocationQuery] = useQueryState("location", {
    defaultValue: "",
  });
  const [dateFromQuery, setDateFromQuery] = useQueryState("dateFrom", {
    defaultValue: "",
  });
  const [dateToQuery, setDateToQuery] = useQueryState("dateTo", {
    defaultValue: "",
  });
  const [equipmentTypeQuery, setEquipmentTypeQuery] = useQueryState(
    "equipmentType",
    {
      defaultValue: "",
    }
  );
  const [equipmentCategoryIdQuery, setEquipmentCategoryIdQuery] = useQueryState(
    "equipmentCategoryId",
    {
      defaultValue: "",
    }
  );
  const [categoryId, setCategoryId] = useQueryState("category", {
    defaultValue: "all",
  });

  // Price range params managed via nuqs
  const [priceMin, setPriceMin] = useQueryState(
    "priceMin",
    parseAsInteger.withDefault(DEFAULT_PRICE_MIN)
  );
  const [priceMax, setPriceMax] = useQueryState(
    "priceMax",
    parseAsInteger.withDefault(DEFAULT_PRICE_MAX)
  );

  const [conditionsParam, setConditionsParam] = useQueryState(
    "conditions",
    parseAsArrayOf(
      parseAsStringEnum<Listing["condition"]>(CONDITION_VALUES)
    ).withDefault([])
  );

  const [verifiedParam, setVerifiedParam] = useQueryState(
    "verified",
    parseAsBoolean.withDefault(false)
  );

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

  // Sync searchFilters with nuqs URL params (one-way: URL → state)
  useEffect(() => {
    setSearchFilters((prev) => {
      // Only update if values actually changed from URL to avoid loops
      if (
        prev.search === (searchQuery ?? "") &&
        prev.location === (locationQuery ?? "") &&
        prev.equipmentType === (equipmentTypeQuery ?? "") &&
        prev.equipmentCategoryId === (equipmentCategoryIdQuery ?? "") &&
        ((!prev.dateRange?.from && !dateFromQuery) ||
          (prev.dateRange?.from &&
            dateFromQuery &&
            format(prev.dateRange.from, "yyyy-MM-dd") === dateFromQuery)) &&
        ((!prev.dateRange?.to && !dateToQuery) ||
          (prev.dateRange?.to &&
            dateToQuery &&
            format(prev.dateRange.to, "yyyy-MM-dd") === dateToQuery))
      ) {
        return prev;
      }

      const parsedFrom =
        dateFromQuery && !Number.isNaN(Date.parse(dateFromQuery))
          ? new Date(dateFromQuery)
          : undefined;
      const parsedTo =
        dateToQuery && !Number.isNaN(Date.parse(dateToQuery))
          ? new Date(dateToQuery)
          : undefined;

      return {
        ...prev,
        search: searchQuery ?? "",
        location: locationQuery ?? "",
        dateRange:
          parsedFrom || parsedTo
            ? {
                from: parsedFrom,
                to: parsedTo,
              }
            : undefined,
        equipmentType: equipmentTypeQuery || undefined,
        equipmentCategoryId: equipmentCategoryIdQuery || undefined,
      };
    });
  }, [
    searchQuery,
    locationQuery,
    dateFromQuery,
    dateToQuery,
    equipmentTypeQuery,
    equipmentCategoryIdQuery,
  ]);

  // Note: URL params are only updated via handleSubmitSearch (line 166-171)
  // This prevents circular dependency issues where debounced values overwrite
  // incoming URL params from navigation (e.g., from HomePage search)

  // Sync filterValues with nuqs params (price, conditions, verified)
  useEffect(() => {
    const nextPriceRange: [number, number] = [
      priceMin ?? DEFAULT_PRICE_MIN,
      priceMax ?? DEFAULT_PRICE_MAX,
    ];
    const nextConditions = conditionsParam ?? [];
    const nextVerified = verifiedParam ?? false;

    setFilterValues((prev) => {
      const priceUnchanged =
        prev.priceRange[0] === nextPriceRange[0] &&
        prev.priceRange[1] === nextPriceRange[1];
      const conditionsUnchanged =
        prev.conditions.length === nextConditions.length &&
        prev.conditions.every(
          (condition, index) => condition === nextConditions[index]
        );
      if (priceUnchanged && conditionsUnchanged && prev.verified === nextVerified)
        return prev;

      return {
        ...prev,
        priceRange: nextPriceRange,
        conditions: nextConditions,
        verified: nextVerified,
      };
    });
  }, [priceMin, priceMax, conditionsParam, verifiedParam]);

  // Login modal state - managed via nuqs
  const [loginOpen, setLoginOpen] = useQueryState("login", {
    defaultValue: false,
    parse: (value) => value === "true",
    serialize: (value) => (value ? "true" : null),
    history: "replace",
  });

  const handleLoginOpenChange = (open: boolean) => {
    void setLoginOpen(open);
  };

  // Signup modal state - managed via nuqs
  const [signupOpen, setSignupOpen] = useQueryState("signup", {
    defaultValue: false,
    parse: (value) => value === "true",
    serialize: (value) => (value ? "true" : null),
    history: "replace",
  });

  const [signupRole, setSignupRole] = useQueryState(
    "role",
    parseAsStringEnum<"renter" | "owner">(["renter", "owner"]).withOptions({
      history: "replace",
    })
  );

  const handleSignupOpenChange = (open: boolean) => {
    void setSignupOpen(open);
    if (!open) {
      void setSignupRole(null);
    }
  };

  const handleSubmitSearch = (filters: SearchBarFilters) => {
    setSearchFilters(filters);
    // Update URL params with submitted search filters
    void setSearchQuery(filters.search || null);
    void setLocationQuery(filters.location || null);
    void setEquipmentTypeQuery(filters.equipmentType || null);
    void setEquipmentCategoryIdQuery(filters.equipmentCategoryId || null);
    const from = filters.dateRange?.from
      ? format(filters.dateRange.from, "yyyy-MM-dd")
      : null;
    const to = filters.dateRange?.to
      ? format(filters.dateRange.to, "yyyy-MM-dd")
      : null;
    void setDateFromQuery(from);
    void setDateToQuery(to);
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

    if (debouncedFilters.equipmentCategoryId) {
      filters.categoryId = debouncedFilters.equipmentCategoryId;
    }
    if (debouncedFilters.equipmentType) {
      filters.equipmentTypeName = debouncedFilters.equipmentType;
    }

    if (debouncedFilters.dateRange?.from) {
      filters.dateFrom = format(debouncedFilters.dateRange.from, "yyyy-MM-dd");
    }
    if (debouncedFilters.dateRange?.to) {
      filters.dateTo = format(debouncedFilters.dateRange.to, "yyyy-MM-dd");
    }

    const mergedConditions = new Set<Listing["condition"]>();

    if (filterValues.conditions.length > 0) {
      filterValues.conditions.forEach((condition) =>
        mergedConditions.add(condition)
      );
    }

    if (searchFilters.condition && searchFilters.condition !== "all") {
      mergedConditions.add(searchFilters.condition);
    }

    if (mergedConditions.size > 0) {
      filters.conditions = Array.from(mergedConditions).sort();
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

    if (filterValues.verified) {
      filters.verified = true;
    }

    return filters;
  }, [
    debouncedFilters,
    searchFilters.condition,
    categoryId,
    filterValues.conditions,
    filterValues.priceRange,
    filterValues.verified,
  ]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["listings", effectiveFilters],
    queryFn: ({ signal }) => fetchListings(effectiveFilters, signal),
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

  const handleSelectListing = useCallback((listing: Listing) => {
    setSelectedListingId(listing.id);
  }, []);

  useEffect(() => {
    if (!selectedListingId || isMobile) return;
    const el = listItemRefs.current.get(selectedListingId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedListingId, isMobile]);

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

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilterValues(newFilters);
    // Sync price range changes to URL
    const [min, max] = newFilters.priceRange;
    void setPriceMin(min !== DEFAULT_PRICE_MIN ? min : null);
    void setPriceMax(max !== DEFAULT_PRICE_MAX ? max : null);
    void setConditionsParam(newFilters.conditions);
    void setVerifiedParam(newFilters.verified);
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
      equipmentCategoryId: undefined,
    });
    setFilterValues({
      priceRange: [DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX],
      conditions: [],
      verified: false,
    });

    // Clear all URL params via nuqs
    void setSearchQuery(null);
    void setLocationQuery(null);
    void setDateFromQuery(null);
    void setDateToQuery(null);
    void setEquipmentTypeQuery(null);
    void setEquipmentCategoryIdQuery(null);
    void setCategoryId("all");
    void setPriceMin(null);
    void setPriceMax(null);
    void setConditionsParam(null);
    void setVerifiedParam(null);
  };

  const hasResults = !!data && data.length > 0;

  const renderListingsList = () => {
    if (isError) {
      return (
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
      );
    }

    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (!hasResults) {
      return (
        <EmptyState
          filters={effectiveFilters}
          onClearFilters={handleClearFilters}
        />
      );
    }

    return (
      <div className="space-y-4 pb-6">
        {sortedListings.map((item) => (
          <div
            key={item.id}
            ref={(el) => {
              listItemRefs.current.set(item.id, el);
            }}
          >
            <ListingCard
              listing={item}
              onOpen={(listing) => {
                handleSelectListing(listing);
                handleOpenListing(listing);
              }}
              className={cn(
                item.id === selectedListingId ? "ring-2 ring-primary" : ""
              )}
            />
          </div>
        ))}
      </div>
    );
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
            {tNav("pages.home")}
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-foreground">{tNav("menu.browse_equipment")}</span>
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
              {t("browse.items_count", { count: data?.length ?? 0 })}
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
              onChange={handleFilterChange}
              resultCount={data?.length ?? 0}
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

        {/* Results: map-first */}
        <div className="mt-6">
          {isMobile ? (
            <div className="relative -mx-4 sm:-mx-6 lg:mx-0">
              <div className="relative h-[calc(100dvh-260px)] min-h-[420px] border-y border-border lg:border rounded-none lg:rounded-lg overflow-hidden">
                <MapView
                  listings={sortedListings}
                  selectedListingId={selectedListingId}
                  onSelectListing={handleSelectListing}
                  onOpenListing={handleOpenListing}
                />
              </div>

              {(hasResults || isLoading || isError) ? (
                <div
                  className={cn(
                    "fixed inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur border-t border-border rounded-t-2xl shadow-lg flex flex-col transition-[height] duration-200",
                    mobileSheetExpanded ? "h-[60dvh]" : "h-[28dvh]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setMobileSheetExpanded((v) => !v)}
                    className="flex-shrink-0 pt-3 pb-2"
                    aria-label="Toggle listings panel"
                  >
                    <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto" />
                    <div className="text-center mt-2 text-sm font-semibold">
                      {t("browse.items_count", { count: data?.length ?? 0 })}
                    </div>
                  </button>

                  <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 overscroll-contain">
                    {renderListingsList()}
                  </div>
                </div>
              ) : (
                <div className="mt-4 px-4">
                  {renderListingsList()}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_420px] lg:h-[75vh]">
              <div className="h-[60vh] lg:h-full rounded-lg overflow-hidden border border-border">
                <MapView
                  listings={sortedListings}
                  selectedListingId={selectedListingId}
                  onSelectListing={handleSelectListing}
                  onOpenListing={handleOpenListing}
                />
              </div>
              <div className="h-[60vh] lg:h-full overflow-y-auto pr-1">
                {renderListingsList()}
              </div>
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
