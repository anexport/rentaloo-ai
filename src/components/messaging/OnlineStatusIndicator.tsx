import { cn } from "@/lib/utils";

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export const OnlineStatusIndicator = ({
  isOnline,
  size = "md",
  className,
}: OnlineStatusIndicatorProps) => {
  return (
    <div
      className={cn(
        "absolute bottom-0 right-0 rounded-full border-2 border-background",
        sizeClasses[size],
        isOnline
          ? "bg-green-500 animate-pulse"
          : "bg-gray-400",
        className
      )}
      aria-label={isOnline ? "Online" : "Offline"}
      role="status"
    />
  );
};

