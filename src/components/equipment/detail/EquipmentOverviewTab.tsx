import { EquipmentMetadataCard } from "./EquipmentMetadataCard";

interface Category {
  name: string;
}

interface EquipmentOverviewTabProps {
  description: string;
  condition: string;
  category: Category | null;
}

export const EquipmentOverviewTab = ({
  description,
  condition,
  category,
}: EquipmentOverviewTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-3">About this item</h2>
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
          {description}
        </p>
      </div>

      <EquipmentMetadataCard condition={condition} category={category} />
    </div>
  );
};

