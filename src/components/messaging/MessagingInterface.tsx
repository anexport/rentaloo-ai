import { useState, useEffect, useRef, useMemo } from "react";
import { useMessaging } from "../../hooks/useMessaging";
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import type { ConversationWithDetails } from "../../types/messaging";
import { MessageSquare, ArrowLeft, Menu, Search, Filter } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import ConversationList from "./ConversationList";
import ConversationSearch from "./ConversationSearch";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";
import { LastSeenBadge } from "./LastSeenBadge";
import { TypingIndicator } from "./TypingIndicator";
import { supabase } from "../../lib/supabase";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import { ScrollArea } from "../ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface MessagingInterfaceProps {
  initialConversationId?: string;
  onClose?: () => void;
}

type ConversationFilter = "all" | "unread" | "bookings";

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const typingChannelRef = useRef<any>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keyboard shortcut: Cmd/Ctrl + K to open conversation search
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;

      if (event.metaKey || event.ctrlKey) {
        const target = event.target as HTMLElement | null;
        if (target) {
          const tagName = target.tagName;
          const editable = target.getAttribute("contenteditable");
          if (
            editable === "true" ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(tagName)
          ) {
            // Allow the shortcut inside inputs as well – no early return
          }
        }

        event.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  // Set initial conversation
  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const conversation = conversations.find(
        (c) => c.id === initialConversationId
      );
      if (conversation) {
        setSelectedConversation(conversation);
        fetchMessages(conversation.id);
        setIsMobileSidebarOpen(false);
      }
    }
  }, [initialConversationId, conversations, fetchMessages]);

  const handleSelectConversation = async (
    conversation: ConversationWithDetails
  ) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
    setIsMobileSidebarOpen(false);
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
    const existingTimeout = typingTimeoutRef.current.get(
      selectedConversation.id
    );
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

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      // Clear all pending timeouts when component unmounts
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, []);

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

  const filteredConversations = useMemo(() => {
    if (filter === "all") return conversations;

    return conversations.filter((conversation) => {
      if (filter === "bookings") {
        return Boolean(conversation.booking_request);
      }

      if (filter === "unread") {
        return (conversation.unread_count ?? 0) > 0;
      }

      return true;
    });
  }, [conversations, filter, user?.id]);

  const conversationSidebar = (
    <div className="flex h-full flex-col bg-card/60">
      <div className="border-border border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Messages</h2>
              <p className="text-muted-foreground text-xs">
                Stay in sync with your renters
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hidden md:inline-flex"
              aria-label="Close messaging panel"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Select
              value={filter}
              onValueChange={(value) => setFilter(value as ConversationFilter)}
            >
              <SelectTrigger
                className="h-9 flex-1"
                aria-label="Filter conversations"
              >
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All conversations</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="bookings">Bookings</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search conversations"
              aria-expanded={isSearchOpen}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 py-2">
        <ConversationList
          conversations={filteredConversations}
          selectedConversationId={selectedConversation?.id}
          onSelectConversation={handleSelectConversation}
          loading={loading}
        />
      </ScrollArea>
    </div>
  );

  const renderMessagePane = (isMobile: boolean) => {
    if (!selectedConversation) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center bg-background px-6">
          <div className="flex flex-col items-center text-center">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/70" />
            <h3 className="text-lg font-semibold">Select a conversation</h3>
            <p className="text-muted-foreground text-sm">
              Choose a conversation from the list to view messages.
            </p>
            {conversations.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Conversations will appear here once you connect with renters.
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-1 flex-col bg-background/80">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="flex flex-1 items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open conversations list"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}

            <div className="relative flex shrink-0 items-center">
              <Avatar className="h-11 w-11">
                <AvatarFallback>
                  {otherParticipant?.email?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              {otherParticipant && (
                <OnlineStatusIndicator
                  isOnline={isOnline(otherParticipant.id)}
                  size="md"
                  className="absolute -bottom-1 -right-1"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-base font-semibold">
                  {otherParticipant?.email || "Unknown User"}
                </h3>
                {selectedConversation.booking_request && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {selectedConversation.booking_request.status}
                  </Badge>
                )}
              </div>
              {otherParticipant && (
                <LastSeenBadge
                  isOnline={isOnline(otherParticipant.id)}
                  lastSeenAt={otherParticipant.last_seen_at || null}
                  className="mt-1"
                />
              )}
              {selectedConversation.booking_request && (
                <p className="text-xs text-muted-foreground">
                  Regarding{" "}
                  <span className="font-medium">
                    {selectedConversation.booking_request.equipment.title}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search messages"
              aria-expanded={isSearchOpen}
            >
              <Search className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={onClose}
                aria-label="Close messaging"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-2 px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/40 py-10 text-center text-sm text-muted-foreground">
                <MessageSquare className="mb-3 h-9 w-9 text-muted-foreground/60" />
                <p>No messages yet</p>
                <p className="mt-1 text-xs">
                  Start the conversation to plan the rental details.
                </p>
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
        </ScrollArea>

        <div className="px-4 pb-5">
          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            disabled={loading}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "grid w-full gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card/40 shadow-sm",
        "min-h-[520px]"
      )}
    >
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="w-[90vw] max-w-sm p-0 md:hidden">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Conversations
            </SheetTitle>
          </SheetHeader>
          {conversationSidebar}
        </SheetContent>
      </Sheet>

      <div className="flex h-full md:hidden">{renderMessagePane(true)}</div>

      <div className="hidden h-full md:block">
        <ResizablePanelGroup
          direction="horizontal"
          className="grid h-full grid-cols-[minmax(320px,380px)_minmax(0,1fr)]"
        >
          <ResizablePanel
            defaultSize={35}
            minSize={27}
            maxSize={40}
            className="border-r border-border/70"
          >
            {conversationSidebar}
          </ResizablePanel>
          <ResizableHandle className="bg-transparent data-[panel-group-direction=horizontal]:w-2" />
          <ResizablePanel defaultSize={65} minSize={55}>
            {renderMessagePane(false)}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <ConversationSearch
        conversations={conversations}
        currentUserId={user?.id}
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSelect={handleSelectConversation}
      />
    </div>
  );
};

export default MessagingInterface;
