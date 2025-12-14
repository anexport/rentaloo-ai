import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Package,
  Clock,
  ChevronRight,
  Eye,
  FileWarning,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, differenceInHours, isPast, isFuture, isToday, format } from "date-fns";
import type { InspectionPhase, ReturnInspectionSummary } from "./InspectionFlowBanner";

interface MobileInspectionSheetProps {
  bookingId: string;
  equipmentTitle: string;
  startDate: Date;
  endDate: Date;
  hasPickupInspection: boolean;
  hasReturnInspection: boolean;
  isOwner: boolean;
  returnInspection?: ReturnInspectionSummary | null;
  claimWindowHours?: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileInspectionSheet({
  bookingId,
  equipmentTitle,
  startDate,
  endDate,
  hasPickupInspection,
  hasReturnInspection,
  isOwner,
  returnInspection,
  claimWindowHours,
  isOpen,
  onOpenChange,
}: MobileInspectionSheetProps) {
  const navigate = useNavigate();
  // Guard against invalid dates so date-fns helpers don't throw.
  if (
    !startDate ||
    Number.isNaN(startDate.getTime()) ||
    !endDate ||
    Number.isNaN(endDate.getTime())
  ) {
    console.error("Invalid dates provided to MobileInspectionSheet");
    return null;
  }
  const today = new Date();

  const windowHours = claimWindowHours ?? 48;
  const submittedAt = returnInspection?.timestamp || returnInspection?.created_at;
  const isClaimWindowExpired = submittedAt
    ? Date.now() > new Date(submittedAt).getTime() + windowHours * 60 * 60 * 1000
    : false;
  const ownerNeedsReturnReview =
    isOwner &&
    hasReturnInspection &&
    !!returnInspection?.verified_by_renter &&
    !returnInspection?.verified_by_owner &&
    !isClaimWindowExpired;

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

  // Owners should not see pickup inspection prompts
  if (isOwner && phase === "awaiting_pickup_inspection") {
    return null;
  }

  // Calculate progress percentage
  const getProgressPercentage = (): number => {
    if (hasPickupInspection && hasReturnInspection) return 100;
    if (hasPickupInspection) return 66;
    return 33;
  };

  // Calculate timing context
  const daysUntilStart = differenceInDays(startDate, today);
  const hoursUntilStart = differenceInHours(startDate, today);
  const daysUntilEnd = differenceInDays(endDate, today);
  const hoursUntilEnd = differenceInHours(endDate, today);
  const isActive = isPast(startDate) && isFuture(endDate);

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

  // Get timing text for the current phase
  const getTimingText = (): string => {
    if (phase === "awaiting_pickup_inspection") {
      if (isPast(startDate)) return "Overdue";
      if (isToday(startDate)) return "Today";
      if (hoursUntilStart < 24) return `${hoursUntilStart}h`;
      if (daysUntilStart === 1) return "Tomorrow";
      return `${daysUntilStart} days`;
    }
    if (phase === "awaiting_return_inspection") {
      if (isPast(endDate)) return "Overdue";
      if (isToday(endDate)) return "Today";
      if (hoursUntilEnd < 24) return `${hoursUntilEnd}h`;
      if (daysUntilEnd === 1) return "Tomorrow";
      return `${daysUntilEnd} days`;
    }
    return "";
  };

  const handleInspectionAction = (type: "pickup" | "return") => {
    onOpenChange(false);
    navigate(`/inspection/${bookingId}/${type}`);
  };

  const handleViewInspection = (type: "pickup" | "return") => {
    onOpenChange(false);
    navigate(`/inspection/${bookingId}/view/${type}`);
  };

  const handleFileClaim = () => {
    onOpenChange(false);
    navigate(`/claims/file/${bookingId}`);
  };

  // Step data for the visual stepper
  const steps = [
    {
      id: "pickup",
      label: "Pickup Inspection",
      description: hasPickupInspection 
        ? "Completed" 
        : "Document condition before pickup",
      status: hasPickupInspection ? "complete" : (phase === "awaiting_pickup_inspection" ? "current" : "upcoming"),
      action: hasPickupInspection 
        ? () => handleViewInspection("pickup")
        : () => handleInspectionAction("pickup"),
      actionLabel: hasPickupInspection ? "View" : "Start",
      icon: hasPickupInspection ? CheckCircle2 : Camera,
      timing: !hasPickupInspection ? getTimingText() : undefined,
    },
    {
      id: "active",
      label: "Rental Period",
      description: isActive 
        ? `Ends ${format(endDate, "MMM d")}` 
        : (hasPickupInspection ? "Completed" : `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`),
      status: isActive ? "current" : (hasPickupInspection && !isFuture(startDate) ? "complete" : "upcoming"),
      icon: Package,
    },
    {
      id: "return",
      label: "Return Inspection",
      description: hasReturnInspection
        ? ownerNeedsReturnReview
          ? `Submitted — confirm${claimWindowHours ? ` within ${claimWindowHours}h` : ""}`
          : "Completed"
        : isOwner
          ? "Awaiting renter submission"
          : "Document condition upon return",
      status: hasReturnInspection ? "complete" : (phase === "awaiting_return_inspection" ? "current" : "upcoming"),
      action: hasReturnInspection
        ? () => handleViewInspection("return")
        : isOwner
          ? undefined
          : (hasPickupInspection ? () => handleInspectionAction("return") : undefined),
      actionLabel: hasReturnInspection ? "View" : (isOwner ? undefined : "Start"),
      icon: hasReturnInspection ? CheckCircle2 : Camera,
      timing: hasPickupInspection && !hasReturnInspection ? getTimingText() : undefined,
    },
  ];

  const urgencyStyles = {
    critical: {
      badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
      button: "bg-amber-600 hover:bg-amber-700",
    },
    normal: {
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      button: "",
    },
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl px-0">
        {/* Drag handle indicator */}
        <div className="flex justify-center pt-2 pb-4">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
        </div>

        <SheetHeader className="px-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl">Inspection Progress</SheetTitle>
              <SheetDescription className="line-clamp-1">
                {equipmentTitle}
              </SheetDescription>
            </div>
            {phase !== "all_complete" && (
              <Badge className={cn("shrink-0", urgencyStyles[urgency].badge)}>
                {urgency === "critical" && <AlertTriangle className="h-3 w-3 mr-1" />}
                {urgency === "warning" && <Clock className="h-3 w-3 mr-1" />}
                {getTimingText()}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Progress bar */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{getProgressPercentage()}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        {/* Steps */}
        <div className="px-4 space-y-2 overflow-y-auto max-h-[40vh]">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isComplete = step.status === "complete";
            const isCurrent = step.status === "current";
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl transition-colors",
                  isCurrent && "bg-primary/5 border border-primary/20",
                  isComplete && "bg-muted/50",
                  !isCurrent && !isComplete && "opacity-60"
                )}
              >
                {/* Step icon */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                    isComplete && "bg-green-100 dark:bg-green-900",
                    isCurrent && "bg-primary/10",
                    !isComplete && !isCurrent && "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6",
                      isComplete && "text-green-600 dark:text-green-400",
                      isCurrent && "text-primary",
                      !isComplete && !isCurrent && "text-muted-foreground"
                    )}
                  />
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-medium",
                        isCurrent && "text-primary"
                      )}
                    >
                      {step.label}
                    </span>
                    {step.timing && isCurrent && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          urgency === "critical" && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                          urgency === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                        )}
                      >
                        {step.timing}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {step.description}
                  </p>
                </div>

                {/* Action button */}
                {step.action && (
                  <Button
                    size="sm"
                    variant={isCurrent ? "default" : "ghost"}
                    onClick={step.action}
                    className={cn(
                      "shrink-0",
                      isCurrent && urgency !== "normal" && urgencyStyles[urgency].button
                    )}
                  >
                    {step.actionLabel}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <SheetFooter className="px-6 pt-4 border-t mt-4 flex-row gap-2">
          {/* View inspections shortcut */}
          {(hasPickupInspection || hasReturnInspection) && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (hasReturnInspection) {
                  handleViewInspection("return");
                } else if (hasPickupInspection) {
                  handleViewInspection("pickup");
                }
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Inspections
            </Button>
          )}

          {/* File claim (owner only) */}
          {isOwner &&
            hasReturnInspection &&
            !isClaimWindowExpired &&
            !returnInspection?.verified_by_owner && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleFileClaim}
            >
              <FileWarning className="h-4 w-4 mr-2" />
              File Claim
            </Button>
          )}

          {/* Primary action based on current phase */}
          {phase === "awaiting_pickup_inspection" && (
            <Button
              className={cn("flex-1", urgencyStyles[urgency].button)}
              onClick={() => handleInspectionAction("pickup")}
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Pickup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {!isOwner && phase === "awaiting_return_inspection" && (
            <Button
              className={cn("flex-1", urgencyStyles[urgency].button)}
              onClick={() => handleInspectionAction("return")}
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Return
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {ownerNeedsReturnReview && (
            <Button
              className="flex-1"
              onClick={() => handleViewInspection("return")}
            >
              <Eye className="h-4 w-4 mr-2" />
              Review Return
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {phase === "all_complete" && !ownerNeedsReturnReview && (
            <Button variant="secondary" className="flex-1" disabled>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              All Complete
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
