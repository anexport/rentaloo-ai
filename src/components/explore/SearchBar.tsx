import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Search } from "lucide-react";

export type BasicSearchFilters = {
  search: string;
  location: string;
  condition: string; // "all" | "new" | "excellent" | "good" | "fair"
};

type Props = {
  value: BasicSearchFilters;
  onChange: (next: BasicSearchFilters) => void;
  onSubmit: () => void;
};

const SearchBar = ({ value, onChange, onSubmit }: Props) => {
  const { t } = useTranslation<"equipment">("equipment");
  const [localValue, setLocalValue] = useState<BasicSearchFilters>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleApply = () => {
    onChange(localValue);
    onSubmit();
  };

  return (
    <div className="w-full rounded-full border border-input bg-card shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] items-stretch">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label={t("search_bar.search_equipment_aria")}
            placeholder={t("search.placeholder")}
            className="h-12 pl-9 rounded-none border-0 focus-visible:ring-0"
            value={localValue.search}
            onChange={(e) =>
              setLocalValue({ ...localValue, search: e.target.value })
            }
          />
        </div>
        <div className="relative border-t md:border-t-0 md:border-l border-border">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label={t("search_bar.where_placeholder")}
            placeholder={t("search_bar.where_placeholder")}
            className="h-12 pl-9 rounded-none border-0 focus-visible:ring-0"
            value={localValue.location}
            onChange={(e) =>
              setLocalValue({ ...localValue, location: e.target.value })
            }
          />
        </div>
        <div className="border-t md:border-t-0 md:border-l border-border flex">
          <Select
            value={localValue.condition}
            onValueChange={(v) =>
              setLocalValue({ ...localValue, condition: v })
            }
          >
            <SelectTrigger
              aria-label={t("filters_sheet.condition")}
              className="h-12 rounded-none border-0 focus:ring-0"
            >
              <SelectValue placeholder={t("filters_sheet.condition")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("condition.all", { defaultValue: "All conditions" })}
              </SelectItem>
              <SelectItem value="new">
                {t("condition.new", { defaultValue: "New" })}
              </SelectItem>
              <SelectItem value="excellent">
                {t("condition.excellent", { defaultValue: "Excellent" })}
              </SelectItem>
              <SelectItem value="good">
                {t("condition.good", { defaultValue: "Good" })}
              </SelectItem>
              <SelectItem value="fair">
                {t("condition.fair", { defaultValue: "Fair" })}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="border-t md:border-t-0 md:border-l border-border flex items-center justify-end">
          <div className="flex items-center gap-2 px-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={t("search_bar.set_dates_aria")}
                >
                  <Calendar className="h-4 w-4 mr-2" /> {t("search_bar.dates")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {t("search_bar.select_dates_title")}
                  </DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">
                  {t("search_bar.date_picker_placeholder")}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              onClick={handleApply}
              aria-label={t("search_bar.search")}
              className="h-9"
            >
              {t("search_bar.search")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
