import type { ConversationWithDetails } from "../../types/messaging";
import { useAuth } from "../../hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

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
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">
                    {otherParticipant?.email || "Unknown User"}
                  </h3>
                  {conversation.booking_request && (
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.booking_request.equipment.title}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {conversation.booking_request && (
                    <Badge variant="outline" className="text-xs">
                      {conversation.booking_request.status}
                    </Badge>
                  )}
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>

              {conversation.last_message && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground truncate flex-1">
                    {conversation.last_message.content}
                  </p>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDistanceToNow(
                      new Date(conversation.last_message.created_at || ""),
                      { addSuffix: true }
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ConversationList;
