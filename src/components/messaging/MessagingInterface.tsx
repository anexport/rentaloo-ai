import { useState, useEffect, useRef } from "react";
import { useMessaging } from "../../hooks/useMessaging";
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import type { ConversationWithDetails } from "../../types/messaging";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import ConversationList from "./ConversationList";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";
import { LastSeenBadge } from "./LastSeenBadge";
import { TypingIndicator } from "./TypingIndicator";
import { supabase } from "../../lib/supabase";

interface MessagingInterfaceProps {
  initialConversationId?: string;
  onClose?: () => void;
}

const MessagingInterface = ({
  initialConversationId,
  onClose,
}: MessagingInterfaceProps) => {
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const { conversations, messages, loading, fetchMessages, sendMessage } =
    useMessaging();

  const [selectedConversation, setSelectedConversation] =
    useState<ConversationWithDetails | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const typingChannelRef = useRef<any>(null);

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

    // Stop typing indicator
    if (typingChannelRef.current && user?.id) {
      typingChannelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          user_id: user.id,
          conversation_id: selectedConversation.id,
          is_typing: false,
        },
      });
    }

    await sendMessage({
      conversation_id: selectedConversation.id,
      content,
      message_type: "text",
    });
  };

  const handleTyping = (content: string) => {
    if (!selectedConversation || !user?.id || !typingChannelRef.current) return;

    // Clear existing timeout
    const existingTimeout = typingTimeoutRef.current.get(selectedConversation.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Broadcast typing status
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: user.id,
        conversation_id: selectedConversation.id,
        is_typing: content.length > 0,
      },
    });

    // Set timeout to stop typing after 3 seconds of inactivity
    if (content.length > 0) {
      const timeout = setTimeout(() => {
        typingChannelRef.current?.send({
          type: "broadcast",
          event: "typing",
          payload: {
            user_id: user.id,
            conversation_id: selectedConversation.id,
            is_typing: false,
          },
        });
        typingTimeoutRef.current.delete(selectedConversation.id);
      }, 3000);
      typingTimeoutRef.current.set(selectedConversation.id, timeout);
    }
  };

  // Set up typing indicator channel
  useEffect(() => {
    if (!selectedConversation || !user) {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      setTypingUsers(new Set());
      return;
    }

    const topic = `room:${selectedConversation.id}:typing`;
    const channel = supabase.channel(topic, {
      config: {
        broadcast: { self: true, ack: true },
        private: true,
      },
    });

    typingChannelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as {
          user_id: string;
          conversation_id: string;
          is_typing: boolean;
        };

        if (
          data.conversation_id === selectedConversation.id &&
          data.user_id !== user.id
        ) {
          setTypingUsers((prev) => {
            const updated = new Set(prev);
            if (data.is_typing) {
              updated.add(data.user_id);
            } else {
              updated.delete(data.user_id);
            }
            return updated;
          });
        }
      })
      .subscribe();

    return () => {
      // Clean up timeouts
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();

      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      setTypingUsers(new Set());
    };
  }, [selectedConversation, user]);

  const otherParticipant = selectedConversation?.participants.find(
    (p) => p.id !== user?.id
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
        <div
          className="p-4 overflow-y-auto"
          style={{ maxHeight: "calc(600px - 73px)" }}
        >
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
                <div className="relative shrink-0">
                  <Avatar className="w-10 h-10">
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
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">
                      {otherParticipant?.email || "Unknown User"}
                    </h3>
                  </div>
                  {otherParticipant && (
                    <LastSeenBadge
                      isOnline={isOnline(otherParticipant.id)}
                      lastSeenAt={
                        (otherParticipant as any).last_seen_at || null
                      }
                    />
                  )}
                  {selectedConversation.booking_request && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Regarding:{" "}
                      {selectedConversation.booking_request.equipment.title}
                    </p>
                  )}
                </div>
                {selectedConversation.booking_request && (
                  <div className="text-xs shrink-0">
                    <span
                      className={`px-2 py-1 rounded-full ${
                        selectedConversation.booking_request.status ===
                        "approved"
                          ? "bg-green-100 text-green-800"
                          : selectedConversation.booking_request.status ===
                            "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {selectedConversation.booking_request.status}
                    </span>
                  </div>
                )}
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
                <>
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {typingUsers.size > 0 && (
                    <TypingIndicator
                      userName={
                        selectedConversation.participants.find((p) =>
                          typingUsers.has(p.id)
                        )?.email
                      }
                    />
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
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
