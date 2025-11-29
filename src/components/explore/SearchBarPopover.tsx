import { useState, useMemo, useEffect } from "react";
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
  X,
  Wrench,
  Loader2,
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
  type GeolocationErrorCode,
} from "@/features/location/useGeolocation";
import { ToastAction } from "@/components/ui/toast";
import { useAddressAutocomplete } from "@/features/location/useAddressAutocomplete";
import { useEquipmentAutocomplete } from "@/hooks/useEquipmentAutocomplete";
import type { EquipmentSuggestion } from "@/components/equipment/services/autocomplete";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { highlightMatchingText } from "@/lib/highlightText";

type Props = {
  value: SearchBarFilters;
  onChange: (next: SearchBarFilters) => void;
  onSubmit: () => void;
};

const FALLBACK_EQUIPMENT_TYPES = [
  "Camping",
  "Hiking",
  "Climbing",
  "Water Sports",
  "Winter Sports",
  "Cycling",
];

const POPULAR_LOCATIONS = [
  "San Francisco, CA",
  "Los Angeles, CA",
  "Seattle, WA",
  "Portland, OR",
  "Denver, CO",
  "Austin, TX",
];

const POPULAR_CATEGORIES = [
  "Camping",
  "Hiking",
  "Cycling",
  "Water Sports",
  "Winter Sports",
];

const RECENT_SEARCHES_KEY = "rentaloo_recent_equipment_searches";
const MAX_RECENT_SEARCHES = 5;

// Helper function to detect macOS using modern API with fallback
const isMacOS = (): boolean => {
  if (typeof navigator === "undefined") return false;

  // Try modern User-Agent Client Hints API first
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ?? navigator.platform;

  return platform.toLowerCase().includes("mac");
};

