import type { ConversationWithDetails } from "../../types/messaging";
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import { MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";
import { LastSeenBadge } from "./LastSeenBadge";

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedConversationId?: string;
  onSelectConversation: (conversation: ConversationWithDetails) => void;
  loading?: boolean;
}

const ConversationList = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  loading = false,
}: ConversationListProps) => {
  const { user } = useAuth();
  const { isOnline } = usePresence();

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted" />
        <p>No conversations yet</p>
        <p className="text-sm">Start a conversation by booking equipment</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const otherParticipant = conversation.participants.find(
          (p) => p.id !== user?.id
        );
        const isSelected = conversation.id === selectedConversationId;

        return (
          <Card
            key={conversation.id}
            className={`cursor-pointer transition-colors ${
              isSelected ? "bg-primary/5 border-primary" : "hover:bg-accent"
            }`}
            onClick={() => onSelectConversation(conversation)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-2">
                {/* Avatar with online status indicator */}
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {otherParticipant?.email?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {otherParticipant && (
                    <OnlineStatusIndicator
                      isOnline={isOnline(otherParticipant.id)}
                      size="md"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm truncate">
                      {otherParticipant?.email || "Unknown User"}
                    </h3>
                    <div className="flex items-center space-x-2 shrink-0 ml-2">
                      {conversation.booking_request && (
                        <Badge variant="outline" className="text-xs">
                          {conversation.booking_request.status}
                        </Badge>
                      )}
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  {otherParticipant && (
                    <LastSeenBadge
                      isOnline={isOnline(otherParticipant.id)}
                      lastSeenAt={
                        (otherParticipant as any).last_seen_at || null
                      }
                      className="mb-1"
                    />
                  )}
                  {conversation.booking_request && (
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.booking_request.equipment.title}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ConversationList;
