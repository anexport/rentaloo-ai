import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, isPast, isToday, isFuture } from "date-fns";
import MobileInspectionSheet from "./MobileInspectionSheet";
import type { InspectionPhase } from "./InspectionFlowBanner";

interface MobileInspectionCardProps {
  bookingId: string;
  equipmentTitle: string;
  startDate: Date;
  endDate: Date;
  hasPickupInspection: boolean;
  hasReturnInspection: boolean;
  isOwner: boolean;
  className?: string;
}

export default function MobileInspectionCard({
  bookingId,
  equipmentTitle,
  startDate,
  endDate,
  hasPickupInspection,
  hasReturnInspection,
  isOwner,
  className,
}: MobileInspectionCardProps) {
  const navigate = useNavigate();
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

  // Hide pickup prompts for owners
  if (isOwner && phase === "awaiting_pickup_inspection") {
    return null;
  }

  // Calculate progress percentage
  const getProgressPercentage = (): number => {
    if (hasPickupInspection && hasReturnInspection) return 100;
    if (hasPickupInspection || hasReturnInspection) return 50;
    return 0;
  };

  // Calculate timing
  const daysUntilStart = differenceInDays(startDate, today);
  const hoursUntilStart = Math.max(0, Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60)));
  const daysUntilEnd = differenceInDays(endDate, today);
  const hoursUntilEnd = Math.max(0, Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60)));

  // Determine urgency
  const getUrgency = (): "critical" | "warning" | "normal" | "success" => {
    if (phase === "all_complete") return "success";
    if (phase === "pickup_inspection_complete") return "normal";
    
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

  // Get timing text
  const getTimingText = (): string => {
    if (phase === "awaiting_pickup_inspection") {
      if (isPast(startDate)) return "Overdue!";
      if (isToday(startDate)) return "Due today";
      if (hoursUntilStart < 24) return `${hoursUntilStart}h left`;
      if (daysUntilStart === 1) return "Tomorrow";
      return `${daysUntilStart} days`;
    }
    if (phase === "awaiting_return_inspection") {
      if (isPast(endDate)) return "Overdue!";
      if (isToday(endDate)) return "Due today";
      if (hoursUntilEnd < 24) return `${hoursUntilEnd}h left`;
      if (daysUntilEnd === 1) return "Tomorrow";
      return `${daysUntilEnd} days`;
    }
    return "";
  };

  // Get action label
  const getActionLabel = (): string => {
    if (phase === "awaiting_pickup_inspection") return "Complete Pickup";
    if (phase === "awaiting_return_inspection") return "Complete Return";
    if (phase === "pickup_inspection_complete") return "Rental Active";
    return "All Complete";
  };

  // Get description
  const getDescription = (): string => {
    if (phase === "awaiting_pickup_inspection") return "Document equipment before pickup";
    if (phase === "awaiting_return_inspection") return "Document equipment upon return";
    if (phase === "pickup_inspection_complete") return "Return inspection needed at end";
    return "Both inspections documented";
  };

  // Styles based on urgency
  const cardStyles = {
    critical: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50",
    warning: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
    normal: "border-border bg-muted/30",
    success: "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/50",
  };

  const iconStyles = {
    critical: "text-red-600 dark:text-red-400",
    warning: "text-amber-600 dark:text-amber-400",
    normal: "text-primary",
    success: "text-green-600 dark:text-green-400",
  };

  const badgeStyles = {
    critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    normal: "bg-primary/10 text-primary border-primary/20",
    success: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800",
  };

  const buttonStyles = {
    critical: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    normal: "",
    success: "",
  };

  // Get icon
  const getIcon = () => {
    if (phase === "all_complete") return CheckCircle2;
    if (urgency === "critical") return AlertTriangle;
    if (urgency === "warning") return Clock;
    return Camera;
  };

  const Icon = getIcon();

  const handlePrimaryAction = () => {
    if (phase === "awaiting_pickup_inspection") {
      navigate(`/inspection/${bookingId}/pickup`);
    } else if (phase === "awaiting_return_inspection") {
      navigate(`/inspection/${bookingId}/return`);
    } else {
      setIsSheetOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl border p-4 space-y-3 transition-all",
          cardStyles[urgency],
          urgency === "critical" && "animate-pulse",
          className
        )}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                urgency === "success" ? "bg-green-100 dark:bg-green-900" : "bg-background"
              )}
            >
              <Icon className={cn("h-5 w-5", iconStyles[urgency])} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">
                  {getActionLabel()}
                </span>
                {getTimingText() && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs shrink-0", badgeStyles[urgency])}
                  >
                    {getTimingText()}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {getDescription()}
              </p>
            </div>
          </div>

          {/* Action area */}
          {phase !== "all_complete" && phase !== "pickup_inspection_complete" ? (
            <Button
              size="sm"
              className={cn("shrink-0", buttonStyles[urgency])}
              onClick={handlePrimaryAction}
            >
              Start
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => setIsSheetOpen(true)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {hasPickupInspection && hasReturnInspection
                ? "Complete"
                : hasPickupInspection
                ? "1 of 2 inspections"
                : "0 of 2 inspections"}
            </span>
            <span className="font-medium">{getProgressPercentage()}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-1.5" />
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
