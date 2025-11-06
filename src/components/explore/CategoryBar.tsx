import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Package } from "lucide-react";
import { toast } from "@/hooks/useToast";

type Category = Database["public"]["Tables"]["categories"]["Row"];

type Props = {
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
};

const CategoryBar = ({ activeCategoryId, onCategoryChange }: Props) => {
  const [categories, setCategories] = useState<Category[]>([]);

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
        
        setCategories(data || []);
      } catch (err) {
        console.error("Unexpected error fetching categories:", err);
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
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

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Button
            variant={activeCategoryId === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange("all")}
            aria-label="All categories"
            className="flex flex-col h-auto py-2 px-4 gap-1"
          >
            <Package className="h-5 w-5" />
            <span className="text-xs">All</span>
          </Button>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.name);
            return (
              <HoverCard key={cat.id} openDelay={300}>
                <HoverCardTrigger asChild>
                  <Button
                    variant={activeCategoryId === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onCategoryChange(cat.id)}
                    aria-label={`Category ${cat.name}`}
                    className="flex flex-col h-auto py-2 px-4 gap-1 relative"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{cat.name}</span>
                    {cat.name.toLowerCase().includes("new") && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                        N
                      </Badge>
                    )}
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-64">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <h4 className="text-sm font-semibold">{cat.name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Browse {cat.name.toLowerCase()} equipment available for rent near you.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default CategoryBar;

