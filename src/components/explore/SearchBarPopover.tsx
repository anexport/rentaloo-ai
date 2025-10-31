import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  MapPin,
  Search,
  Package,
} from "lucide-react";
import { format, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { SearchBarFilters } from "@/types/search";

type Props = {
  value: SearchBarFilters;
  onChange: (next: SearchBarFilters) => void;
  onSubmit: () => void;
};

const POPULAR_LOCATIONS = [
  "San Francisco, CA",
  "Los Angeles, CA",
  "Seattle, WA",
  "Portland, OR",
  "Denver, CO",
  "Austin, TX",
];

const EQUIPMENT_TYPES = [
  "Camping",
  "Hiking",
  "Climbing",
  "Water Sports",
  "Winter Sports",
  "Cycling",
];

const SearchBarPopover = ({ value, onChange, onSubmit }: Props) => {
  const [locationOpen, setLocationOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);

  const handleLocationSelect = (location: string) => {
    onChange({ ...value, location });
    setLocationOpen(false);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    onChange({ ...value, dateRange: range });
  };

  const handleEquipmentSelect = (type: string) => {
    onChange({ ...value, equipmentType: type });
    setEquipmentOpen(false);
  };

  const handleSearch = () => {
    onSubmit();
  };

  return (
    <div className="w-full rounded-full border border-input bg-card shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] items-stretch divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Location Popover */}
        <Popover open={locationOpen} onOpenChange={setLocationOpen}>
          <PopoverTrigger asChild>
            <button
              className="relative px-3 py-2 md:px-6 md:py-4 text-left hover:bg-muted/50 transition-colors rounded-t-full md:rounded-l-full md:rounded-t-none focus:outline-none focus:ring-2 focus:ring-ring focus:z-10"
              aria-label="Select location"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <MapPin className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] md:text-xs font-semibold text-foreground">
                    Where
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground truncate">
                    {value.location || "Search destinations"}
                  </div>
                </div>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search locations..." />
              <CommandList>
                <CommandEmpty>No locations found.</CommandEmpty>
                <CommandGroup heading="Popular destinations">
                  {POPULAR_LOCATIONS.map((loc) => (
                    <CommandItem
                      key={loc}
                      onSelect={() => handleLocationSelect(loc)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {loc}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Dates Popover */}
        <Popover open={datesOpen} onOpenChange={setDatesOpen}>
          <PopoverTrigger asChild>
            <button
              className="relative px-3 py-2 md:px-6 md:py-4 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:z-10"
              aria-label="Select dates"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] md:text-xs font-semibold text-foreground">
                    When
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground truncate">
                    {value.dateRange?.from ? (
                      value.dateRange.to ? (
                        <>
                          {format(value.dateRange.from, "MMM d")} -{" "}
                          {format(value.dateRange.to, "MMM d")}
                        </>
                      ) : (
                        format(value.dateRange.from, "MMM d")
                      )
                    ) : (
                      "Add dates"
                    )}
                  </div>
                </div>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4">
              <Calendar
                mode="range"
                selected={value.dateRange}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                disabled={(date) => startOfDay(date) < startOfDay(new Date())}
              />
              <div className="mt-4 flex justify-between items-center border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...value, dateRange: undefined })}
                >
                  Clear dates
                </Button>
                <Button size="sm" onClick={() => setDatesOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Equipment Type Popover */}
        <Popover open={equipmentOpen} onOpenChange={setEquipmentOpen}>
          <PopoverTrigger asChild>
            <button
              className="relative px-3 py-2 md:px-6 md:py-4 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:z-10"
              aria-label="Select equipment type"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <Package className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] md:text-xs font-semibold text-foreground">
                    What
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground truncate">
                    {value.equipmentType || "Any equipment"}
                  </div>
                </div>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <div className="space-y-2">
              <div className="text-sm font-semibold mb-3">Equipment type</div>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant={
                      value.equipmentType === type ? "default" : "outline"
                    }
                    className="cursor-pointer justify-center py-2 hover:bg-primary/10"
                    onClick={() => handleEquipmentSelect(type)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleEquipmentSelect(type);
                      }
                    }}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange({ ...value, equipmentType: undefined })
                  }
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Search Button */}
        <div className="flex items-center justify-center p-2 md:p-2 rounded-b-full md:rounded-r-full md:rounded-b-none">
          <Button
            onClick={handleSearch}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full"
            size="icon"
            aria-label="Search"
          >
            <Search className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchBarPopover;
