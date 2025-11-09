import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SearchBarPopover from "@/components/explore/SearchBarPopover";
import type { SearchBarFilters } from "@/types/search";
import CategoryBar from "@/components/explore/CategoryBar";
import CategoryBarSkeleton from "@/components/explore/CategoryBarSkeleton";
import ListingCard from "@/components/equipment/ListingCard";
import EquipmentDetailDialog from "@/components/equipment/detail/EquipmentDetailDialog";
import ListingCardSkeleton from "@/components/equipment/ListingCardSkeleton";
import FiltersSheet, {
  type FilterValues,
} from "@/components/explore/FiltersSheet";
import ExploreHeader from "@/components/layout/ExploreHeader";
import LoginModal from "@/components/auth/LoginModal";
import {
  fetchListings,
  type ListingsFilters,
} from "@/components/equipment/services/listings";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const ExplorePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categoryId, setCategoryId] = useState<string>("all");
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

  // Close modal and redirect authenticated users after OAuth
  useEffect(() => {
    if (user && loginOpen) {
      // Close modal by removing login param
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("login");
      setSearchParams(newParams, { replace: true });
      // Redirect based on user role
      const role = user.user_metadata?.role;
      if (role === "renter") {
        void navigate("/renter/dashboard");
      } else if (role === "owner") {
        void navigate("/owner/dashboard");
      }
    }
  }, [user, loginOpen, navigate, searchParams, setSearchParams]);

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

  return (
    <div className="min-h-screen bg-background">
      <ExploreHeader onLoginClick={() => handleLoginOpenChange(true)} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Search */}
        <div className="mb-6">
          <SearchBarPopover
            value={searchFilters}
            onChange={setSearchFilters}
            onSubmit={handleSubmitSearch}
          />
        </div>

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

        {/* Filters row */}
        <div className="flex items-center justify-between mt-4 mb-3">
          <p className="text-sm text-muted-foreground">
            {isFetching
              ? "Updating results..."
              : `${data?.length ?? 0} results`}
          </p>
          <FiltersSheet
            value={filterValues}
            onChange={setFilterValues}
            resultCount={data?.length ?? 0}
            activeFilterCount={activeFilterCount}
          />
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
            <div className="text-center py-10">
              <div className="text-muted-foreground">
                No equipment found. Try adjusting your search.
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.map((item) => (
                <ListingCard
                  key={item.id}
                  listing={item}
                  onOpen={(listing) => {
                    setSelectedListingId(listing.id);
                    setDetailsOpen(true);
                  }}
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
      </main>
    </div>
  );
};

export default ExplorePage;
