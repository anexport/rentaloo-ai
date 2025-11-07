import { CheckCircle2, Package } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Category {
  name: string;
}

interface EquipmentMetadataCardProps {
  condition: string;
  category: Category | null;
}

export const EquipmentMetadataCard = ({
  condition,
  category,
}: EquipmentMetadataCardProps) => {
  return (
    <Card>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Condition */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                Condition
              </span>
              <Badge variant="outline" className="capitalize w-fit">
                {condition}
              </Badge>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="h-8 w-px bg-border" />

          {/* Category */}
          <div className="flex items-center gap-2">
            {category &&
              (() => {
                const CategoryIcon = getCategoryIcon(category.name);
                return (
                  <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                );
              })()}
            {!category && (
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                Category
              </span>
              <Badge variant="secondary" className="w-fit">
                {category?.name || "N/A"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