// Helper functions for recent searches
const getRecentSearches = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRecentSearch = (search: string) => {
  try {
    const recent = getRecentSearches();
    // Remove if already exists (to move it to front)
    const filtered = recent.filter((s) => s !== search);
    // Add to front and limit to MAX
    const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent search:", error);
  }
};

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
  type Category = Database["public"]["Tables"]["categories"]["Row"];

  const isDesktop = useMediaQuery(createMinWidthQuery("md"));
  const [locationOpen, setLocationOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("where");
  const [isSelectingDates, setIsSelectingDates] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { toast } = useToast();
  const addressAutocomplete = useAddressAutocomplete({
    limit: 10,
    minLength: 2,
    debounceMs: 100,
  });

  const equipmentAutocomplete = useEquipmentAutocomplete({
    minLength: 1,
    debounceMs: 300,
    categoryLimit: 5,
    equipmentLimit: 10,
  });

  const categorySuggestions = useMemo(
    () =>
      equipmentAutocomplete.suggestions.filter((s) => s.type === "category"),
    [equipmentAutocomplete.suggestions]
  );

  const equipmentSuggestions = useMemo(
    () =>
      equipmentAutocomplete.suggestions.filter((s) => s.type === "equipment"),
    [equipmentAutocomplete.suggestions]
  );

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

  const equipmentOptions = useMemo(() => {
    return categories.length > 0
      ? categories.map((cat) => ({ id: cat.id, name: cat.name }))
      : FALLBACK_EQUIPMENT_TYPES.map((name, idx) => ({
          id: `fallback-${idx}`,
          name,
        }));
  }, [categories]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .is("parent_id", null)
          .order("name")
          .abortSignal(controller.signal);

        if (error) {
          if (!controller.signal.aborted) {
            console.error("Error loading categories", error);
            toast({
              title: "Couldn't load categories",
              description: "Please try again shortly.",
              variant: "destructive",
            });
            setCategories([]);
          }
          return;
        }

        if (!controller.signal.aborted) {
          setCategories(data ?? []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Unexpected error loading categories", err);
        }
      }
    };

    void loadCategories();

    return () => controller.abort();
  }, [toast]);

  const handleLocationSelect = (location: string) => {
    onChange({ ...value, location });
    setLocationOpen(false);
    setActiveSection("when");
  };

  useEffect(() => {
    if (!value.equipmentCategoryId || value.equipmentType) return;
    const match = equipmentOptions.find(
      (opt) =>
        !opt.id.startsWith("fallback-") && opt.id === value.equipmentCategoryId
    );
    if (match) {
      onChange({ ...value, equipmentType: match.name });
    }
  }, [equipmentOptions, onChange, value]);

  // Keyboard shortcut: Cmd+K / Ctrl+K to open equipment search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only on desktop (mobile uses sheet, doesn't need keyboard shortcut)
      if (!isDesktop) return;

      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setEquipmentOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDesktop]);

  const renderAutocompleteCommand = (
    placeholder: string,
    options?: {
      className?: string;
      popularHeading?: string;
    }
  ) => {
    const commandClassName =
      options?.className !== undefined
        ? options.className || undefined
        : "rounded-2xl border";
    return (
      <Command className={commandClassName} shouldFilter={false}>
        <CommandInput
          placeholder={placeholder}
          value={addressAutocomplete.query}
          onValueChange={addressAutocomplete.setQuery}
        />
        <CommandList aria-busy={addressAutocomplete.loading}>
          <CommandEmpty>
            {addressAutocomplete.loading
              ? "Searching..."
              : addressAutocomplete.query.trim().length === 0
              ? "Start typing to search locations."
              : addressAutocomplete.error
              ? `Error: ${addressAutocomplete.error}`
              : "No locations found."}
          </CommandEmpty>
          {addressAutocomplete.query.trim().length >= 2 &&
            addressAutocomplete.suggestions.length > 0 && (
              <CommandGroup
                heading="Suggestions"
                className="animate-suggestions-in"
              >
                {addressAutocomplete.suggestions.map((s, idx) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => {
                      handleLocationSelect(s.label);
                      addressAutocomplete.setQuery("");
                    }}
                    className="cursor-pointer animate-suggestion-item"
                    style={{ "--item-index": idx } as React.CSSProperties}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {highlightMatchingText(
                        s.label,
                        addressAutocomplete.query
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          <CommandGroup
            heading={options?.popularHeading ?? "Popular"}
            className="animate-suggestions-in"
          >
            {POPULAR_LOCATIONS.map((loc, idx) => (
              <CommandItem
                key={loc}
                onSelect={() => handleLocationSelect(loc)}
                className="cursor-pointer animate-suggestion-item"
                style={{ "--item-index": idx } as React.CSSProperties}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {loc}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    );
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

  const handleEquipmentSuggestionSelect = (suggestion: EquipmentSuggestion) => {
    if (suggestion.type === "category") {
      // Category selection: broad filter
      onChange({
        ...value,
        equipmentType: suggestion.label,
        equipmentCategoryId: suggestion.id,
        search: "", // Clear search
      });
    } else {
      // Equipment item selection: precise search via text search only
      onChange({
        ...value,
        equipmentType: suggestion.label, // Display name
        equipmentCategoryId: undefined, // Don't filter by category
        search: suggestion.label, // Search by exact title
      });
    }

    // Save to recent searches
    addRecentSearch(suggestion.label);
    setRecentSearches(getRecentSearches());

    // Clear input and close popover/sheet
    equipmentAutocomplete.setQuery("");
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
      equipmentCategoryId: undefined,
      search: "",
    });
    equipmentAutocomplete.setQuery("");
    addressAutocomplete.setQuery("");
    setActiveSection("where");
    setIsSelectingDates(false);
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    setSheetOpen(nextOpen);
    if (!nextOpen) {
      setActiveSection("where");
      setIsSelectingDates(false);
      equipmentAutocomplete.setQuery("");
    } else {
      addressAutocomplete.setQuery("");
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
      const geolocationError = error as
        | GeolocationPositionError
        | { code?: number | GeolocationErrorCode; message?: string };
      const rawCode = geolocationError?.code;
      let errorCode: GeolocationErrorCode | undefined;
      if (typeof rawCode === "string") {
        errorCode = rawCode;
      } else if (typeof rawCode === "number") {
        const codeMap: Record<number, GeolocationErrorCode> = {
          1: "denied",
          2: "timeout",
          3: "unavailable",
        };
        errorCode = codeMap[rawCode];
      }
      const errorMessage = geolocationError?.message;

      switch (errorCode) {
        case "denied":
          toast({
            title: "Location permission denied",
            description:
              errorMessage ||
              "You've previously denied location access. Click the location icon (📍) in your browser's address bar to allow access, then try again.",
            variant: "destructive",
            action: (
              <ToastAction altText="Try again" onClick={handleLocationClick}>
                Try Again
              </ToastAction>
            ),
          });
          break;
        case "timeout":
          toast({
            title: "Location timeout",
            description:
              errorMessage ||
              "Couldn't get your location. Check signal and try again.",
            variant: "destructive",
            action: (
              <ToastAction altText="Try again" onClick={handleLocationClick}>
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
            description:
              errorMessage ||
              "Location isn't available right now. Try entering a city.",
            variant: "destructive",
          });
          break;
        default:
          toast({
            title: "Location error",
            description:
              errorMessage ||
              "Something went wrong. Try entering a city manually.",
            variant: "destructive",
          });
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleLocationClick = () => {
    void handleUseCurrentLocation();
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
                  // Use dynamic icon for "What" section based on selection type
                  let Icon = section.icon;
                  if (
                    section.key === "what" &&
                    value.equipmentType &&
                    value.search
                  ) {
                    Icon = Wrench;
                  }
                  const isActive = activeSection === section.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => {
                        setActiveSection(section.key);
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
                    className="w-full justify-start animate-suggestion-item"
                    style={{ "--item-index": 0 } as React.CSSProperties}
                    onClick={handleLocationClick}
                    disabled={isLocating}
                    aria-label="Use current location"
                    aria-busy={isLocating}
                  >
                    <Crosshair className="mr-2 h-4 w-4" />
                    {isLocating
                      ? "Detecting your location..."
                      : "Use current location"}
                  </Button>
                  {renderAutocompleteCommand("Try Yosemite National Park")}
                  <div className="flex flex-wrap gap-2 animate-suggestions-in">
                    {POPULAR_LOCATIONS.map((loc, idx) => (
                      <Button
                        key={`${loc}-chip`}
                        variant={
                          value.location === loc ? "default" : "secondary"
                        }
                        size="sm"
                        className="rounded-full animate-suggestion-item"
                        style={{ animationDelay: `${idx * 40}ms` }}
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
                  <div className="flex flex-wrap gap-2 animate-suggestions-in">
                    {quickDateRanges.map((option, idx) => (
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
                        className="rounded-full animate-suggestion-item"
                        style={{ animationDelay: `${idx * 50}ms` }}
                        onClick={() => handlePresetDateSelect(option.range)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <div
                    className="rounded-2xl border p-4 animate-suggestions-in"
                    style={{ animationDelay: "100ms" }}
                  >
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
                      Search for equipment or browse categories.
                    </p>
                  </div>
                  <Command shouldFilter={false} className="rounded-2xl border">
                    <CommandInput
                      placeholder="What are you looking for?"
                      value={equipmentAutocomplete.query}
                      onValueChange={equipmentAutocomplete.setQuery}
                    />
                    <CommandList
                      className="max-h-[400px]"
                      aria-busy={equipmentAutocomplete.loading}
                    >
                      <CommandEmpty>
                        {equipmentAutocomplete.loading ? (
                          <div className="flex items-center justify-center gap-2 py-6">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Searching...</span>
                          </div>
                        ) : equipmentAutocomplete.query.trim().length === 0 ? (
                          "Start typing to search."
                        ) : equipmentAutocomplete.error ? (
                          `Error: ${equipmentAutocomplete.error}`
                        ) : (
                          "No results found."
                        )}
                      </CommandEmpty>

                      {/* Recent Searches (shown when no search query) */}
                      {equipmentAutocomplete.query.trim().length === 0 &&
                        recentSearches.length > 0 && (
                          <CommandGroup
                            heading="Recent"
                            className="animate-suggestions-in"
                          >
                            {recentSearches.map((searchTerm, idx) => (
                              <CommandItem
                                key={`recent-${idx}`}
                                onSelect={() => {
                                  // Find matching category
                                  const category = categories.find(
                                    (cat) => cat.name === searchTerm
                                  );
                                  if (category) {
                                    handleEquipmentSuggestionSelect({
                                      id: category.id,
                                      label: category.name,
                                      type: "category",
                                    });
                                  } else {
                                    // Treat as equipment search
                                    onChange({
                                      ...value,
                                      equipmentType: searchTerm,
                                      equipmentCategoryId: undefined,
                                      search: searchTerm,
                                    });
                                    setSheetOpen(false);
                                  }
                                }}
                                className="cursor-pointer py-3 animate-suggestion-item"
                                style={
                                  { "--item-index": idx } as React.CSSProperties
                                }
                              >
                                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                                {searchTerm}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}

                      {/* Popular Categories (shown when no search query) */}
                      {equipmentAutocomplete.query.trim().length === 0 && (
                        <CommandGroup
                          heading="Popular"
                          className="animate-suggestions-in"
                        >
                          {POPULAR_CATEGORIES.map((categoryName, idx) => (
                            <CommandItem
                              key={categoryName}
                              onSelect={() => {
                                // Find the category ID from loaded categories
                                const category = categories.find(
                                  (cat) => cat.name === categoryName
                                );
                                if (category) {
                                  handleEquipmentSuggestionSelect({
                                    id: category.id,
                                    label: category.name,
                                    type: "category",
                                  });
                                } else {
                                  // Fallback: set as equipmentType without category filter
                                  onChange({
                                    ...value,
                                    equipmentType: categoryName,
                                    equipmentCategoryId: undefined,
                                    search: "",
                                  });
                                  setSheetOpen(false);
                                }
                              }}
                              className="cursor-pointer py-3 animate-suggestion-item"
                              style={
                                { "--item-index": idx } as React.CSSProperties
                              }
                            >
                              <Package className="mr-2 h-4 w-4" />
                              {categoryName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Categories Group */}
                      {categorySuggestions.length > 0 && (
                        <CommandGroup
                          heading="Categories"
                          className="animate-suggestions-in"
                        >
                          {categorySuggestions.map((s, idx) => (
                            <CommandItem
                              key={s.id}
                              onSelect={() =>
                                handleEquipmentSuggestionSelect(s)
                              }
                              className="cursor-pointer py-3 animate-suggestion-item"
                              style={
                                { "--item-index": idx } as React.CSSProperties
                              }
                            >
                              <Package className="mr-2 h-4 w-4 shrink-0" />
                              <span className="flex-1 truncate">
                                {highlightMatchingText(
                                  s.label,
                                  equipmentAutocomplete.query
                                )}
                              </span>
                              {typeof s.itemCount === "number" && (
                                <span className="text-xs text-muted-foreground ml-auto pl-2 shrink-0">
                                  {s.itemCount}{" "}
                                  {s.itemCount === 1 ? "item" : "items"}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Equipment Items Group */}
                      {equipmentSuggestions.length > 0 && (
                        <CommandGroup
                          heading="Equipment"
                          className="animate-suggestions-in"
                        >
                          {equipmentSuggestions.map((s, idx) => (
                            <CommandItem
                              key={s.id}
                              onSelect={() =>
                                handleEquipmentSuggestionSelect(s)
                              }
                              className="cursor-pointer py-3 animate-suggestion-item"
                              style={
                                { "--item-index": idx } as React.CSSProperties
                              }
                            >
                              <Search className="mr-2 h-4 w-4 shrink-0" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="truncate">
                                  {highlightMatchingText(
                                    s.label,
                                    equipmentAutocomplete.query
                                  )}
                                </span>
                                {s.categoryName && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    in {s.categoryName}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
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
                          onChange({
                            ...value,
                            equipmentType: undefined,
                            equipmentCategoryId: undefined,
                            search: "",
                          })
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
            if (open) addressAutocomplete.setQuery("");
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
                {value.location && (
                  <X
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ ...value, location: "" });
                    }}
                    aria-label="Clear location"
                  />
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <Button
                variant="ghost"
                className="w-full justify-start h-9"
                onClick={handleLocationClick}
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
            {renderAutocompleteCommand("Search locations...", {
              className: undefined,
              popularHeading: "Popular destinations",
            })}
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
                {value.dateRange?.from && (
                  <X
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({ ...value, dateRange: undefined });
                      setIsSelectingDates(false);
                    }}
                    aria-label="Clear dates"
                  />
                )}
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
        <Popover
          open={equipmentOpen}
          onOpenChange={(open) => {
            setEquipmentOpen(open);
            if (!open) equipmentAutocomplete.setQuery("");
          }}
        >
          <PopoverTrigger asChild>
            <button
              className="relative px-6 py-4 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:z-10"
              aria-label="Select equipment type"
            >
              <div className="flex items-center gap-3 w-full">
                {value.equipmentType && value.search ? (
                  <Wrench className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground">
                    What
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {value.equipmentType || "What are you looking for?"}
                  </div>
                </div>
                {!value.equipmentType && (
                  <kbd className="hidden xl:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-60 shrink-0">
                    <span className="text-xs">{isMacOS() ? "⌘" : "Ctrl+"}</span>
                    K
                  </kbd>
                )}
                {value.equipmentType && (
                  <X
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer shrink-0 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        ...value,
                        equipmentType: undefined,
                        equipmentCategoryId: undefined,
                        search: "",
                      });
                      equipmentAutocomplete.setQuery("");
                    }}
                    aria-label="Clear equipment selection"
                  />
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="What are you looking for?"
                value={equipmentAutocomplete.query}
                onValueChange={equipmentAutocomplete.setQuery}
              />
              <CommandList aria-busy={equipmentAutocomplete.loading}>
                <CommandEmpty>
                  {equipmentAutocomplete.loading ? (
                    <div className="flex items-center justify-center gap-2 py-6">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Searching...</span>
                    </div>
                  ) : equipmentAutocomplete.query.trim().length === 0 ? (
                    "Start typing to search."
                  ) : equipmentAutocomplete.error ? (
                    `Error: ${equipmentAutocomplete.error}`
                  ) : (
                    "No results found."
                  )}
                </CommandEmpty>

                {/* Recent Searches (shown when no search query) */}
                {equipmentAutocomplete.query.trim().length === 0 &&
                  recentSearches.length > 0 && (
                    <CommandGroup
                      heading="Recent"
                      className="animate-suggestions-in"
                    >
                      {recentSearches.map((searchTerm, idx) => (
                        <CommandItem
                          key={`recent-${idx}`}
                          onSelect={() => {
                            // Find matching category
                            const category = categories.find(
                              (cat) => cat.name === searchTerm
                            );
                            if (category) {
                              handleEquipmentSuggestionSelect({
                                id: category.id,
                                label: category.name,
                                type: "category",
                              });
                            } else {
                              // Treat as equipment search
                              onChange({
                                ...value,
                                equipmentType: searchTerm,
                                equipmentCategoryId: undefined,
                                search: searchTerm,
                              });
                              setEquipmentOpen(false);
                            }
                          }}
                          className="cursor-pointer animate-suggestion-item"
                          style={{ "--item-index": idx } as React.CSSProperties}
                        >
                          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                          {searchTerm}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                {/* Popular Categories (shown when no search query) */}
                {equipmentAutocomplete.query.trim().length === 0 && (
                  <CommandGroup
                    heading="Popular"
                    className="animate-suggestions-in"
                  >
                    {POPULAR_CATEGORIES.map((categoryName, idx) => (
                      <CommandItem
                        key={categoryName}
                        onSelect={() => {
                          // Find the category ID from loaded categories
                          const category = categories.find(
                            (cat) => cat.name === categoryName
                          );
                          if (category) {
                            handleEquipmentSuggestionSelect({
                              id: category.id,
                              label: category.name,
                              type: "category",
                            });
                          } else {
                            // Fallback: set as equipmentType without category filter
                            onChange({
                              ...value,
                              equipmentType: categoryName,
                              equipmentCategoryId: undefined,
                              search: "",
                            });
                            setEquipmentOpen(false);
                          }
                        }}
                        className="cursor-pointer animate-suggestion-item"
                        style={{ "--item-index": idx } as React.CSSProperties}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {categoryName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Categories Group */}
                {categorySuggestions.length > 0 && (
                  <CommandGroup
                    heading="Categories"
                    className="animate-suggestions-in"
                  >
                    {categorySuggestions.map((s, idx) => (
                      <CommandItem
                        key={s.id}
                        onSelect={() => handleEquipmentSuggestionSelect(s)}
                        className="cursor-pointer animate-suggestion-item"
                        style={{ "--item-index": idx } as React.CSSProperties}
                      >
                        <Package className="mr-2 h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">
                          {highlightMatchingText(
                            s.label,
                            equipmentAutocomplete.query
                          )}
                        </span>
                        {typeof s.itemCount === "number" && (
                          <span className="text-xs text-muted-foreground ml-auto pl-2 shrink-0">
                            {s.itemCount} {s.itemCount === 1 ? "item" : "items"}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Equipment Items Group */}
                {equipmentSuggestions.length > 0 && (
                  <CommandGroup
                    heading="Equipment"
                    className="animate-suggestions-in"
                  >
                    {equipmentSuggestions.map((s, idx) => (
                      <CommandItem
                        key={s.id}
                        onSelect={() => handleEquipmentSuggestionSelect(s)}
                        className="cursor-pointer animate-suggestion-item"
                        style={{ "--item-index": idx } as React.CSSProperties}
                      >
                        <Search className="mr-2 h-4 w-4 shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate">
                            {highlightMatchingText(
                              s.label,
                              equipmentAutocomplete.query
                            )}
                          </span>
                          {s.categoryName && (
                            <span className="text-xs text-muted-foreground truncate">
                              in {s.categoryName}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
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
