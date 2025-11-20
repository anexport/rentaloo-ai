import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Filter, Package } from "lucide-react";
import type { ListingsFilters } from "@/components/equipment/services/listings";
import { DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX } from "@/config/pagination";

type Props = {
  filters: ListingsFilters;
  onClearFilters: () => void;
};

const EmptyState = ({ filters, onClearFilters }: Props) => {
  const hasActiveFilters =
    filters.search ||
    filters.location ||
    (filters.categoryId && filters.categoryId !== "all") ||
    (typeof filters.priceMin === "number" && filters.priceMin > DEFAULT_PRICE_MIN) ||
    (typeof filters.priceMax === "number" && filters.priceMax < DEFAULT_PRICE_MAX) ||
    (filters.condition && filters.condition !== "all");

  return (
    <div className="py-16 text-center">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <Search className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h3 className="text-2xl font-bold">No equipment found</h3>
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? "We couldn't find any equipment matching your search criteria. Try adjusting your filters or explore popular categories below."
              : "No equipment is currently available. Be the first to list your gear!"}
          </p>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Active filters:</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {filters.search && (
                <Badge variant="secondary" className="px-3 py-1">
                  <Search className="h-3 w-3 mr-1" />
                  Search: {filters.search}
                </Badge>
              )}
              {filters.location && (
                <Badge variant="secondary" className="px-3 py-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {filters.location}
                </Badge>
              )}
              {filters.categoryId && filters.categoryId !== "all" && (
                <Badge variant="secondary" className="px-3 py-1">
                  <Package className="h-3 w-3 mr-1" />
                  Category
                </Badge>
              )}
              {((typeof filters.priceMin === "number" && filters.priceMin > DEFAULT_PRICE_MIN) ||
                (typeof filters.priceMax === "number" && filters.priceMax < DEFAULT_PRICE_MAX)) && (
                <Badge variant="secondary" className="px-3 py-1">
                  <Filter className="h-3 w-3 mr-1" />
                  Price: ${filters.priceMin ?? DEFAULT_PRICE_MIN} - ${filters.priceMax ?? DEFAULT_PRICE_MAX}
                </Badge>
              )}
              {filters.condition && filters.condition !== "all" && (
                <Badge variant="secondary" className="px-3 py-1">
                  <Filter className="h-3 w-3 mr-1" />
                  {filters.condition}
                </Badge>
              )}
            </div>
            <Button onClick={onClearFilters} variant="outline">
              Clear all filters
            </Button>
          </div>
        )}

        {/* Suggestions */}
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or browse all available equipment
          </p>
        </div>

        {/* Browse all CTA */}
        <div className="pt-4">
          <Button
            size="lg"
            onClick={onClearFilters}
            variant="default"
            className="min-w-[200px]"
          >
            Browse all equipment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
