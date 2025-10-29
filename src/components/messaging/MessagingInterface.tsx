import { useState, useEffect, useRef } from "react";
import { useMessaging } from "../../hooks/useMessaging";
import type { ConversationWithDetails } from "../../types/messaging";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import ConversationList from "./ConversationList";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

interface MessagingInterfaceProps {
  initialConversationId?: string;
  onClose?: () => void;
}

const MessagingInterface = ({
  initialConversationId,
  onClose,
}: MessagingInterfaceProps) => {
  const { conversations, messages, loading, fetchMessages, sendMessage } =
    useMessaging();

  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithDetails | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set initial conversation
  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const conversation = conversations.find(
        (c) => c.id === initialConversationId
      );
      if (conversation) {
        setSelectedConversation(conversation);
        fetchMessages(conversation.id);
      }
    }
  }, [initialConversationId, conversations, fetchMessages]);

  const handleSelectConversation = async (
    conversation: ConversationWithDetails
  ) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    await sendMessage({
      conversation_id: selectedConversation.id,
      content,
      message_type: "text",
    });
  };

  const otherParticipant = selectedConversation?.participants.find(
    (p) => p.id !== selectedConversation.participants[0]?.id
  );

  return (
    <div className="flex h-[600px] border border-border rounded-lg overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r border-border bg-muted">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Messages</h2>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="p-4">
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversation?.id}
            onSelectConversation={handleSelectConversation}
            loading={loading}
          />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {otherParticipant?.email || "Unknown User"}
                  </h3>
                  {selectedConversation.booking_request && (
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.booking_request.equipment.title}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={loading}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingInterface;
