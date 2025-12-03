import { useEffect, useState } from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateRentalCountdown,
  formatRentalCountdown,
  type RentalCountdownData,
} from "@/types/rental";

interface RentalCountdownProps {
  startDate: string | Date;
  endDate: string | Date;
  className?: string;
  showProgress?: boolean;
  compact?: boolean;
}

export default function RentalCountdown({
  startDate,
  endDate,
  className,
  showProgress = true,
  compact = false,
}: RentalCountdownProps) {
  const [countdown, setCountdown] = useState<RentalCountdownData>(() =>
    calculateRentalCountdown(startDate, endDate)
  );

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(calculateRentalCountdown(startDate, endDate));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startDate, endDate]);

  // Determine urgency styling
  const getUrgencyStyles = () => {
    if (countdown.isOverdue) {
      return {
        container: "bg-destructive/10 border-destructive/30 text-destructive",
        progress: "bg-destructive",
        icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
      };
    }
    if (countdown.progressPercentage >= 90) {
      return {
        container: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400",
        progress: "bg-orange-500",
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      };
    }
    if (countdown.progressPercentage >= 75) {
      return {
        container: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400",
        progress: "bg-amber-500",
        icon: <Clock className="h-5 w-5 text-amber-500" />,
      };
    }
    return {
      container: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400",
      progress: "bg-emerald-500",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    };
  };

  const styles = getUrgencyStyles();

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {styles.icon}
        <span className="text-sm font-medium">
          {formatRentalCountdown(countdown)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        styles.container,
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        {styles.icon}
        <span className="font-medium">Time Remaining</span>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-bold tracking-tight">
          {countdown.isOverdue ? (
            "Overdue"
          ) : countdown.daysRemaining > 0 ? (
            <>
              {countdown.daysRemaining}{" "}
              <span className="text-lg font-normal opacity-80">
                day{countdown.daysRemaining !== 1 ? "s" : ""}
              </span>
              {countdown.hoursRemaining > 0 && (
                <>
                  {", "}
                  {countdown.hoursRemaining}{" "}
                  <span className="text-lg font-normal opacity-80">hr</span>
                </>
              )}
            </>
          ) : countdown.hoursRemaining > 0 ? (
            <>
              {countdown.hoursRemaining}{" "}
              <span className="text-lg font-normal opacity-80">hr</span>
              {", "}
              {countdown.minutesRemaining}{" "}
              <span className="text-lg font-normal opacity-80">min</span>
            </>
          ) : (
            <>
              {countdown.minutesRemaining}{" "}
              <span className="text-lg font-normal opacity-80">min</span>
            </>
          )}
        </div>
      </div>

      {showProgress && (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                styles.progress
              )}
              style={{ width: `${countdown.progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs opacity-70">
            <span>{countdown.progressPercentage}% complete</span>
            <span>
              Return by:{" "}
              {countdown.endDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

