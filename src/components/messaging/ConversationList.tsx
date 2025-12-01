import type { ConversationWithDetails } from "../../types/messaging";
import { useAuth } from "../../hooks/useAuth";
import { usePresence } from "../../hooks/usePresence";
import { useProfileLookup } from "../../hooks/useProfileLookup";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { MessageSquare } from "lucide-react";
import { TooltipProvider } from "../ui/tooltip";
import { ConversationListItem } from "./shared/ConversationListItem";
import { useEffect, useRef, useMemo } from "react";

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  selectedConversationId?: string;
  onSelectConversation: (conversation: ConversationWithDetails) => void;
  loading?: boolean;
}

// Module-level tracking for throttled telemetry events
// Prevents duplicate fallback logs for the same conversation ID
const LOGGED_FALLBACK_CONVERSATION_IDS = new Set<string>();
const FALLBACK_CLEAR_TIMEOUTS = new Map<string, number>();

// Configurable timeout for clearing logged IDs (default: 5 minutes)
const FALLBACK_LOG_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Records that a fallback telemetry event was logged for a conversation ID
 * and schedules cleanup after the timeout period
 */
const recordFallbackLog = (conversationId: string): void => {
  if (LOGGED_FALLBACK_CONVERSATION_IDS.has(conversationId)) {
    return; // Already logged, skip
  }

  LOGGED_FALLBACK_CONVERSATION_IDS.add(conversationId);

  // Clear existing timeout if any
  const existingTimeout = FALLBACK_CLEAR_TIMEOUTS.get(conversationId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Schedule cleanup after timeout (only if window exists)
  if (typeof window !== "undefined" && window.setTimeout) {
    const timeoutId = window.setTimeout(() => {
      LOGGED_FALLBACK_CONVERSATION_IDS.delete(conversationId);
      FALLBACK_CLEAR_TIMEOUTS.delete(conversationId);
    }, FALLBACK_LOG_TIMEOUT_MS);

    FALLBACK_CLEAR_TIMEOUTS.set(conversationId, timeoutId);
  }
};

/**
 * Cleans up logged conversation IDs that are no longer in the current conversations list
 */
const cleanupStaleLoggedConversations = (
  currentConversationIds: Set<string>
): void => {
  for (const loggedId of LOGGED_FALLBACK_CONVERSATION_IDS) {
    if (!currentConversationIds.has(loggedId)) {
      // Conversation no longer exists, clean up
      LOGGED_FALLBACK_CONVERSATION_IDS.delete(loggedId);

      const timeoutId = FALLBACK_CLEAR_TIMEOUTS.get(loggedId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        FALLBACK_CLEAR_TIMEOUTS.delete(loggedId);
      }
    }
  }
};

const getFirstCharacter = (value?: string | null) => {
  if (!value) return "?";
  const trimmed = value.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
};

const ConversationList = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  loading = false,
}: ConversationListProps) => {
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const { t } = useTranslation("messaging");
  const prevConversationIdsRef = useRef<Set<string>>(new Set());

  // Collect all participant IDs from conversations (memoized to prevent unnecessary re-runs)
  const participantIds = useMemo(
    () => conversations.flatMap((conv) => conv.participants || []),
    [conversations]
  );
  const { getProfile } = useProfileLookup(participantIds);

  // Clean up stale logged conversations when conversation data updates
  useEffect(() => {
    const currentConversationIds = new Set(
      conversations.map((conv) => conv.id)
    );
    cleanupStaleLoggedConversations(currentConversationIds);
    prevConversationIdsRef.current = currentConversationIds;
  }, [conversations]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyMedia>
          <MessageSquare className="h-6 w-6" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t("conversation_list.empty_title")}</EmptyTitle>
          <EmptyDescription>
            {t("conversation_list.empty_description")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        {conversations.map((conversation) => {
          const otherParticipantId = conversation.participants?.find(
            (participantId) => participantId !== user?.id
          );
          const otherParticipant = otherParticipantId
            ? getProfile(otherParticipantId)
            : undefined;

          const otherParticipantName =
            otherParticipant?.email || t("conversation_list.unknown_user");
          const otherParticipantInitials = getFirstCharacter(
            otherParticipant?.email
          );
          const lastSeenAt = otherParticipant?.last_seen_at || null;

          // Safer fallback unread logic
          const getUnreadStatus = (): boolean => {
            // Primary: Use unread_count from conversation if available
            if (conversation.unread_count !== undefined) {
              return conversation.unread_count > 0;
            }

            // Fallback 1: Compare last_read_at with last_message created_at
            const lastReadAt =
              conversation.last_read_at || conversation.last_read_timestamp;
            const lastMessageAt = conversation.last_message?.created_at;

            if (lastReadAt && lastMessageAt) {
              const lastRead = new Date(lastReadAt);
              const lastMessage = new Date(lastMessageAt);
              if (!isNaN(lastRead.getTime()) && !isNaN(lastMessage.getTime())) {
                return lastMessage.getTime() > lastRead.getTime();
              }
            }

            // Fallback 2: Check localStorage for persisted read state (secondary backup)
            if (
              conversation.id &&
              user?.id &&
              typeof window !== "undefined" &&
              window.localStorage
            ) {
              try {
                const storageKey = `conversation_read_${user.id}_${conversation.id}`;
                const persistedReadState =
                  window.localStorage.getItem(storageKey);
                if (persistedReadState !== null) {
                  return persistedReadState === "false"; // false means unread
                }
              } catch (error) {
                // localStorage access can throw in some browsers/contexts
                // (e.g., private mode, disabled storage, iframe restrictions)
                console.warn(
                  "[ConversationList] localStorage access failed, treating as no persisted state",
                  { error, conversationId: conversation.id, userId: user?.id }
                );
                // Continue to next fallback - do not return a value
              }
            }

            // Fallback 3: Debug log and conservatively treat as read (false = not unread)
            // Throttle telemetry by checking if we've already logged this conversation ID
            const conversationId = conversation.id;
            const hasAlreadyLogged = conversationId
              ? LOGGED_FALLBACK_CONVERSATION_IDS.has(conversationId)
              : false;

            if (!hasAlreadyLogged) {
              console.warn(
                "[ConversationList] Unread fallback used - unread_count missing and timestamps unavailable",
                {
                  conversationId: conversation.id,
                  hasLastRead: !!lastReadAt,
                  hasLastMessage: !!lastMessageAt,
                  lastMessageSender: conversation.last_message?.sender_id,
                  currentUserId: user?.id,
                }
              );

              // Emit telemetry event (can be extended to send to analytics service)
              // Only dispatch if window exists and we haven't logged this conversation ID yet
              if (
                typeof window !== "undefined" &&
                window.dispatchEvent &&
                conversationId
              ) {
                window.dispatchEvent(
                  new CustomEvent("conversation_unread_fallback", {
                    detail: {
                      conversationId: conversation.id,
                      hasLastRead: !!lastReadAt,
                      hasLastMessage: !!lastMessageAt,
                    },
                  })
                );

                // Record that we've logged this conversation ID to prevent duplicate events
                recordFallbackLog(conversationId);
              }
            }

            // Conservatively treat as read (not unread)
            return false;
          };

          const unread = getUnreadStatus();

          return (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isSelected={conversation.id === selectedConversationId}
              onSelect={onSelectConversation}
              otherParticipantName={otherParticipantName}
              otherParticipantInitials={otherParticipantInitials}
              isOnline={
                otherParticipantId ? isOnline(otherParticipantId) : false
              }
              lastSeenAt={lastSeenAt}
              unread={Boolean(unread)}
            />
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default ConversationList;
