import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Shield,
  Clock,
  MessageCircle,
  Star,
  Zap,
  Award,
} from "lucide-react";

interface Feature {
  label: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface EquipmentFeaturesProps {
  /**
   * Show "Well Maintained" badge
   */
  isWellMaintained?: boolean;
  
  /**
   * Show "Insured" badge
   */
  isInsured?: boolean;
  
  /**
   * Show "Flexible Pickup" badge
   */
  hasFlexiblePickup?: boolean;
  
  /**
   * Show "Fast Response" badge
   */
  hasFastResponse?: boolean;
  
  /**
   * Show "Popular" badge
   */
  isPopular?: boolean;
  
  /**
   * Show "Verified" badge
   */
  isVerified?: boolean;
  
  /**
   * Custom features to display
   */
  customFeatures?: Feature[];
}

export const EquipmentFeatures = ({
  isWellMaintained = false,
  isInsured = false,
  hasFlexiblePickup = true,
  hasFastResponse = true,
  isPopular = false,
  isVerified = false,
  customFeatures = [],
}: EquipmentFeaturesProps) => {
  const defaultFeatures: Feature[] = [];

  if (isWellMaintained) {
    defaultFeatures.push({
      label: "Well Maintained",
      tooltip: "Regularly serviced and kept in excellent condition",
      icon: CheckCircle2,
    });
  }

  if (isInsured) {
    defaultFeatures.push({
      label: "Insured",
      tooltip: "Covered by insurance for your peace of mind",
      icon: Shield,
    });
  }

  if (hasFlexiblePickup) {
    defaultFeatures.push({
      label: "Flexible Pickup",
      tooltip: "Arrange pickup times that work for your schedule",
      icon: Clock,
    });
  }

  if (hasFastResponse) {
    defaultFeatures.push({
      label: "Fast Response",
      tooltip: "Owner typically responds within 2 hours",
      icon: MessageCircle,
    });
  }

  if (isPopular) {
    defaultFeatures.push({
      label: "Popular",
      tooltip: "Frequently rented by our community",
      icon: Star,
    });
  }

  if (isVerified) {
    defaultFeatures.push({
      label: "Verified",
      tooltip: "Equipment and owner verified by our team",
      icon: Award,
    });
  }

  const allFeatures = [...defaultFeatures, ...customFeatures];

  if (allFeatures.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        Key Features
      </h3>
      <div className="flex flex-wrap gap-2">
        <TooltipProvider delayDuration={200}>
          {allFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className="cursor-help hover:bg-primary/10 transition-colors"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {feature.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{feature.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
};

