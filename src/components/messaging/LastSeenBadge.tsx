import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LastSeenBadgeProps {
  isOnline: boolean;
  lastSeenAt?: string | null;
  className?: string;
}

export const LastSeenBadge = ({
  isOnline,
  lastSeenAt,
  className,
}: LastSeenBadgeProps) => {
  if (isOnline) {
    return (
      <Badge
        variant="secondary"
        className={cn("text-xs font-normal", className)}
      >
        Active now
      </Badge>
    );
  }

  if (!lastSeenAt) {
    return (
      <Badge
        variant="outline"
        className={cn("text-xs font-normal text-muted-foreground", className)}
      >
        Offline
      </Badge>
    );
  }

  try {
    const lastSeenDate = new Date(lastSeenAt);
    const distance = formatDistanceToNow(lastSeenDate, {
      addSuffix: true,
    });

    return (
      <Badge
        variant="outline"
        className={cn("text-xs font-normal text-muted-foreground", className)}
        title={lastSeenDate.toLocaleString()}
      >
        Last seen {distance}
      </Badge>
    );
  } catch (error) {
    console.error("Error formatting last seen date:", error);
    return (
      <Badge
        variant="outline"
        className={cn("text-xs font-normal text-muted-foreground", className)}
      >
        Offline
      </Badge>
    );
  }
};

