import type { MessageWithSender } from "../../types/messaging";
import { useAuth } from "../../hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Info, CheckCircle, XCircle } from "lucide-react";

interface MessageBubbleProps {
  message: MessageWithSender;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { user } = useAuth();
  const isOwnMessage = user?.id === message.sender_id;
  const isSystemMessage = message.message_type === "system";

  // System messages are centered and styled differently
  if (isSystemMessage) {
    // Determine message type based on content
    const isApprovalMessage = message.content
      .toLowerCase()
      .includes("approved");
    const isCancellationMessage =
      message.content.toLowerCase().includes("cancelled") ||
      message.content.toLowerCase().includes("declined");

    // Get styles and icon based on message type
    let cardClasses = "";
    let textClasses = "";
    let icon = Info;

    if (isApprovalMessage) {
      // Green theme for approval
      cardClasses =
        "max-w-md px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-center space-x-2";
      textClasses = "text-xs text-green-600 mt-1";
      icon = CheckCircle;
    } else if (isCancellationMessage) {
      // Red theme for cancellation
      cardClasses =
        "max-w-md px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center space-x-2";
      textClasses = "text-xs text-red-600 mt-1";
      icon = XCircle;
    } else {
      // Default blue theme for other system messages
      cardClasses =
        "max-w-md px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 flex items-center space-x-2";
      textClasses = "text-xs text-blue-600 mt-1";
      icon = Info;
    }

    const IconComponent = icon;

    return (
      <div className="flex justify-center mb-4">
        <div className={cardClasses}>
          <IconComponent className="h-4 w-4 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm">{message.content}</div>
            <div className={textClasses}>
              {formatDistanceToNow(new Date(message.created_at || ""), {
                addSuffix: true,
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
