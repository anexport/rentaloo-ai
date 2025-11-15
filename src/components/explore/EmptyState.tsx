import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Filter, Package } from "lucide-react";
import type { ListingsFilters } from "@/components/equipment/services/listings";

type Props = {
  filters: ListingsFilters;
  onClearFilters: () => void;
  onCategorySelect: (categoryId: string) => void;
};

const popularCategories = [
  { id: "camping", name: "Camping", icon: "⛺" },
  { id: "skiing", name: "Skiing", icon: "🎿" },
  { id: "hiking", name: "Hiking", icon: "🥾" },
  { id: "photography", name: "Photography", icon: "📷" },
];

const EmptyState = ({ filters, onClearFilters, onCategorySelect }: Props) => {
  const hasActiveFilters =
    filters.search ||
    filters.location ||
    (filters.categoryId && filters.categoryId !== "all") ||
    filters.priceMin ||
    filters.priceMax ||
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
              {(filters.priceMin || filters.priceMax) && (
                <Badge variant="secondary" className="px-3 py-1">
                  <Filter className="h-3 w-3 mr-1" />
                  Price: ${filters.priceMin || 0} - ${filters.priceMax || 500}
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
          <p className="text-sm font-medium">Try browsing these categories:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {popularCategories.map((category) => (
              <Card
                key={category.id}
                className="cursor-pointer hover:shadow-md hover:border-primary transition-all"
                onClick={() => onCategorySelect(category.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onCategorySelect(category.id);
                  }
                }}
              >
                <CardContent className="p-4 text-center space-y-2">
                  <div className="text-3xl">{category.icon}</div>
                  <div className="text-sm font-medium">{category.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
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
