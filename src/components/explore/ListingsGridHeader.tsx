import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Map, Grid3x3 } from "lucide-react";

export type SortOption =
  | "recommended"
  | "price-low"
  | "price-high"
  | "newest"
  | "rating";

type Props = {
  resultCount: number;
  location?: string;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode?: "grid" | "map";
  onViewModeChange?: (mode: "grid" | "map") => void;
};

const sortOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
  { value: "rating", label: "Highest Rated" },
];

const ListingsGridHeader = ({
  resultCount,
  location,
  sortBy,
  onSortChange,
  viewMode = "grid",
  onViewModeChange,
}: Props) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
      {/* Left: Result count and location */}
      <div>
        <h3 className="text-lg font-semibold">
          {resultCount} {resultCount === 1 ? "item" : "items"}
          {location && (
            <span className="text-muted-foreground font-normal">
              {" "}
              in {location}
            </span>
          )}
        </h3>
        <p className="text-sm text-muted-foreground">
          Available for rent near you
        </p>
      </div>

      {/* Right: Sort and view controls */}
      <div className="flex items-center gap-3">
        {/* View mode toggle (optional) */}
        {onViewModeChange && (
          <div className="hidden md:flex items-center gap-1 p-1 rounded-md border border-border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("grid")}
              className="h-8 px-3"
              aria-label="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "map" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("map")}
              className="h-8 px-3"
              aria-label="Map view"
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Sort dropdown */}
        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as SortOption)}
        >
          <SelectTrigger className="w-[180px]" aria-label="Sort by">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ListingsGridHeader;
