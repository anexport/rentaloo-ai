import { ShieldCheck, ShieldX, Clock, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VerificationStatus } from "@/types/verification";
import { cn } from "@/lib/utils";

type VerificationBadgeProps = {
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

const statusConfig: Record<
  VerificationStatus,
  {
    icon: typeof ShieldCheck;
    label: string;
    containerClass: string;
    iconClass: string;
  }
> = {
  verified: {
    icon: ShieldCheck,
    label: "Verified",
    containerClass:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800",
    iconClass: "text-green-600 dark:text-green-400",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    containerClass:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  rejected: {
    icon: ShieldX,
    label: "Rejected",
    containerClass:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    iconClass: "text-red-600 dark:text-red-400",
  },
  unverified: {
    icon: ShieldAlert,
    label: "Unverified",
    containerClass:
      "bg-muted text-muted-foreground border-border",
    iconClass: "text-muted-foreground",
  },
};

const sizeConfig = {
  sm: {
    icon: "h-3 w-3",
    badge: "text-[10px] px-1.5 py-0.5 gap-1",
    iconOnly: "h-5 w-5",
  },
  md: {
    icon: "h-3.5 w-3.5",
    badge: "text-xs px-2 py-0.5 gap-1.5",
    iconOnly: "h-6 w-6",
  },
  lg: {
    icon: "h-4 w-4",
    badge: "text-sm px-2.5 py-1 gap-1.5",
    iconOnly: "h-7 w-7",
  },
};

const VerificationBadge = ({
  status,
  size = "md",
  showLabel = true,
  className,
}: VerificationBadgeProps) => {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  if (!showLabel) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full border",
          config.containerClass,
          sizes.iconOnly,
          className
        )}
        title={config.label}
        role="img"
        aria-label={`${status} verification status`}
      >
        <Icon className={cn(sizes.icon, config.iconClass)} />
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border inline-flex items-center",
        config.containerClass,
        sizes.badge,
        className
      )}
    >
      <Icon className={cn(sizes.icon, config.iconClass)} />
      <span>{config.label}</span>
    </Badge>
  );
};

export default VerificationBadge;
