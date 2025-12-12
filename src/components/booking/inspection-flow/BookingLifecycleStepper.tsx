import { CheckCircle2, Circle, Clock, Camera, Package, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPast, isFuture, differenceInHours } from "date-fns";

export interface BookingLifecycleStep {
  id: string;
  label: string;
  description?: string;
  status: "complete" | "current" | "upcoming" | "blocked";
  icon: React.ReactNode;
}

interface BookingLifecycleStepperProps {
  hasPayment: boolean;
  hasPickupInspection: boolean;
  hasReturnInspection: boolean;
  startDate: Date;
  endDate: Date;
  bookingStatus: string;
  className?: string;
  compact?: boolean;
}

export default function BookingLifecycleStepper({
  hasPayment,
  hasPickupInspection,
  hasReturnInspection,
  startDate,
  endDate,
  bookingStatus,
  className,
  compact = false,
}: BookingLifecycleStepperProps) {
  const now = new Date();
  
  // Use booking status from database if available, otherwise infer from dates
  const isActive = bookingStatus === "active" || (isPast(startDate) && isFuture(endDate));
  const isCompleted = bookingStatus === "completed";
  const isCancelled = bookingStatus === "cancelled";
  const rentalEnded = isPast(endDate);
  
  // Return inspection becomes "current" when rental is near end (within 24h) or has ended
  const hoursUntilEnd = differenceInHours(endDate, now);
  const isReturnTime = hoursUntilEnd <= 24 || rentalEnded;

  // Define all lifecycle steps
  const getSteps = (): BookingLifecycleStep[] => {
    // Payment step
    const paymentStatus = hasPayment ? "complete" : (isCancelled ? "blocked" : "current");
    
    // Pickup inspection step
    let pickupStatus: BookingLifecycleStep["status"] = "upcoming";
    if (hasPickupInspection) {
      pickupStatus = "complete";
    } else if (hasPayment && !isCancelled) {
      pickupStatus = "current";
    } else if (isCancelled) {
      pickupStatus = "blocked";
    }
    
    // Active rental step - "complete" once pickup is done and rental has started
    let activeStatus: BookingLifecycleStep["status"] = "upcoming";
    if (isCancelled) {
      activeStatus = "blocked";
    } else if (hasPickupInspection && isActive) {
      // Rental is active - mark as complete to show progress
      activeStatus = "complete";
    } else if (hasPickupInspection && (isCompleted || hasReturnInspection || rentalEnded)) {
      // Rental completed or return inspection done or rental period ended
      activeStatus = "complete";
    }
    
    // Return inspection step - "current" when it's time for return (near end or ended)
    let returnStatus: BookingLifecycleStep["status"] = "upcoming";
    if (isCancelled) {
      returnStatus = "blocked";
    } else if (hasReturnInspection) {
      returnStatus = "complete";
    } else if (hasPickupInspection && isReturnTime) {
      // It's return time (within 24h of end or past end)
      returnStatus = "current";
    } else if (hasPickupInspection && isActive) {
      // Rental is active but not yet return time - show as ready/upcoming
      returnStatus = "upcoming";
    }
    
    // Complete step
    let completeStatus: BookingLifecycleStep["status"] = "upcoming";
    if (isCompleted && hasPickupInspection && hasReturnInspection) {
      completeStatus = "complete";
    } else if (hasReturnInspection && !isCompleted) {
      // Return done but not yet marked complete
      completeStatus = "current";
    } else if (isCancelled) {
      completeStatus = "blocked";
    }

    // Descriptions
    const getActiveDescription = () => {
      if (bookingStatus === "active" && !isReturnTime) return "Rental in progress";
      if (isReturnTime && !hasReturnInspection) return "Return due";
      if (hasReturnInspection || isCompleted) return "Completed";
      return "Upcoming";
    };

    return [
      {
        id: "payment",
        label: "Payment",
        description: hasPayment ? "Confirmed" : "Awaiting payment",
        status: paymentStatus,
        icon: <CreditCard className="h-4 w-4" />,
      },
      {
        id: "pickup",
        label: "Pickup",
        description: hasPickupInspection ? "Documented" : "Inspection required",
        status: pickupStatus,
        icon: <Camera className="h-4 w-4" />,
      },
      {
        id: "active",
        label: "Active",
        description: getActiveDescription(),
        status: activeStatus,
        icon: <Package className="h-4 w-4" />,
      },
      {
        id: "return",
        label: "Return",
        description: hasReturnInspection ? "Documented" : (isReturnTime ? "Due now" : "Inspection required"),
        status: returnStatus,
        icon: <Camera className="h-4 w-4" />,
      },
      {
        id: "complete",
        label: "Complete",
        description: (hasPickupInspection && hasReturnInspection) ? "Finished" : "Pending",
        status: completeStatus,
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
    ];
  };

  const steps = getSteps();

  const getStepIcon = (step: BookingLifecycleStep) => {
    switch (step.status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-primary" />;
      case "current":
        return (
          <div className="relative">
            <Circle className="h-5 w-5 text-primary fill-primary/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
        );
      case "blocked":
        return <Circle className="h-5 w-5 text-muted-foreground/30" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground/50" />;
    }
  };

  const getStepStyles = (step: BookingLifecycleStep) => {
    switch (step.status) {
      case "complete":
        return {
          label: "text-foreground font-medium",
          description: "text-muted-foreground",
          line: "bg-primary",
        };
      case "current":
        return {
          label: "text-primary font-semibold",
          description: "text-primary/80",
          line: "bg-muted",
        };
      case "blocked":
        return {
          label: "text-muted-foreground/50",
          description: "text-muted-foreground/30",
          line: "bg-muted/30",
        };
      default:
        return {
          label: "text-muted-foreground",
          description: "text-muted-foreground/60",
          line: "bg-muted",
        };
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-start flex-1", className)}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex-1 flex flex-col items-center">
            {/* Circle and connecting lines row */}
            <div className="flex items-center w-full">
              {/* Line before circle (except first step) */}
              <div
                className={cn(
                  "flex-1 h-0.5 transition-colors",
                  index === 0 ? "bg-transparent" : step.status === "complete" ? "bg-primary" : "bg-muted"
                )}
              />
              {/* Circle */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border-2 transition-colors shrink-0",
                  step.status === "complete" && "bg-primary text-primary-foreground border-primary",
                  step.status === "current" && "bg-primary/20 text-primary border-primary",
                  step.status === "upcoming" && "bg-muted text-muted-foreground border-muted-foreground/20",
                  step.status === "blocked" && "bg-muted/30 text-muted-foreground/30 border-muted-foreground/10"
                )}
              >
                {step.status === "complete" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </div>
              {/* Line after circle (except last step) */}
              <div
                className={cn(
                  "flex-1 h-0.5 transition-colors",
                  index === steps.length - 1
                    ? "bg-transparent"
                    : step.status === "complete"
                    ? "bg-primary"
                    : "bg-muted"
                )}
              />
            </div>
            {/* Label */}
            <span
              className={cn(
                "text-[10px] mt-1 text-center px-0.5 leading-tight",
                step.status === "complete" && "text-foreground font-medium",
                step.status === "current" && "text-primary font-semibold",
                step.status === "upcoming" && "text-muted-foreground",
                step.status === "blocked" && "text-muted-foreground/40"
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Progress line */}
      <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-muted" />
      
      {/* Steps */}
      <div className="relative space-y-4">
        {steps.map((step, index) => {
          const styles = getStepStyles(step);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Icon */}
              <div className="relative z-10 flex items-center justify-center w-6 h-6 bg-background">
                {getStepIcon(step)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className={cn("text-sm", styles.label)}>
                  {step.label}
                </div>
                {step.description && (
                  <div className={cn("text-xs mt-0.5", styles.description)}>
                    {step.description}
                  </div>
                )}
              </div>

              {/* Step icon indicator */}
              <div className={cn(
                "text-muted-foreground/50",
                step.status === "complete" && "text-primary/50",
                step.status === "current" && "text-primary"
              )}>
                {step.icon}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
