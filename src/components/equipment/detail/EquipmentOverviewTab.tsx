import { Separator } from "@/components/ui/separator";
import { type Category } from "./EquipmentMetadataCard";
import { EquipmentHighlightsAlert } from "./EquipmentHighlightsAlert";
import { OwnerInformationCard } from "./OwnerInformationCard";
import { EquipmentFeatures } from "./EquipmentFeatures";
import { EquipmentSpecifications } from "./EquipmentSpecifications";
import { ConditionVisualization } from "./ConditionVisualization";

interface Owner {
  id: string;
  name?: string;
  email: string;
  avatar_url?: string;
  joinedDate?: string;
  totalRentals?: number;
  responseRate?: number;
  rating?: number;
  isVerified?: boolean;
}

interface EquipmentOverviewTabProps {
  description: string;
  condition: string;
  category: Category | null;
  dailyRate: number;
  location: string;
  owner?: Owner;
  rentalCount?: number;
  averageRating?: number;
  isVerified?: boolean;
  lastInspectionDate?: string;
}

export const EquipmentOverviewTab = ({
  description,
  condition,
  category,
  dailyRate,
  location,
  owner,
  rentalCount = 0,
  averageRating = 0,
  isVerified = false,
  lastInspectionDate,
}: EquipmentOverviewTabProps) => {
  return (
    <div className="space-y-6">
      {/* Highlights Alert */}
      <EquipmentHighlightsAlert
        rentalCount={rentalCount}
        averageRating={averageRating}
        isVerified={isVerified}
      />

      {/* Description */}
      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          About This Equipment
        </h2>
        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
          {description}
        </p>
      </div>

      <Separator />

      {/* Owner Information */}
      {owner && <OwnerInformationCard owner={owner} />}

      <Separator />

      {/* Key Features */}
      <EquipmentFeatures
        isWellMaintained={rentalCount > 5}
        hasFlexiblePickup={true}
        hasFastResponse={true}
        isPopular={rentalCount >= 10}
        isVerified={isVerified}
      />

      <Separator />

      {/* Specifications Accordion */}
      <EquipmentSpecifications
        dailyRate={dailyRate}
        condition={condition}
        category={category}
        location={location}
      />

      <Separator />

      {/* Condition Visualization */}
      <ConditionVisualization
        condition={condition}
        lastInspectionDate={lastInspectionDate}
      />
    </div>
  );
};

