import type { MessageWithSender } from "../../types/messaging";
import { useAuth } from "../../hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { SystemMessage } from "./shared/SystemMessage";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: MessageWithSender;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { user } = useAuth();
  const isOwnMessage = user?.id === message.sender_id;
  const isSystemMessage =
    message.message_type === "system" ||
    message.message_type === "booking_approved" ||
    message.message_type === "booking_cancelled";

  // System messages are centered and styled differently
  if (isSystemMessage) {
    const tone =
      message.message_type === "booking_approved"
        ? "success"
        : message.message_type === "booking_cancelled"
        ? "danger"
        : "info";

    return (
      <SystemMessage
        content={message.content}
        createdAt={message.created_at}
        tone={tone}
      />
    );
  }

  return (
    <div
      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={cn(
          "max-w-[min(85%,360px)] rounded-2xl px-4 py-3 text-sm shadow-sm",
          isOwnMessage
            ? "bg-primary text-primary-foreground"
            : "border border-border/70 bg-card text-foreground"
        )}
      >
        <div className="break-words">{message.content}</div>
        <div
          className={cn(
            "mt-2 text-xs",
            isOwnMessage
              ? "text-primary-foreground/70"
              : "text-muted-foreground"
          )}
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
