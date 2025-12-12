import { useEffect, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Package } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { MAX_DISPLAY_COUNT } from "@/config/pagination";

type Category = Database["public"]["Tables"]["categories"]["Row"];

type CategoryWithCount = Category & {
  item_count?: number;
};

type Props = {
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
};

const CategoryBar = ({ activeCategoryId, onCategoryChange }: Props) => {
  const { t } = useTranslation("equipment");
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .is("parent_id", null)
          .order("name")
          .abortSignal(signal);

        if (error) {
          // Don't show error toast if request was aborted
          if (signal.aborted) return;
          console.error("Error fetching categories:", error);
          toast({
            title: t("category_bar.error_title"),
            description: t("category_bar.error_desc"),
            variant: "destructive",
          });
          setCategories([]);
          setCountsLoading(false);
          return;
        }

        // Don't update state if component unmounted
        if (signal.aborted) return;

        // Set categories first without counts (shows categories immediately)
        setCategories((data || []).map((cat) => ({ ...cat, item_count: 0 })));

        // Check if already aborted before starting equipment query
        if (signal.aborted) return;

        // Fetch ALL equipment counts in a single query
        const { data: equipmentData, error: equipmentError } = await supabase
          .from("equipment")
          .select("category_id")
          .eq("is_available", true)
          .abortSignal(signal);

        if (equipmentError) {
          // Don't show error toast if request was aborted
          if (signal.aborted) return;
          console.error("Error fetching equipment counts:", equipmentError);
          // Continue without counts rather than failing completely
          setCountsLoading(false);
          return;
        }

        // Don't update state if component unmounted
        if (signal.aborted) return;

        // Create count map from the results
        const countMap = new Map<string, number>();
        equipmentData?.forEach((item) => {
          const count = countMap.get(item.category_id) || 0;
          countMap.set(item.category_id, count + 1);
        });

        // Merge counts with categories (single pass)
        const categoriesWithCounts = (data || []).map((cat) => ({
          ...cat,
          item_count: countMap.get(cat.id) || 0,
        }));

        setCategories(categoriesWithCounts);
        setCountsLoading(false);
      } catch (err) {
        // Don't show error toast if request was aborted
        if (signal.aborted) return;
        console.error("Unexpected error fetching categories:", err);
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        toast({
          title: "Error loading categories",
          description: message,
          variant: "destructive",
        });
        setCategories([]);
        setCountsLoading(false);
      }
    };
    void load();

    return () => {
      abortController.abort();
    };
  }, [t]);

  const CategoryPill = ({
    id,
    name,
    icon: Icon,
    count,
    isActive,
    onClick,
    loading = false,
  }: {
    id: string;
    name: string;
    icon: React.ElementType;
    count?: number;
    isActive: boolean;
    onClick: () => void;
    loading?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Filter by ${name}${typeof count === "number" ? `, ${t("category_bar.items_aria", { count })}` : ""}`}
      aria-pressed={isActive}
      className={cn(
        "group relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full transition-all duration-200 whitespace-nowrap text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isActive
          ? "bg-foreground text-background shadow-sm"
          : "bg-background hover:bg-muted border border-border hover:border-foreground/20 text-foreground hover:shadow-sm"
      )}
    >
      {/* Icon */}
      <Icon
        className={cn(
          "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
          isActive ? "text-background" : "text-foreground"
        )}
      />

      {/* Category Name */}
      <span className="max-w-[140px] truncate">{name}</span>

      {/* Count Badge */}
      {(loading || (typeof count === "number" && count > 0)) && (
        <Badge
          variant={isActive ? "outline" : "secondary"}
          className={cn(
            "h-5 px-1.5 text-[10px] font-semibold min-w-[20px] justify-center",
            isActive
              ? "bg-background/20 text-background border-background/30"
              : "bg-muted text-muted-foreground"
          )}
        >
          {loading
            ? "..."
            : count! > MAX_DISPLAY_COUNT
              ? `${MAX_DISPLAY_COUNT}+`
              : count}
        </Badge>
      )}
    </button>
  );

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 py-1">
        {/* All Categories */}
        <CategoryPill
          id="all"
          name={t("category_bar.all")}
          icon={Package}
          isActive={activeCategoryId === "all"}
          onClick={() => onCategoryChange("all")}
        />

        {/* Individual Categories */}
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.name);
          return (
            <CategoryPill
              key={cat.id}
              id={cat.id}
              name={cat.name}
              icon={Icon}
              count={cat.item_count}
              isActive={activeCategoryId === cat.id}
              onClick={() => onCategoryChange(cat.id)}
              loading={countsLoading}
            />
          );
        })}
      </div>
    </div>
  );
};

export default memo(CategoryBar);
