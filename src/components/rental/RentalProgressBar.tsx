import { cn } from "@/lib/utils";
import { calculateRentalCountdown } from "@/types/rental";

interface RentalProgressBarProps {
  startDate: string | Date;
  endDate: string | Date;
  className?: string;
  showLabels?: boolean;
  height?: "sm" | "md" | "lg";
}

export default function RentalProgressBar({
  startDate,
  endDate,
  className,
  showLabels = true,
  height = "md",
}: RentalProgressBarProps) {
  const countdown = calculateRentalCountdown(startDate, endDate);

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const getProgressColor = () => {
    if (countdown.isOverdue) return "bg-destructive";
    if (countdown.progressPercentage >= 90) return "bg-orange-500";
    if (countdown.progressPercentage >= 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "w-full rounded-full bg-muted overflow-hidden",
          heightClasses[height]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            getProgressColor()
          )}
          style={{ width: `${Math.min(countdown.progressPercentage, 100)}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
          <span>
            {new Date(startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="font-medium">
            {countdown.progressPercentage}% complete
          </span>
          <span>
            {new Date(endDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      )}
    </div>
  );
}

