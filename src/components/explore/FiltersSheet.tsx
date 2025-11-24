import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createMinWidthQuery } from "@/config/breakpoints";
import { DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX } from "@/config/pagination";
import type { Database } from "@/lib/database.types";

type EquipmentCondition = Database["public"]["Enums"]["equipment_condition"];

export type FilterValues = {
  priceRange: [number, number];
  conditions: EquipmentCondition[];
  verified: boolean;
};

type Props = {
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  resultCount: number;
  activeFilterCount: number;
};

const CONDITIONS: Array<{ value: EquipmentCondition; label: string }> = [
  { value: "new", label: "New" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const FiltersSheet = ({
  value,
  onChange,
  resultCount,
  activeFilterCount,
}: Props) => {
  const [localValue, setLocalValue] = useState<FilterValues>(value);
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery(createMinWidthQuery("md"));
  const prevValueRef = useRef<FilterValues>(value);

  // Sync localValue with prop changes
  useEffect(() => {
    const prev = prevValueRef.current;
    const valueChanged =
      prev.priceRange[0] !== value.priceRange[0] ||
      prev.priceRange[1] !== value.priceRange[1] ||
      prev.conditions.length !== value.conditions.length ||
      prev.verified !== value.verified ||
      !prev.conditions.every((c) => value.conditions.includes(c));

    if (valueChanged) {
      setLocalValue(value);
      prevValueRef.current = value;
    }
  }, [value]);

  const handleApply = () => {
    setIsOpen(false);
    onChange(localValue);
  };

  const handleClear = () => {
    const cleared: FilterValues = {
      priceRange: [DEFAULT_PRICE_MIN, DEFAULT_PRICE_MAX],
      conditions: [],
      verified: false,
    };
    setLocalValue(cleared);
    onChange(cleared);
  };

  const handleConditionToggle = (condition: EquipmentCondition) => {
    const next = localValue.conditions.includes(condition)
      ? localValue.conditions.filter((c) => c !== condition)
      : [...localValue.conditions, condition];
    setLocalValue({ ...localValue, conditions: next });
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      <Accordion
        type="multiple"
        className="w-full"
        defaultValue={["price", "condition"]}
      >
        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger>Price range</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  ${localValue.priceRange[0]}
                </span>
                <span className="text-muted-foreground">
                  ${localValue.priceRange[1]}+
                </span>
              </div>
              <Slider
                value={localValue.priceRange}
                onValueChange={(val) => {
                  // Ensure priceMin <= priceMax
                  const [min, max] = val as [number, number];
                  setLocalValue({
                    ...localValue,
                    priceRange: [
                      Math.min(min, max),
                      Math.max(min, max),
                    ] as [number, number],
                  });
                }}
                min={DEFAULT_PRICE_MIN}
                max={DEFAULT_PRICE_MAX}
                step={10}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">Price per day</div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Condition */}
        <AccordionItem value="condition">
          <AccordionTrigger>Condition</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pt-2">
              {CONDITIONS.map((condition) => (
                <div
                  key={condition.value}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={`condition-${condition.value}`}
                    checked={localValue.conditions.includes(condition.value)}
                    onCheckedChange={() =>
                      handleConditionToggle(condition.value)
                    }
                  />
                  <label
                    htmlFor={`condition-${condition.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {condition.label}
                  </label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Verified Owners */}
        <AccordionItem value="verified">
          <AccordionTrigger>Owner verification</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="verified"
                checked={localValue.verified}
                onCheckedChange={(checked) =>
                  setLocalValue({ ...localValue, verified: Boolean(checked) })
                }
              />
              <label
                htmlFor="verified"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Show verified owners only
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  const FiltersFooter = () => (
    <div className="flex items-center justify-between gap-4">
      <Button variant="ghost" onClick={handleClear}>
        Clear all
      </Button>
      <Button onClick={handleApply}>
        Show {resultCount} result{resultCount !== 1 ? "s" : ""}
      </Button>
    </div>
  );

  const TriggerButton = () => (
    <Button
      variant="outline"
      size="sm"
      className="relative"
      onClick={() => setIsOpen(true)}
    >
      <Filter className="h-4 w-4 mr-2" />
      Filters
      {activeFilterCount > 0 && (
        <Badge
          variant="default"
          className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {activeFilterCount}
        </Badge>
      )}
    </Button>
  );

  if (isDesktop) {
    return (
      <>
        <TriggerButton />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
              <DialogDescription>
                Refine your search to find the perfect equipment
              </DialogDescription>
            </DialogHeader>
            <FiltersContent />
            <DialogFooter>
              <FiltersFooter />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <TriggerButton />
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-[85vh]">
          {/* Drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/20 rounded-full" />

          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Refine your search to find the perfect equipment
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(100%-120px)] py-4">
            <FiltersContent />
          </div>
          <SheetFooter>
            <FiltersFooter />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FiltersSheet;
