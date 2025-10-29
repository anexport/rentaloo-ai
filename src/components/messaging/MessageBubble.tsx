import type { MessageWithSender } from "../../types/messaging";
import { useAuth } from "../../hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  message: MessageWithSender;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { user } = useAuth();
  const isOwnMessage = user?.id === message.sender_id;

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwnMessage
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <div className="text-sm">{message.content}</div>
        <div
          className={`text-xs mt-1 ${
            isOwnMessage
              ? "text-primary-foreground/70"
              : "text-muted-foreground"
          }`}
        >
          {formatDistanceToNow(new Date(message.created_at || ""), {
            addSuffix: true,
          })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
