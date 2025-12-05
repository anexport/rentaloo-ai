import { Shield, Mail, Phone, MapPin, CheckCircle, XCircle, type LucideIcon } from "lucide-react";
import type { UserVerificationProfile } from "@/types/verification";
import { cn } from "@/lib/utils";

type VerificationItem = {
  key: keyof Pick<UserVerificationProfile, "identityVerified" | "emailVerified" | "phoneVerified" | "addressVerified">;
  label: string;
  icon: LucideIcon;
};

const VERIFICATION_ITEMS: VerificationItem[] = [
  { key: "identityVerified", label: "Identity", icon: Shield },
  { key: "emailVerified", label: "Email", icon: Mail },
  { key: "phoneVerified", label: "Phone", icon: Phone },
  { key: "addressVerified", label: "Address", icon: MapPin },
];

type VerificationStatusGridProps = {
  profile: UserVerificationProfile;
  /** Compact mode for minimal display */
  compact?: boolean;
  /** Interactive mode adds hover effects and click handlers */
  interactive?: boolean;
  /** Callback when a verification item is clicked */
  onItemClick?: (key: string) => void;
  className?: string;
};

const VerificationStatusGrid = ({
  profile,
  compact = false,
  interactive = false,
  onItemClick,
  className,
}: VerificationStatusGridProps) => {
  const verifiedCount = VERIFICATION_ITEMS.filter(item => profile[item.key]).length;

  // Compact horizontal strip layout
  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {VERIFICATION_ITEMS.map(({ key, icon: Icon }) => {
          const isVerified = profile[key];
          return (
            <div
              key={key}
              className={cn(
                "relative p-1.5 rounded-lg transition-all duration-200",
                isVerified
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-muted/60"
              )}
              title={key.replace("Verified", "")}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  isVerified
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground/50"
                )}
              />
              {isVerified && (
                <CheckCircle className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 text-green-600 dark:text-green-400 fill-white dark:fill-background" />
              )}
            </div>
          );
        })}
        <span className="text-[10px] font-medium text-muted-foreground ml-1">
          {verifiedCount}/4
        </span>
      </div>
    );
  }

  // Full grid layout (horizontal on desktop, 2x2 on mobile)
  return (
    <div className={cn(
      "grid grid-cols-2 lg:grid-cols-4 gap-2",
      className
    )}>
      {VERIFICATION_ITEMS.map(({ key, label, icon: Icon }) => {
        const isVerified = profile[key];

        return (
          <button
            key={key}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onItemClick?.(key)}
            className={cn(
              "group relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-300",
              "bg-card/50 backdrop-blur-sm",
              interactive && "cursor-pointer hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
              !interactive && "cursor-default",
              isVerified
                ? "border-green-200/80 bg-gradient-to-br from-green-50/80 to-green-100/30 dark:border-green-800/50 dark:from-green-950/40 dark:to-green-900/20"
                : "border-border/50 hover:border-primary/30 hover:bg-accent/30"
            )}
          >
            {/* Icon container with glow effect */}
            <div
              className={cn(
                "relative p-2 rounded-lg transition-all duration-300",
                isVerified
                  ? "bg-green-100 dark:bg-green-900/50 shadow-sm shadow-green-200/50 dark:shadow-green-900/30"
                  : "bg-muted/80 group-hover:bg-primary/10"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-all duration-300",
                  isVerified
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground group-hover:text-primary"
                )}
              />
            </div>

            {/* Label and status */}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-foreground truncate">
                {label}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {isVerified ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                      Verified
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 text-muted-foreground/60" />
                    <span className="text-[10px] font-medium text-muted-foreground/60">
                      Not verified
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Hover ring effect for interactive */}
            {interactive && (
              <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-300" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default VerificationStatusGrid;
