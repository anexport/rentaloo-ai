import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ConversationWithDetails } from "@/types/messaging";
import { OnlineStatusIndicator } from "../OnlineStatusIndicator";
import { LastSeenBadge } from "../LastSeenBadge";

interface ConversationListItemProps {
  conversation: ConversationWithDetails;
  isSelected?: boolean;
  onSelect: (conversation: ConversationWithDetails) => void;
  otherParticipantName: string;
  otherParticipantInitials: string;
  isOnline: boolean;
  lastSeenAt?: string | null;
  unread: boolean;
}

export const ConversationListItem = ({
  conversation,
  isSelected = false,
  onSelect,
  otherParticipantName,
  otherParticipantInitials,
  isOnline,
  lastSeenAt,
  unread,
}: ConversationListItemProps) => {
  const lastActivityTimestamp =
    conversation.last_message?.created_at ||
    conversation.updated_at ||
    conversation.created_at;

  let lastActivityLabel = "Just now";

  try {
    if (lastActivityTimestamp) {
      const date = new Date(lastActivityTimestamp);
      if (!isNaN(date.getTime())) {
        lastActivityLabel = formatDistanceToNow(date, {
          addSuffix: true,
        });
      }
    }
  } catch (error) {
    console.error("Error formatting conversation timestamp:", error);
    lastActivityLabel = "—";
  }

  const bookingRequest = conversation.booking_request;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      className="w-full text-left outline-none"
    >
      <Card
        className={cn(
          "group relative flex flex-col gap-0 rounded-xl border p-0 shadow-none transition-colors",
          "hover:bg-accent/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          unread
            ? "border-l-4 border-l-primary bg-primary/5"
            : "border-l-4 border-l-transparent",
          isSelected && "border border-primary bg-primary/10"
        )}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="relative shrink-0">
            <Avatar className="h-11 w-11">
              <AvatarFallback>{otherParticipantInitials}</AvatarFallback>
            </Avatar>
            <OnlineStatusIndicator
              isOnline={isOnline}
              size="md"
              className="absolute -bottom-1 -right-1"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-sm",
                    unread ? "font-semibold text-foreground" : "text-foreground"
                  )}
                  title={otherParticipantName}
                >
                  {otherParticipantName}
                </p>
                <LastSeenBadge
                  isOnline={isOnline}
                  lastSeenAt={lastSeenAt || null}
                  className="mt-1"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {lastActivityLabel}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {bookingRequest && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs font-medium">
                      {bookingRequest.status}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {bookingRequest.equipment.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bookingRequest.start_date} → {bookingRequest.end_date}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total{" "}
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(bookingRequest.total_amount)}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              {unread && (
                <Badge variant="secondary" className="text-xs font-medium">
                  New
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </button>
  );
};
