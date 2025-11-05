import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Crosshair,
} from "lucide-react";
import { format, startOfDay, addDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { SearchBarFilters } from "@/types/search";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { createMinWidthQuery } from "@/config/breakpoints";
import { useToast } from "@/hooks/useToast";
import { reverseGeocode } from "@/features/location/geocoding";
import {
  getCurrentPosition,
  checkGeolocationSupport,
  type GeolocationErrorCode
} from "@/features/location/useGeolocation";
import { ToastAction } from "@/components/ui/toast";
import { useAddressAutocomplete } from "@/features/location/useAddressAutocomplete";

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

type SectionKey = "where" | "when" | "what";

const MOBILE_SECTIONS: Array<{
  key: SectionKey;
  label: string;
  icon: typeof MapPin;
}> = [
  { key: "where", label: "Where", icon: MapPin },
  { key: "when", label: "When", icon: CalendarIcon },
  { key: "what", label: "What", icon: Package },
];

const SearchBarPopover = ({ value, onChange, onSubmit }: Props) => {
  const isDesktop = useMediaQuery(createMinWidthQuery("md"));
  const [locationOpen, setLocationOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("where");
  const [isSelectingDates, setIsSelectingDates] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();
  const addressAutocomplete = useAddressAutocomplete({ limit: 10, minLength: 2, debounceMs: 100 });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (value.location) count++;
    if (value.dateRange?.from) count++;
    if (value.equipmentType) count++;
    return count;
  }, [value.location, value.dateRange, value.equipmentType]);

  const quickDateRanges = useMemo(() => {
    // Current date normalized to start of day
    const today = startOfDay(new Date());
    // Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = today.getDay();

    // Compute days until next Saturday (including today if today is Saturday)
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    // This weekend: Saturday and Sunday
    const thisWeekendStart = addDays(today, daysUntilSaturday);
    const thisWeekendEnd = addDays(thisWeekendStart, 1);

    // Next weekend: exactly one week later (Saturday and Sunday)
    const nextWeekendStart = addDays(thisWeekendStart, 7);
    const nextWeekendEnd = addDays(nextWeekendStart, 1);

    // Compute days until next Monday (if today is Monday, treat as "next" week)
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
    // Next week: Monday through Friday (Monday-as-today counts as "next" week)
    const nextWeekStart = addDays(
      today,
      daysUntilMonday === 0 ? 7 : daysUntilMonday
    );
    // End of next work week (Friday)
    const nextWeekEnd = addDays(nextWeekStart, 4);

    return [
      {
        label: "This weekend",
        range: {
          from: thisWeekendStart,
          to: thisWeekendEnd,
        } satisfies DateRange,
      },
      {
        label: "Next weekend",
        range: {
          from: nextWeekendStart,
          to: nextWeekendEnd,
        } satisfies DateRange,
      },
      {
        label: "Next week",
        range: { from: nextWeekStart, to: nextWeekEnd } satisfies DateRange,
      },
    ];
  }, []);

  const handleLocationSelect = (location: string) => {
    onChange({ ...value, location });
    setLocationOpen(false);
    setActiveSection("when");
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onChange({ ...value, dateRange: undefined });
      setIsSelectingDates(false);
      return;
    }

    if (!isSelectingDates) {
      setIsSelectingDates(true);
      onChange({ ...value, dateRange: { from: range.from, to: undefined } });
      return;
    }

    // Handle change start date mid-selection: user is selecting dates but picked a new from date,
    // so reset to a one-sided range (to: undefined) and keep selection mode active
    if (!range.to) {
      onChange({ ...value, dateRange: { from: range.from, to: undefined } });
      return;
    }

    setIsSelectingDates(false);
    onChange({ ...value, dateRange: range });
    setActiveSection("what");
  };

  const handlePresetDateSelect = (range: DateRange) => {
    onChange({ ...value, dateRange: range });
    setIsSelectingDates(false);
    setActiveSection("what");
  };

  const handleEquipmentSelect = (type: string) => {
    onChange({ ...value, equipmentType: type });
    setEquipmentOpen(false);
    setSheetOpen(false);
    setActiveSection("where");
  };

  const handleSearch = () => {
    onSubmit();
    setSheetOpen(false);
    setActiveSection("where");
  };

  const handleClearAll = () => {
    onChange({
      ...value,
      location: "",
      dateRange: undefined,
      equipmentType: undefined,
    });
    setActiveSection("where");
    setIsSelectingDates(false);
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    setSheetOpen(nextOpen);
    if (!nextOpen) {
      setActiveSection("where");
      setIsSelectingDates(false);
    } else {
      addressAutocomplete.setQuery('');
    }
  };

  const handleUseCurrentLocation = async () => {
    if (isLocating) return;

    setIsLocating(true);

    try {
      const { lat, lon } = await getCurrentPosition();
      const controller = new AbortController();
      const label = await reverseGeocode(lat, lon, {
        signal: controller.signal,
        language: navigator.language || "en",
      });
      const place = label ?? "Near you";

      // Use existing location flow
      handleLocationSelect(place);

      toast({
        title: "Location set",
        description: "Using your current location.",
      });
    } catch (error) {
      const errorCode = (error as any)?.code as GeolocationErrorCode;
      const errorMessage = (error as any)?.message;

      switch (errorCode) {
        case "denied":
          toast({
            title: "Location permission denied",
            description: errorMessage || "You've previously denied location access. Click the location icon (📍) in your browser's address bar to allow access, then try again.",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Try again"
                onClick={() => handleUseCurrentLocation()}
              >
                Try Again
              </ToastAction>
            ),
          });
          break;
        case "timeout":
          toast({
            title: "Location timeout",
            description: errorMessage || "Couldn't get your location. Check signal and try again.",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Try again"
                onClick={() => handleUseCurrentLocation()}
              >
                Try Again
              </ToastAction>
            ),
          });
          break;
        case "insecure_origin": {
          const geoSupport = checkGeolocationSupport();
          toast({
            title: "Location unavailable",
            description: `Location requires HTTPS or localhost. Current: ${geoSupport.protocol}//${geoSupport.hostname}`,
            variant: "destructive",
          });
          break;
        }
        case "unavailable":
          toast({
            title: "Location unavailable",
            description: errorMessage || "Location isn't available right now. Try entering a city.",
            variant: "destructive",
          });
          break;
        default:
          toast({
            title: "Location error",
            description: errorMessage || "Something went wrong. Try entering a city manually.",
            variant: "destructive",
          });
      }
    } finally {
      setIsLocating(false);
    }
  };

  const getSearchSummary = () => {
    const parts: string[] = [];
    if (value.location) parts.push(value.location);
    if (value.dateRange?.from) {
      if (value.dateRange.to) {
        parts.push(
          `${format(value.dateRange.from, "MMM d")} - ${format(
            value.dateRange.to,
            "MMM d"
          )}`
        );
      } else {
        parts.push(format(value.dateRange.from, "MMM d"));
      }
    }
    if (value.equipmentType) parts.push(value.equipmentType);
    return parts.length > 0 ? parts.join(" · ") : "Search equipment";
  };

  // Mobile version with Sheet
  if (!isDesktop) {
    return (
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-16 rounded-full justify-between px-5 py-4 text-left font-normal shadow-sm border-muted"
            aria-label="Search equipment"
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Search
                </span>
                <span className="text-sm font-semibold text-foreground truncate">
                  {value.location || "Where to?"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {getSearchSummary()}
                </span>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="ml-3 h-9 w-9 rounded-full p-0 flex items-center justify-center text-xs shrink-0"
            >
              {activeFilterCount > 0 ? (
                activeFilterCount
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Badge>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="px-6 pt-6 pb-4 text-left">
              <SheetTitle className="text-lg font-semibold">
                Plan your next outing
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                Browse gear by destination, dates, and activity.
              </p>
            </SheetHeader>
            <div className="px-6 pb-4">
              <div className="flex items-center rounded-full bg-muted p-1">
                {MOBILE_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => {
                        setActiveSection(section.key);
                        if (section.key === "where") {
                          addressAutocomplete.setQuery('');
                        }
                      }}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground"
                      )}
                      aria-pressed={isActive}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {activeSection === "where" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Where do you need gear?
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Search cities or choose a popular destination.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    aria-label="Use current location"
                    aria-busy={isLocating}
                  >
                    <Crosshair className="mr-2 h-4 w-4" />
                    {isLocating
                      ? "Detecting your location..."
                      : "Use current location"}
                  </Button>
                  <Command className="rounded-2xl border" shouldFilter={false}>
                    <CommandInput 
                      placeholder="Try Yosemite National Park" 
                      value={addressAutocomplete.query} 
                      onValueChange={addressAutocomplete.setQuery}
                    />
                    <CommandList aria-busy={addressAutocomplete.loading}>
                      <CommandEmpty>
                        {addressAutocomplete.loading
                          ? 'Searching...'
                          : addressAutocomplete.query.trim().length === 0
                            ? 'Start typing to search locations.'
                            : addressAutocomplete.error
                              ? `Error: ${addressAutocomplete.error}`
                              : 'No locations found.'}
                      </CommandEmpty>
                      {addressAutocomplete.query.trim().length >= 2 && addressAutocomplete.suggestions.length > 0 && (
                        <CommandGroup heading="Suggestions">
                          {addressAutocomplete.suggestions.map((s) => (
                            <CommandItem
                              key={s.id}
                              onSelect={() => {
                                handleLocationSelect(s.label);
                                addressAutocomplete.setQuery('');
                              }}
                              className="cursor-pointer"
                            >
                              <MapPin className="mr-2 h-4 w-4" />
                              {s.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      <CommandGroup heading="Popular">
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
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_LOCATIONS.map((loc) => (
                      <Button
                        key={`${loc}-chip`}
                        variant={
                          value.location === loc ? "default" : "secondary"
                        }
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleLocationSelect(loc)}
                      >
                        {loc}
                      </Button>
                    ))}
                  </div>
                  {value.location && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-full px-3 py-1 text-xs"
                      >
                        {value.location}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onChange({ ...value, location: "" })}
                        className="h-7 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "when" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      When will you pick it up?
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Add a flexible range to see availability.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickDateRanges.map((option) => (
                      <Button
                        key={option.label}
                        variant={
                          value.dateRange?.from &&
                          value.dateRange.to &&
                          startOfDay(value.dateRange.from).getTime() ===
                            option.range.from?.getTime() &&
                          startOfDay(value.dateRange.to).getTime() ===
                            option.range.to?.getTime()
                            ? "default"
                            : "secondary"
                        }
                        size="sm"
                        className="rounded-full"
                        onClick={() => handlePresetDateSelect(option.range)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <div className="rounded-2xl border p-4">
                    <Calendar
                      mode="range"
                      selected={value.dateRange}
                      onSelect={handleDateSelect}
                      numberOfMonths={1}
                      disabled={(date) =>
                        startOfDay(date) < startOfDay(new Date())
                      }
                    />
                  </div>
                  {value.dateRange?.from && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-full px-3 py-1 text-xs"
                      >
                        {value.dateRange.to
                          ? `${format(
                              value.dateRange.from,
                              "MMM d"
                            )} - ${format(value.dateRange.to, "MMM d")}`
                          : format(value.dateRange.from, "MMM d")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onChange({ ...value, dateRange: undefined })
                        }
                        className="h-7 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "what" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      What are you planning?
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Choose the gear category that fits your trip.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {EQUIPMENT_TYPES.map((type) => (
                      <Button
                        key={type}
                        variant={
                          value.equipmentType === type ? "default" : "outline"
                        }
                        className="h-20 flex flex-col items-start justify-between rounded-2xl border"
                        onClick={() => handleEquipmentSelect(type)}
                        aria-label={`Select ${type}`}
                      >
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">{type}</span>
                      </Button>
                    ))}
                  </div>
                  {value.equipmentType && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-full px-3 py-1 text-xs"
                      >
                        {value.equipmentType}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onChange({ ...value, equipmentType: undefined })
                        }
                        className="h-7 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <SheetFooter className="mt-auto gap-3 px-6 pb-6 pt-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
              <Button
                variant="ghost"
                onClick={handleClearAll}
                className="flex-1"
              >
                Clear all
              </Button>
              <Button onClick={handleSearch} className="flex-1">
                Search
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop version with Popover layout
  return (
    <div className="w-full rounded-full border border-input bg-card shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-stretch divide-x divide-border">
        {/* Location Popover */}
        <Popover
          open={locationOpen}
          onOpenChange={(open) => {
            setLocationOpen(open);
            if (open) addressAutocomplete.setQuery('');
          }}
        >
          <PopoverTrigger asChild>
            <button
              className="relative px-6 py-4 text-left hover:bg-muted/50 transition-colors rounded-l-full focus:outline-none focus:ring-2 focus:ring-ring focus:z-10"
              aria-label="Select location"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground">
                    Where
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {value.location || "Search destinations"}
                  </div>
                </div>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <Button
                variant="ghost"
                className="w-full justify-start h-9"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                aria-label="Use current location"
                aria-busy={isLocating}
              >
                <Crosshair className="mr-2 h-4 w-4" />
                {isLocating
                  ? "Detecting your location..."
                  : "Use current location"}
              </Button>
            </div>
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Search locations..." 
                value={addressAutocomplete.query} 
                onValueChange={addressAutocomplete.setQuery}
              />
              <CommandList aria-busy={addressAutocomplete.loading}>
                <CommandEmpty>
                  {addressAutocomplete.loading
                    ? 'Searching...'
                    : addressAutocomplete.query.trim().length === 0
                      ? 'Start typing to search locations.'
                      : addressAutocomplete.error
                        ? `Error: ${addressAutocomplete.error}`
                        : 'No locations found.'}
                </CommandEmpty>
                {addressAutocomplete.query.trim().length >= 2 && addressAutocomplete.suggestions.length > 0 && (
                  <CommandGroup heading="Suggestions">
                    {addressAutocomplete.suggestions.map((s) => (
                      <CommandItem
                        key={s.id}
                        onSelect={() => {
                          handleLocationSelect(s.label);
                          addressAutocomplete.setQuery('');
                        }}
                        className="cursor-pointer"
                      >
                        <MapPin className="mr-2 h-4 w-4" />
                        {s.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
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
              className="relative px-6 py-4 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:z-10"
              aria-label="Select dates"
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground">
                    When
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
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
              className="relative px-6 py-4 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:z-10"
              aria-label="Select equipment type"
            >
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground">
                    What
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
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
                    aria-label={`Select ${type}`}
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
        <div className="flex items-center justify-center p-2 rounded-r-full">
          <Button
            onClick={handleSearch}
            className="h-12 w-12 rounded-full"
            size="icon"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchBarPopover;
