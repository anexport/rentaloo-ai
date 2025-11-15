import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Package } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type Category = Database["public"]["Tables"]["categories"]["Row"];

type CategoryWithCount = Category & {
  item_count?: number;
};

type Props = {
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
};

const CategoryBar = ({ activeCategoryId, onCategoryChange }: Props) => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .is("parent_id", null)
          .order("name");

        if (error) {
          console.error("Error fetching categories:", error);
          toast({
            title: "Error loading categories",
            description: "Failed to load categories. Please try again later.",
            variant: "destructive",
          });
          setCategories([]);
          return;
        }

        // Fetch counts for each category
        const categoriesWithCounts = await Promise.all(
          (data || []).map(async (cat) => {
            const { count } = await supabase
              .from("equipment")
              .select("*", { count: "exact", head: true })
              .eq("category_id", cat.id)
              .eq("is_available", true);

            return { ...cat, item_count: count || 0 };
          })
        );

        // Get total count for "All"
        const { count: total } = await supabase
          .from("equipment")
          .select("*", { count: "exact", head: true })
          .eq("is_available", true);

        setTotalCount(total || 0);
        setCategories(categoriesWithCounts);
      } catch (err) {
        console.error("Unexpected error fetching categories:", err);
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        toast({
          title: "Error loading categories",
          description: message,
          variant: "destructive",
        });
        setCategories([]);
      }
    };
    void load();
  }, []);

  const CategoryCard = ({
    id,
    name,
    icon: Icon,
    count,
    isActive,
    onClick,
  }: {
    id: string;
    name: string;
    icon: React.ElementType;
    count?: number;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      aria-label={`Category ${name}`}
      className={cn(
        "group relative flex flex-col items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 min-w-[120px] hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isActive
          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
          : "bg-card hover:bg-muted/50 border border-border hover:border-primary/30 hover:shadow-md"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "relative p-3 rounded-xl transition-all duration-300",
          isActive
            ? "bg-white/20"
            : "bg-primary/10 group-hover:bg-primary/15 group-hover:scale-110"
        )}
      >
        <Icon
          className={cn(
            "h-7 w-7 transition-colors",
            isActive ? "text-primary-foreground" : "text-primary"
          )}
        />
      </div>

      {/* Category Name */}
      <div className="space-y-1 text-center">
        <div
          className={cn(
            "text-sm font-semibold transition-colors",
            isActive ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {name}
        </div>

        {/* Item Count */}
        {typeof count === "number" && (
          <div
            className={cn(
              "text-xs transition-colors",
              isActive
                ? "text-primary-foreground/80"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {count.toLocaleString()} {count === 1 ? "item" : "items"}
          </div>
        )}
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-12 bg-primary-foreground rounded-full" />
      )}
    </button>
  );

  return (
    <div className="w-full py-2">
      <ScrollArea className="w-full">
        <div className="flex items-stretch gap-3 pb-2">
          {/* All Categories */}
          <CategoryCard
            id="all"
            name="All"
            icon={Package}
            count={totalCount}
            isActive={activeCategoryId === "all"}
            onClick={() => onCategoryChange("all")}
          />

          {/* Individual Categories */}
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.name);
            return (
              <div key={cat.id} className="relative">
                <CategoryCard
                  id={cat.id}
                  name={cat.name}
                  icon={Icon}
                  count={cat.item_count}
                  isActive={activeCategoryId === cat.id}
                  onClick={() => onCategoryChange(cat.id)}
                />

                {/* "New" badge for new categories */}
                {cat.name.toLowerCase().includes("new") && (
                  <Badge className="absolute -top-2 -right-2 h-6 px-2 text-[10px] font-bold shadow-md animate-pulse">
                    NEW
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>
  );
};

export default CategoryBar;
