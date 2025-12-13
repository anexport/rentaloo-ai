import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, isPast, isToday } from "date-fns";
import MobileInspectionSheet from "@/components/booking/inspection-flow/MobileInspectionSheet";
import type { InspectionPhase } from "@/components/booking/inspection-flow/InspectionFlowBanner";

interface MobileInspectionFABProps {
  bookingId: string;
  equipmentTitle: string;
  startDate: Date;
  endDate: Date;
  hasPickupInspection: boolean;
  hasReturnInspection: boolean;
  isOwner: boolean;
  className?: string;
}

export default function MobileInspectionFAB({
  bookingId,
  equipmentTitle,
  startDate,
  endDate,
  hasPickupInspection,
  hasReturnInspection,
  isOwner,
  className,
}: MobileInspectionFABProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const today = new Date();

  // Determine the current phase
  const getPhase = (): InspectionPhase => {
    if (hasPickupInspection && hasReturnInspection) {
      return "all_complete";
    }
    if (!hasPickupInspection) {
      return "awaiting_pickup_inspection";
    }
    if (hasPickupInspection && !hasReturnInspection) {
      const daysUntilEnd = differenceInDays(endDate, today);
      if (daysUntilEnd <= 1 || isPast(endDate)) {
        return "awaiting_return_inspection";
      }
      return "pickup_inspection_complete";
    }
    return "all_complete";
  };

  const phase = getPhase();

  // Owners shouldn't see pickup inspection prompts
  if (isOwner && phase === "awaiting_pickup_inspection") {
    return null;
  }

  // Don't show FAB if all inspections are complete
  if (phase === "all_complete") {
    return null;
  }

  // Calculate timing
  const daysUntilStart = differenceInDays(startDate, today);
  const daysUntilEnd = differenceInDays(endDate, today);

  // Determine urgency
  const getUrgency = (): "critical" | "warning" | "normal" => {
    if (phase === "awaiting_pickup_inspection") {
      if (isPast(startDate) || isToday(startDate)) return "critical";
      if (daysUntilStart <= 2) return "warning";
    }
    if (phase === "awaiting_return_inspection") {
      if (isPast(endDate) || isToday(endDate)) return "critical";
      if (daysUntilEnd <= 2) return "warning";
    }
    return "normal";
  };

  const urgency = getUrgency();

  // FAB styles based on urgency
  const fabStyles = {
    critical: "bg-red-600 hover:bg-red-700 text-white shadow-red-500/30 animate-pulse",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30",
    normal: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/30",
  };

  // Get short label
  const getLabel = (): string => {
    if (phase === "awaiting_pickup_inspection") return "Pickup";
    if (phase === "awaiting_return_inspection") return "Return";
    return "Inspect";
  };

  // Get icon based on urgency
  const getIcon = () => {
    if (urgency === "critical") return AlertTriangle;
    if (urgency === "warning") return Clock;
    return Camera;
  };

  const Icon = getIcon();

  return (
    <>
      {/* Floating Action Button */}
      <div className={cn("fixed bottom-20 right-4 z-40 md:hidden", className)}>
        <Button
          size="lg"
          aria-label={`${getLabel()} inspection ${urgency === "critical" ? "urgent" : urgency === "warning" ? "approaching deadline" : ""}`}
          className={cn(
            "rounded-full h-14 px-5 shadow-lg gap-2",
            fabStyles[urgency]
          )}
          onClick={() => setIsSheetOpen(true)}
        >
          <Icon className="h-5 w-5" />
          <span className="font-semibold">{getLabel()}</span>
          {urgency !== "normal" && (
            <Badge
              variant="secondary"
              className={cn(
                "ml-1 h-5 px-1.5 text-xs",
                urgency === "critical" && "bg-white/20 text-white",
                urgency === "warning" && "bg-white/20 text-white"
              )}
            >
              !
            </Badge>
          )}
        </Button>
      </div>

      {/* Bottom Sheet */}
      <MobileInspectionSheet
        bookingId={bookingId}
        equipmentTitle={equipmentTitle}
        startDate={startDate}
        endDate={endDate}
        hasPickupInspection={hasPickupInspection}
        hasReturnInspection={hasReturnInspection}
        isOwner={isOwner}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
      />
    </>
  );
}
