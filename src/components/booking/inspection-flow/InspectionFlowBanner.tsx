import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Camera,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Package,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, differenceInHours, isPast, isFuture, isToday } from "date-fns";
import type { Database } from "@/lib/database.types";

type InspectionRow = Database["public"]["Tables"]["equipment_inspections"]["Row"];
export type ReturnInspectionSummary = Pick<
  InspectionRow,
  "id" | "verified_by_owner" | "verified_by_renter" | "timestamp" | "created_at"
>;

export type InspectionPhase =
  | "awaiting_pickup_inspection"
  | "pickup_inspection_complete"
  | "awaiting_return_inspection"
  | "return_inspection_complete"
  | "all_complete";

interface InspectionFlowBannerProps {
  bookingId: string;
  startDate: Date;
  endDate: Date;
  hasPickupInspection: boolean;
  hasReturnInspection: boolean;
  isOwner: boolean;
  returnInspection?: ReturnInspectionSummary | null;
  claimWindowHours?: number;
  className?: string;
}

export default function InspectionFlowBanner({
  bookingId,
  startDate,
  endDate,
  hasPickupInspection,
  hasReturnInspection,
  isOwner,
  returnInspection,
  claimWindowHours,
  className,
}: InspectionFlowBannerProps) {
  const navigate = useNavigate();
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
      // Check if we're near the end date or past it
      const daysUntilEnd = differenceInDays(endDate, today);
      if (daysUntilEnd <= 1 || isPast(endDate)) {
        return "awaiting_return_inspection";
      }
      return "pickup_inspection_complete";
    }
    return "all_complete";
  };

  const phase = getPhase();

  // Owners should not be prompted to start pickup inspections
  if (isOwner && phase === "awaiting_pickup_inspection") {
    return null;
  }

  // Calculate timing context
  const daysUntilStart = differenceInDays(startDate, today);
  const hoursUntilStart = differenceInHours(startDate, today);
  const daysUntilEnd = differenceInDays(endDate, today);
  const hoursUntilEnd = differenceInHours(endDate, today);
  const isStartingSoon = daysUntilStart <= 2 && daysUntilStart >= 0;
  const isEndingSoon = daysUntilEnd <= 2 && daysUntilEnd >= 0;
  const isActive = isPast(startDate) && isFuture(endDate);
  const isStartToday = isToday(startDate);
  const isEndToday = isToday(endDate);

  // Determine urgency level
  const getUrgency = (): "critical" | "warning" | "info" | "success" => {
    if (phase === "all_complete") return "success";
    if (phase === "pickup_inspection_complete") {
      return isEndingSoon ? "warning" : "info";
    }
    
    if (phase === "awaiting_pickup_inspection") {
      if (isPast(startDate) || isStartToday) return "critical";
      if (isStartingSoon) return "warning";
      return "info";
    }
    
    if (phase === "awaiting_return_inspection") {
      if (isPast(endDate) || isEndToday) return "critical";
      if (isEndingSoon) return "warning";
      return "info";
    }
    
    return "info";
  };

  const urgency = getUrgency();

  // Get timing text
  const getTimingText = (): string => {
    if (phase === "awaiting_pickup_inspection") {
      if (isPast(startDate)) {
        return "Rental has started - inspection overdue!";
      }
      if (isStartToday) {
        return "Rental starts today!";
      }
      if (hoursUntilStart < 24) {
        return `Rental starts in ${hoursUntilStart} hours`;
      }
      if (daysUntilStart === 1) {
        return "Rental starts tomorrow";
      }
      return `Rental starts in ${daysUntilStart} days`;
    }
    
    if (phase === "awaiting_return_inspection") {
      if (isPast(endDate)) {
        return "Rental period ended - inspection overdue!";
      }
      if (isEndToday) {
        return "Rental ends today!";
      }
      if (hoursUntilEnd < 24) {
        return `Rental ends in ${hoursUntilEnd} hours`;
      }
      if (daysUntilEnd === 1) {
        return "Rental ends tomorrow";
      }
      return `Rental ends in ${daysUntilEnd} days`;
    }
    
    return "";
  };

  // Don't show banner if all inspections complete
  if (phase === "all_complete") {
    const windowHours = claimWindowHours ?? 48;
    const submittedAt = returnInspection?.timestamp || returnInspection?.created_at;
    const isClaimWindowExpired = submittedAt
      ? Date.now() > new Date(submittedAt).getTime() + windowHours * 60 * 60 * 1000
      : false;
    const ownerNeedsReturnReview =
      isOwner &&
      !!returnInspection?.id &&
      !!returnInspection.verified_by_renter &&
      !returnInspection.verified_by_owner &&
      !isClaimWindowExpired;

    if (ownerNeedsReturnReview) {
      return (
        <Alert
          className={cn(
            "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 py-3",
            className
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <AlertTitle className="text-sm font-semibold leading-tight text-amber-800 dark:text-amber-200">
                  Return inspection submitted
                </AlertTitle>
                <AlertDescription className="text-xs mt-0.5 line-clamp-2 text-amber-700 dark:text-amber-300">
                  Review and confirm the return, or file a claim
                  {claimWindowHours ? ` within ${claimWindowHours} hours` : ""}.
                </AlertDescription>
              </div>
            </div>

            <Button
              onClick={() => navigate(`/inspection/${bookingId}/view/return`)}
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Review Return
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </Alert>
      );
    }

    return (
      <Alert className={cn("border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 py-2.5", className)}>
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-sm text-green-800 dark:text-green-200">All Inspections Complete</AlertTitle>
        <AlertDescription className="text-xs text-green-700 dark:text-green-300">
          Both pickup and return inspections documented. Rental fully processed.
        </AlertDescription>
      </Alert>
    );
  }

  // Pickup inspection complete, rental active, not yet time for return
  if (phase === "pickup_inspection_complete" && !isEndingSoon) {
    return (
      <Alert className={cn("border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 py-2.5", className)}>
        <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-sm text-blue-800 dark:text-blue-200">Rental Active</AlertTitle>
        <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
          Pickup inspection complete. Return inspection needed by {endDate.toLocaleDateString()}.
        </AlertDescription>
      </Alert>
    );
  }

  // Style based on urgency
  const urgencyStyles = {
    critical: {
      container: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 animate-pulse",
      icon: "text-red-600 dark:text-red-400",
      title: "text-red-800 dark:text-red-200",
      description: "text-red-700 dark:text-red-300",
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
    warning: {
      container: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
      icon: "text-amber-600 dark:text-amber-400",
      title: "text-amber-800 dark:text-amber-200",
      description: "text-amber-700 dark:text-amber-300",
      button: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    info: {
      container: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
      icon: "text-blue-600 dark:text-blue-400",
      title: "text-blue-800 dark:text-blue-200",
      description: "text-blue-700 dark:text-blue-300",
      button: "",
    },
    success: {
      container: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
      icon: "text-green-600 dark:text-green-400",
      title: "text-green-800 dark:text-green-200",
      description: "text-green-700 dark:text-green-300",
      button: "",
    },
  };

  const styles = urgencyStyles[urgency];
  const timingText = getTimingText();

  const handleInspectionClick = () => {
    if (phase === "awaiting_pickup_inspection") {
      navigate(`/inspection/${bookingId}/pickup`);
    } else if (
      phase === "awaiting_return_inspection" ||
      (phase === "pickup_inspection_complete" && isEndingSoon)
    ) {
      if (isOwner) return;
      navigate(`/inspection/${bookingId}/return`);
    }
  };

  const getIcon = () => {
    if (urgency === "critical") return <AlertTriangle className={cn("h-5 w-5", styles.icon)} />;
    if (phase === "awaiting_pickup_inspection" || phase === "awaiting_return_inspection") {
      return <Camera className={cn("h-5 w-5", styles.icon)} />;
    }
    return <Clock className={cn("h-5 w-5", styles.icon)} />;
  };

  const getTitle = () => {
    if (phase === "awaiting_pickup_inspection") {
      return urgency === "critical" ? "Pickup Inspection Required Now!" : "Pickup Inspection Required";
    }
    if (phase === "awaiting_return_inspection") {
      return urgency === "critical" ? "Return Inspection Required Now!" : "Return Inspection Required";
    }
    if (phase === "pickup_inspection_complete" && isEndingSoon) {
      return "Return Inspection Coming Up";
    }
    return "Inspection Required";
  };

  const getDescription = () => {
    const role = isOwner ? "owner" : "renter";
    
    if (phase === "awaiting_pickup_inspection") {
      return `As the ${role}, you must document the equipment condition before pickup. This protects both parties and is required to proceed with the rental.`;
    }
    if (phase === "awaiting_return_inspection") {
      if (isOwner) {
        return "Waiting for the renter to submit the return inspection. You'll be able to review and confirm once it's submitted.";
      }
      return `As the ${role}, you must document the equipment condition upon return. This is required to complete the rental and release the security deposit.`;
    }
    if (phase === "pickup_inspection_complete" && isEndingSoon) {
      return `Pickup inspection is done. As the ${role}, be ready to document the return condition once the rental ends.`;
    }
    return "";
  };

  const showActionButton =
    !isOwner &&
    (phase === "awaiting_pickup_inspection" ||
      phase === "awaiting_return_inspection" ||
      (phase === "pickup_inspection_complete" && isEndingSoon));

  return (
    <Alert className={cn(styles.container, "py-3", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <AlertTitle className={cn("text-sm font-semibold leading-tight", styles.title)}>
              {getTitle()}
            </AlertTitle>
            <AlertDescription className={cn("text-xs mt-0.5 line-clamp-2", styles.description)}>
              {getDescription()}
            </AlertDescription>
            {timingText && (
              <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", styles.title)}>
                <Calendar className="h-3 w-3" />
                {timingText}
              </div>
            )}
          </div>
        </div>
        
        {showActionButton && (
          <Button
            onClick={handleInspectionClick}
            className={cn("shrink-0", styles.button)}
            size="sm"
          >
            <Camera className="h-3.5 w-3.5 mr-1.5" />
            {phase === "awaiting_pickup_inspection" ? "Complete Pickup" : "Complete Return"}
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        )}
      </div>
    </Alert>
  );
}
