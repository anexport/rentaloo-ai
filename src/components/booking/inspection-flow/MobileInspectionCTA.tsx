import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  AlertTriangle,
  ArrowRight,
  Clock,
  ChevronUp,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, isPast, isToday, isFuture } from "date-fns";
import MobileInspectionSheet from "@/components/booking/inspection-flow/MobileInspectionSheet";

interface MobileInspectionCTAProps {
  bookingId: string;
  equipmentTitle: string;
  equipmentLocation?: string;
  startDate: Date;
  endDate: Date;
  hasPickupInspection: boolean;
  hasReturnInspection: boolean;
  isOwner: boolean;
}

export default function MobileInspectionCTA({
  bookingId,
  equipmentTitle,
  equipmentLocation,
  startDate,
  endDate,
  hasPickupInspection,
  hasReturnInspection,
  isOwner,
}: MobileInspectionCTAProps) {
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  if (
    !startDate ||
    Number.isNaN(startDate.getTime()) ||
    !endDate ||
    Number.isNaN(endDate.getTime())
  ) {
    console.error("Invalid dates provided to MobileInspectionCTA");
    return null;
  }
  const today = new Date();

  // Determine what inspection is needed
  const isPickupNeeded = !hasPickupInspection;
  const daysUntilEnd = differenceInDays(endDate, today);
  const isReturnNeeded =
    hasPickupInspection &&
    !hasReturnInspection &&
    (daysUntilEnd <= 2 || isPast(endDate));

  // Don't show if no inspection needed
  if (!isPickupNeeded && !isReturnNeeded) {
    return null;
  }

  // Calculate timing
  const daysUntilStart = differenceInDays(startDate, today);
  const hoursUntilStart = Math.max(0, Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60)));
  const hoursUntilEnd = Math.max(0, Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60)));

  // Determine urgency
  const getUrgency = (): "critical" | "warning" | "normal" => {
    if (isPickupNeeded) {
      if (isPast(startDate) || isToday(startDate)) return "critical";
      if (daysUntilStart <= 2) return "warning";
    }
    if (isReturnNeeded) {
      if (isPast(endDate) || isToday(endDate)) return "critical";
      if (daysUntilEnd <= 2) return "warning";
    }
    return "normal";
  };

  const urgency = getUrgency();

  // Get timing text
  const getTimingText = (): string => {
    if (isPickupNeeded) {
      if (isPast(startDate)) return "Overdue";
      if (isToday(startDate)) return "Today";
      if (hoursUntilStart < 24) return `${hoursUntilStart}h`;
      if (daysUntilStart === 1) return "Tomorrow";
      return `${daysUntilStart}d`;
    }
    if (isReturnNeeded) {
      if (isPast(endDate)) return "Overdue";
      if (isToday(endDate)) return "Today";
      if (hoursUntilEnd < 24) return `${hoursUntilEnd}h`;
      if (daysUntilEnd === 1) return "Tomorrow";
      return `${daysUntilEnd}d`;
    }
    return "";
  };

  const handlePrimaryAction = () => {
    if (isPickupNeeded) {
      navigate(`/inspection/${bookingId}/pickup`);
    } else if (isReturnNeeded) {
      navigate(`/inspection/${bookingId}/return`);
    }
  };

  // Styles based on urgency
  const ctaStyles = {
    critical: {
      container: "bg-red-600 border-red-700",
      text: "text-white",
      subtext: "text-red-100",
      badge: "bg-white/20 text-white",
      button: "bg-white text-red-600 hover:bg-red-50",
    },
    warning: {
      container: "bg-amber-500 border-amber-600",
      text: "text-white",
      subtext: "text-amber-100",
      badge: "bg-white/20 text-white",
      button: "bg-white text-amber-600 hover:bg-amber-50",
    },
    normal: {
      container: "bg-primary border-primary",
      text: "text-primary-foreground",
      subtext: "text-primary-foreground/80",
      badge: "bg-white/20 text-primary-foreground",
      button: "bg-white text-primary hover:bg-primary-foreground/10",
    },
  };

  const styles = ctaStyles[urgency];
  const Icon = urgency === "critical" ? AlertTriangle : (urgency === "warning" ? Clock : Camera);

  return (
    <>
      {/* Sticky bottom CTA bar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t safe-area-pb",
          styles.container,
          urgency === "critical" && "animate-pulse"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Icon className={cn("h-5 w-5", styles.text)} />
          </div>

          {/* Content */}
          <button 
            type="button"
            className="flex-1 min-w-0 text-left"
            onClick={() => setIsSheetOpen(true)}
            aria-label="View inspection details"
          >
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold text-sm truncate", styles.text)}>
                {isPickupNeeded ? "Pickup Inspection" : "Return Inspection"}
              </span>
              <Badge className={cn("text-xs shrink-0", styles.badge)}>
                {getTimingText()}
              </Badge>
            </div>
            <p className={cn("text-xs truncate", styles.subtext)}>
              {equipmentTitle}
            </p>
          </button>

          {/* Expand button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn("shrink-0 h-8 w-8", styles.text)}
            onClick={() => setIsSheetOpen(true)}
            aria-label="Expand inspection details"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>

          {/* Primary action */}
          <Button
            size="sm"
            className={cn("shrink-0 font-semibold", styles.button)}
            onClick={handlePrimaryAction}
            aria-label={`Start ${isPickupNeeded ? "pickup" : "return"} inspection`}
          >
            Start
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Bottom Sheet for full details */}
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
