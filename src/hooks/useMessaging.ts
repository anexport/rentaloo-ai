import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  ConversationWithDetails,
  MessageWithSender,
  NewMessage,
} from "../types/messaging";
import type { Database, ProfileSummary } from "../lib/database.types";

// Types for better type safety
interface ConversationSummary {
  id: string;
  booking_request_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  participant_id: string;
  participant_email: string | null;
  last_seen_at: string | null;
  last_message_id: string | null;
  last_message_sender_id: string | null;
  last_message_content: string | null;
  last_message_type: string | null;
  last_message_created_at: string | null;
  booking_status: string | null;
  start_date: string | null;
  end_date: string | null;
  total_amount: number | null;
  equipment_title: string | null;
  unread_count: number | null;
}

interface ConversationGroup {
  summary: ConversationSummary;
  participants: Set<string>;
  unreadCount: number;
}

interface ConversationData {
  id: string;
  booking_request_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  participants: string[] | null;
  last_message: {
    id: string;
    sender_id: string | null;
    content: string | null;
    message_type: string | null;
    created_at: string | null;
  } | null;
  booking_request:
    | {
        id: string;
        status: string | null;
        start_date: string | null;
        end_date: string | null;
        total_amount: number | null;
        equipment:
          | {
              title: string;
            }
          | undefined;
      }
    | undefined;
  unread_count: number;
}

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type MessageRowWithSender = MessageRow & {
  sender: ProfileRow | null;
};
type BookingRequestRow =
  Database["public"]["Tables"]["booking_requests"]["Row"];
type EquipmentRow = Database["public"]["Tables"]["equipment"]["Row"];
type BookingRequestWithEquipmentNullable = BookingRequestRow & {
  equipment: EquipmentRow | null;
};
type ConversationParticipantRow =
  Database["public"]["Tables"]["conversation_participants"]["Row"];
type ConversationParticipantIdRow = Pick<
  ConversationParticipantRow,
  "conversation_id"
>;
type ConversationParticipantReadRow = Pick<
  ConversationParticipantRow,
  "conversation_id" | "last_read_at"
>;

// Supabase response types
type ConversationSummaryRow =
  Database["public"]["Views"]["messaging_conversation_summaries"]["Row"];

type SupabaseResponse<T> = {
  data: T | null;
  error: Error | null;
};
type ConversationParticipantProfileRow = Pick<
  ConversationParticipantRow,
  "profile_id"
>;

const hasSender = (
  message: MessageRowWithSender
): message is MessageWithSender => message.sender !== null;

/**
 * Process conversation summaries into grouped format
 * @param summaries Raw conversation summaries from database
 * @param userId Current user ID
 * @returns Map of grouped conversations
 */
const processConversationSummaries = (
  summaries: ConversationSummary[],
  userId: string
): Map<string, ConversationGroup> => {
  const groupedSummaries = new Map<string, ConversationGroup>();

  summaries.forEach((summary) => {
    const convId = summary.id;
    const participantId = summary.participant_id;

    const existingGroup = groupedSummaries.get(convId);
    const unreadValue = summary.unread_count ?? 0;

    if (!existingGroup) {
      const participantSet = new Set<string>();
      participantSet.add(participantId);

      groupedSummaries.set(convId, {
        summary,
        participants: participantSet,
        unreadCount: summary.participant_id === userId ? unreadValue : 0,
      });
      return;
    }

    existingGroup.participants.add(participantId);
    if (summary.participant_id === userId) {
      existingGroup.unreadCount = unreadValue;
    }
  });

  return groupedSummaries;
};

/**
 * Convert grouped conversations to conversation data format
 * @param groupedSummaries Map of grouped conversations
 * @returns Array of conversation data
 */
const convertToConversationData = (
  groupedSummaries: Map<string, ConversationGroup>
): ConversationData[] => {
  const conversationMap = new Map<string, ConversationData>();

  groupedSummaries.forEach((group, convId) => {
    const { summary, participants, unreadCount } = group;

    conversationMap.set(convId, {
      id: summary.id,
      booking_request_id: summary.booking_request_id,
      created_at: summary.created_at ?? null,
      updated_at: summary.updated_at ?? null,
      participants: Array.from(participants),
      last_message: summary.last_message_id
        ? {
            id: summary.last_message_id,
            sender_id: summary.last_message_sender_id,
            content: summary.last_message_content,
            message_type: summary.last_message_type,
            created_at: summary.last_message_created_at,
          }
        : null,
      booking_request: summary.booking_request_id
        ? {
            id: summary.booking_request_id,
            status: summary.booking_status,
            start_date: summary.start_date,
            end_date: summary.end_date,
            total_amount: summary.total_amount,
            equipment: summary.equipment_title
              ? {
                  title: summary.equipment_title,
                }
              : undefined,
          }
        : undefined,
      unread_count: unreadCount,
    });
  });

  return Array.from(conversationMap.values());
};

/**
 * Build final conversation objects with all details
 * @param conversationList List of conversations
 * @param profileMap Map of profiles
 * @param messageMap Map of messages
 * @param bookingRequestMap Map of booking requests
 * @param participantMap Map of conversation participants
 * @returns Array of conversations with details
 */
const buildConversationsWithDetails = (
  conversationList: ConversationData[],
  profileMap: Map<string, ProfileRow>,
  messageMap: Map<string, MessageWithSender>,
  bookingRequestMap: Map<string, BookingRequestWithEquipmentNullable>,
  participantMap: Map<string, ConversationParticipantReadRow>
): ConversationWithDetails[] => {
  return conversationList.map((conversation) => {
    // Convert participant IDs to array (or null if empty)
    const participantIds = conversation.participants && conversation.participants.length > 0
      ? conversation.participants
      : null;

    let lastMessage: MessageWithSender | null = null;
    const lastMessageId = conversation.last_message?.id;

    if (lastMessageId) {
      const knownMessage = messageMap.get(lastMessageId);

      if (knownMessage) {
        lastMessage = knownMessage;
      } else if (conversation.last_message?.sender_id) {
        const fallbackSender = profileMap.get(
          conversation.last_message.sender_id
        );

        if (fallbackSender) {
          lastMessage = {
            id: conversation.last_message.id,
            conversation_id: conversation.id,
            sender_id: conversation.last_message.sender_id,
            content: conversation.last_message.content ?? "",
            message_type: conversation.last_message.message_type,
            created_at: conversation.last_message.created_at,
            sender: fallbackSender,
          };
        }
      }
    }

    const bookingRequestId = conversation.booking_request_id;
    const bookingRequestRecord = bookingRequestId
      ? bookingRequestMap.get(bookingRequestId)
      : undefined;
    const bookingRequest =
      bookingRequestRecord && bookingRequestRecord.equipment
        ? {
            ...bookingRequestRecord,
            equipment: bookingRequestRecord.equipment,
          }
        : undefined;

    const participantData = participantMap.get(conversation.id);
    const lastReadAt = participantData?.last_read_at || null;

    return {
      ...conversation,
      participants: participantIds,
      last_message: lastMessage,
      booking_request: bookingRequest,
      last_read_at: lastReadAt,
      last_read_timestamp: lastReadAt, // Alias for compatibility
    };
  });
};

// Payload types for broadcast events
interface MessageCreatedPayload {
  record?: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    message_type?: string | null;
  };
  new?: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    message_type?: string | null;
  };
}

interface ParticipantAddedPayload {
  record?: {
    conversation_id: string;
    profile_id: string;
  };
  new?: {
    conversation_id: string;
    profile_id: string;
  };
}

interface UserMessagePayload {
  conversation_id?: string;
  message_id?: string;
}

// Cache for conversation data to avoid redundant requests
const conversationCache = new Map<
  string,
  { data: ConversationWithDetails[]; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Request deduplication to prevent duplicate calls
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Helper function to retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries (default: 3)
 * @param delay Initial delay in milliseconds (default: 1000)
 * @returns Promise that resolves with the function result
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined = undefined;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort errors
      if (lastError.name === "AbortError") {
        throw lastError;
      }

      // If this is the last attempt, throw the error
      if (i === maxRetries) {
        throw lastError;
      }

      // Calculate exponential backoff delay
      const backoffDelay = delay * Math.pow(2, i);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  // This should never be reached, but TypeScript needs it
  // If we somehow get here, lastError should be set from the loop above
  if (lastError) {
    throw lastError;
  }
  throw new Error("Retry operation failed with unknown error");
};

/**
 * Helper function to handle errors consistently
 * @param error The error to handle
 * @param context Context where the error occurred
 * @param setError Function to set error state
 * @param fallbackMessage Fallback message if error is not an Error
 */
const handleError = (
  error: unknown,
  context: string,
  setError: (error: string | null) => void,
  fallbackMessage: string
) => {
  const errorMessage = error instanceof Error ? error.message : fallbackMessage;
  console.error(`Error in ${context}:`, error);
  setError(errorMessage);

  return errorMessage;
};

/**
 * Helper function to race a Promise against a timeout
 * @param promise The Promise to race (can be a promise-like object)
 * @param timeoutMs Timeout in milliseconds (default: 10000)
 * @param errorMessage Custom error message for timeout
 * @returns The Promise result if it completes before timeout
 * @throws TimeoutError if the timeout is reached
 */
const withTimeout = <T>(
  promise: PromiseLike<T>,
  timeoutMs: number = 10000,
  errorMessage: string = "Operation timed out"
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${errorMessage} (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  // Wrap in Promise.resolve() to normalize non-standard promises
  // This ensures .finally() is available even for promise-like objects (like Supabase queries)
  const normalizedPromise = Promise.resolve(promise);

  return Promise.race([
    normalizedPromise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
};

/**
 * Helper function to deduplicate requests
 * @param key Unique key for the request
 * @param requestFn Function that returns a Promise
 * @returns The result of the request
 */
const deduplicateRequest = <T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};

/**
 * Check if cached data is still valid
 * @param key Cache key
 * @returns True if cache is valid, false otherwise
 */
const isCacheValid = (key: string): boolean => {
  const cached = conversationCache.get(key);
  if (!cached) return false;

  return Date.now() - cached.timestamp < CACHE_TTL;
};

/**
 * Get data from cache if valid
 * @param key Cache key
 * @returns Cached data or null
 */
const getCachedData = (key: string): ConversationWithDetails[] | null => {
  if (isCacheValid(key)) {
    return conversationCache.get(key)?.data ?? null;
  }
  return null;
};

/**
 * Store data in cache
 * @param key Cache key
 * @param data Data to cache
 */
const setCachedData = (key: string, data: ConversationWithDetails[]) => {
  conversationCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

export const useMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    []
  );
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const currentConversationIdRef = useRef<string | null>(null);
  const userConversationIdsRef = useRef<Set<string>>(new Set());
  const conversationChannelRef = useRef<RealtimeChannel | null>(null);
  const userChannelRef = useRef<RealtimeChannel | null>(null);
  const fetchConversationsAbortControllerRef = useRef<AbortController | null>(
    null
  );

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setMessages([]);
      setActiveConversationId(null);
      currentConversationIdRef.current = null;
      userConversationIdsRef.current = new Set();

      // Explicitly clean up channels on logout
      if (conversationChannelRef.current) {
        void supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
      }
      if (userChannelRef.current) {
        void supabase.removeChannel(userChannelRef.current);
        userChannelRef.current = null;
      }

      // Clear cache on logout
      conversationCache.clear();
      pendingRequests.clear();
    }
  }, [user]);

  // Fetch user's conversations using the messaging_conversation_summaries view
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    // Compute cache key first (same key used by deduplicateRequest)
    const cacheKey = `conversations_${user.id}`;

    // Cancel any ongoing fetch and clear its deduplication entry
    if (fetchConversationsAbortControllerRef.current) {
      fetchConversationsAbortControllerRef.current.abort();
      // Remove the pending request from deduplication cache to prevent reusing aborted promise
      pendingRequests.delete(cacheKey);
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    fetchConversationsAbortControllerRef.current = abortController;

    try {
      // Check cache first
      const cachedData = getCachedData(cacheKey);
      const hasCachedData = Boolean(cachedData);

      if (hasCachedData) {
        setConversations(cachedData || []);
      } else {
        setLoading(true);
      }

      // Use deduplication to prevent multiple concurrent requests
      await deduplicateRequest(cacheKey, async () => {
        // First, get all conversation IDs where the user is a participant
        const { data: userConversations, error: convError } =
          (await retryWithBackoff(
            async () => {
              const result = await withTimeout(
                supabase
                  .from("conversation_participants")
                  .select("conversation_id")
                  .eq("profile_id", user.id),
                10000,
                "Failed to fetch user conversations: request timed out"
              );
              return result;
            },
            2, // Max 2 retries for this operation
            1000 // 1 second initial delay
          )) as SupabaseResponse<ConversationParticipantIdRow[]>;

        if (convError) throw convError;
        if (abortController.signal.aborted) throw new Error("Request aborted");

        if (!userConversations || userConversations.length === 0) {
          setConversations([]);
          userConversationIdsRef.current = new Set();
          setLoading(false);
          setCachedData(cacheKey, []);
          return;
        }

        const userConversationIdArray = userConversations.map(
          (uc: { conversation_id: string }) => uc.conversation_id
        );

        // Fetch all rows from the view for these conversations (includes all participants)
        const { data: summaries, error } = (await retryWithBackoff(
          () =>
            withTimeout(
              supabase
                .from("messaging_conversation_summaries")
                .select("*")
                .in("id", userConversationIdArray)
                .order("updated_at", {
                  ascending: false,
                }),
              10000,
              "Failed to fetch conversation summaries: request timed out"
            ),
          2, // Max 2 retries for this operation
          1000 // 1 second initial delay
        )) as SupabaseResponse<ConversationSummaryRow[]>;

        if (error) throw error;
        if (abortController.signal.aborted) throw new Error("Request aborted");

        if (!summaries || summaries.length === 0) {
          setConversations([]);
          userConversationIdsRef.current = new Set();
          setLoading(false);
          setCachedData(cacheKey, []);
          return;
        }

        // Group by conversation_id (view returns one row per participant)
        // Convert database types to ConversationSummary format
        const conversationSummaries: ConversationSummary[] = summaries.map(
          (s) => ({
            id: s.id,
            booking_request_id: s.booking_request_id,
            created_at: s.created_at ?? null,
            updated_at: s.updated_at ?? null,
            participant_id: s.participant_id,
            participant_email: s.participant_email,
            last_seen_at: s.last_seen_at,
            last_message_id: s.last_message_id,
            last_message_sender_id: s.last_message_sender_id,
            last_message_content: s.last_message_content,
            last_message_type: s.last_message_type,
            last_message_created_at: s.last_message_created_at,
            booking_status: s.booking_status,
            start_date: s.start_date,
            end_date: s.end_date,
            total_amount: s.total_amount,
            equipment_title: s.equipment_title,
            unread_count: s.unread_count,
          })
        );
        const groupedSummaries = processConversationSummaries(
          conversationSummaries,
          user.id
        );

        const conversationList = convertToConversationData(groupedSummaries);

        // Collect all IDs for batch fetching
        const participantIds = new Set<string>();
        const lastMessageIds = new Set<string>();
        const bookingRequestIds = new Set<string>();
        const conversationIds = new Set<string>();

        conversationList.forEach((conversation) => {
          conversationIds.add(conversation.id);
          conversation.participants?.forEach((participantId) => {
            if (participantId) {
              participantIds.add(participantId);
            }
          });

          if (conversation.last_message?.id) {
            lastMessageIds.add(conversation.last_message.id);
          }

          if (conversation.booking_request_id) {
            bookingRequestIds.add(conversation.booking_request_id);
          }
        });

        // Batch fetch all related data in parallel
        const [profileRows, messageRows, bookingRequestRows, participantRows] =
          await Promise.all([
            participantIds.size
              ? retryWithBackoff(
                  () =>
                    withTimeout(
                      supabase
                        .from("profiles")
                        .select("*")
                        .in(
                          "id",
                          Array.from(participantIds)
                        ),
                      10000,
                      "Failed to fetch profiles: request timed out"
                    ),
                  2, // Max 2 retries for this operation
                  1000 // 1 second initial delay
                ).then((response) => {
                  if (response.error) throw response.error;
                  return response.data ?? [];
                })
              : Promise.resolve<ProfileRow[]>([]),
            lastMessageIds.size
              ? retryWithBackoff(
                  () =>
                    withTimeout(
                      supabase
                        .from("messages")
                        .select(
                          `
                    *,
                    sender:profiles(*)
                  `
                        )
                        .in(
                          "id",
                          Array.from(lastMessageIds)
                        ),
                      10000,
                      "Failed to fetch messages: request timed out"
                    ),
                  2, // Max 2 retries for this operation
                  1000 // 1 second initial delay
                ).then((response) => {
                  if (response.error) throw response.error;
                  return (response.data ?? []).filter(hasSender);
                })
              : Promise.resolve<MessageWithSender[]>([]),
            bookingRequestIds.size
              ? retryWithBackoff(
                  () =>
                    withTimeout(
                      supabase
                        .from("booking_requests")
                        .select(
                          `
                    *,
                    equipment:equipment(*)
                  `
                        )
                        .in(
                          "id",
                          Array.from(bookingRequestIds)
                        ),
                      10000,
                      "Failed to fetch booking requests: request timed out"
                    ),
                  2, // Max 2 retries for this operation
                  1000 // 1 second initial delay
                ).then((response) => {
                  if (response.error) throw response.error;
                  return response.data ?? [];
                })
              : Promise.resolve<BookingRequestWithEquipmentNullable[]>([]),
            conversationIds.size && user?.id
              ? retryWithBackoff(
                  () =>
                    withTimeout(
                      supabase
                        .from("conversation_participants")
                        .select("conversation_id, last_read_at")
                        .in("conversation_id", Array.from(conversationIds))
                        .eq("profile_id", user.id),
                      10000,
                      "Failed to fetch conversation participants: request timed out"
                    ),
                  2, // Max 2 retries for this operation
                  1000 // 1 second initial delay
                ).then((response) => {
                  if (response.error) throw response.error;
                  return response.data ?? [];
                })
              : Promise.resolve<ConversationParticipantReadRow[]>([]),
          ]);

        if (abortController.signal.aborted) throw new Error("Request aborted");

        // Create maps for efficient lookup
        const profileMap = new Map<string, ProfileRow>(
          profileRows.map((profile: ProfileRow) => [profile.id, profile])
        );
        const messageMap = new Map<string, MessageWithSender>(
          messageRows.map((message: MessageWithSender) => [message.id, message])
        );
        const bookingRequestMap = new Map<
          string,
          BookingRequestWithEquipmentNullable
        >(
          bookingRequestRows.map(
            (booking: BookingRequestWithEquipmentNullable) => [
              booking.id,
              booking,
            ]
          )
        );
        const participantMap = new Map<string, ConversationParticipantReadRow>(
          participantRows.map((participant: ConversationParticipantReadRow) => [
            participant.conversation_id,
            participant,
          ])
        );

        // Build final conversation objects with all details
        const conversationsWithDetails = buildConversationsWithDetails(
          conversationList,
          profileMap,
          messageMap,
          bookingRequestMap,
          participantMap
        );

        // Check if request was aborted before updating state
        if (abortController.signal.aborted) throw new Error("Request aborted");

        setConversations(conversationsWithDetails);
        setCachedData(cacheKey, conversationsWithDetails);

        // Update user conversation IDs ref for filtering
        userConversationIdsRef.current = new Set(
          Array.from(conversationIds.values())
        );
      });
    } catch (err) {
      // Don't update state if request was aborted
      if (abortController.signal.aborted) return;

      handleError(
        err,
        "fetchConversations",
        setError,
        "Failed to fetch conversations"
      );
    } finally {
      // Only update loading state if this is still the current request
      if (fetchConversationsAbortControllerRef.current === abortController) {
        setLoading(false);
      }
    }
  }, [user]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      // Create abort controller for this request
      const abortController = new AbortController();

      try {
        // Update current conversation ID ref
        currentConversationIdRef.current = conversationId;
        setActiveConversationId(conversationId);

        const { data, error } = (await retryWithBackoff(
          () =>
            withTimeout(
              supabase
                .from("messages")
                .select(
                  `
              *,
              sender:profiles(*)
            `
                )
                .eq("conversation_id", conversationId)
                .order("created_at", {
                  ascending: true,
                }),
              10000,
              "Failed to fetch messages: request timed out"
            ),
          2, // Max 2 retries for this operation
          1000 // 1 second initial delay
        )) as SupabaseResponse<MessageRowWithSender[]>;

        // Check if request was aborted
        if (abortController.signal.aborted) return;

        if (error) throw error;

        // Guard: Check if user switched conversations while network call was in flight
        if (currentConversationIdRef.current !== conversationId) {
          // User switched to a different conversation, skip updating state
          return;
        }

        const messagesWithSenders = (data ?? []).filter(hasSender);
        setMessages(messagesWithSenders);

        // Mark conversation as read when viewing it
        if (user?.id) {
          // Guard: Check again before marking as read (conversation may have changed)
          if (currentConversationIdRef.current !== conversationId) {
            // User switched to a different conversation, skip marking as read
            return;
          }

          try {
            await retryWithBackoff(
              () =>
                withTimeout(
                  supabase.rpc("mark_conversation_read", {
                    p_conversation: conversationId,
                  }),
                  10000,
                  "Failed to mark conversation as read: request timed out"
                ),
              2, // Max 2 retries for this operation
              1000 // 1 second initial delay
            );

            // Check if request was aborted after RPC call
            if (abortController.signal.aborted) return;

            // Guard: Check one more time after RPC call completes
            if (currentConversationIdRef.current !== conversationId) {
              // User switched conversations during the RPC call, skip refresh
              return;
            }

            // Refresh conversations to update unread count
            void fetchConversations();
          } catch (readError) {
            console.error("Error marking conversation as read:", readError);
            // Don't throw - this is not critical
          }
        }
      } catch (err) {
        // Don't update state if request was aborted
        if (abortController.signal.aborted) return;

        handleError(err, "fetchMessages", setError, "Failed to fetch messages");
      }
    },
    [user?.id, fetchConversations]
  );

  // Send a new message
  const sendMessage = useCallback(
    async (messageData: NewMessage) => {
      if (!user) return;

      // Create abort controller for this request
      const abortController = new AbortController();

      try {
        const { data, error } = (await retryWithBackoff(
          () =>
            withTimeout(
              supabase
                .from("messages")
                .insert({
                  ...messageData,
                  sender_id: user.id,
                })
                .select(
                  `
              *,
              sender:profiles(*)
            `
                )
                .single(),
              10000,
              "Failed to send message: request timed out"
            ),
          2, // Max 2 retries for this operation
          1000 // 1 second initial delay
        )) as SupabaseResponse<MessageRowWithSender>;

        // Check if request was aborted
        if (abortController.signal.aborted) return;

        if (error) throw error;
        if (!data || !hasSender(data)) {
          throw new Error("Failed to resolve sender profile for new message");
        }

        const timestamp = new Date().toISOString();

        const messageWithSender: MessageWithSender = {
          ...data,
          sender: data.sender,
        };

        // Add the new message to the current messages
        setMessages((prev) => [...prev, messageWithSender]);

        // Update related metadata without blocking the UI any longer than needed
        await retryWithBackoff(
          () =>
            withTimeout(
              supabase
                .from("conversations")
                .update({ updated_at: timestamp })
                .eq("id", messageData.conversation_id),
              10000,
              "Failed to update conversation: request timed out"
            ),
          1, // Only 1 retry for this non-critical operation
          500 // 0.5 second initial delay
        );

        // Check if request was aborted after update
        if (abortController.signal.aborted) return;

        // Refresh conversations to update last message, but do it in the background
        void fetchConversations();

        return messageWithSender;
      } catch (err) {
        // Don't update state if request was aborted
        if (abortController.signal.aborted) return;

        const errorMessage = handleError(
          err,
          "sendMessage",
          setError,
          "Failed to send message"
        );

        // Re-throw error for the caller to handle
        throw new Error(errorMessage);
      }
    },
    [user, fetchConversations]
  );

  // Create or get existing conversation
  const getOrCreateConversation = useCallback(
    async (participantIds: string[], bookingRequestId?: string) => {
      if (!user) return null;

      try {
        const uniqueParticipants = Array.from(
          new Set([user.id, ...participantIds])
        );

        // Check if conversation already exists for this booking request
        if (bookingRequestId) {
          const { data: existingConversation } = (await retryWithBackoff(
            () =>
              withTimeout(
                supabase
                  .from("conversations")
                  .select("*")
                  .eq("booking_request_id", bookingRequestId)
                  .single(),
                10000,
                "Failed to check existing conversation: request timed out"
              ),
            2, // Max 2 retries for this operation
            1000 // 1 second initial delay
          )) as SupabaseResponse<
            Database["public"]["Tables"]["conversations"]["Row"]
          >;

          if (existingConversation) {
            return existingConversation;
          }
        }

        // If no booking request, check for existing conversation between these participants
        if (!bookingRequestId) {
          // Get all conversations where current user is a participant
          const { data: userConvs } = (await retryWithBackoff(
            () =>
              withTimeout(
                supabase
                  .from("conversation_participants")
                  .select("conversation_id")
                  .eq("profile_id", user.id),
                10000,
                "Failed to fetch user conversations: request timed out"
              ),
            2, // Max 2 retries for this operation
            1000 // 1 second initial delay
          )) as SupabaseResponse<ConversationParticipantIdRow[]>;

          if (userConvs && userConvs.length > 0) {
            const convIds = userConvs.map(
              (c: { conversation_id: string }) => c.conversation_id
            );

            // For each conversation, check if it has exactly the right participants
            for (const convId of convIds) {
              const { data: convParticipants } = (await retryWithBackoff(
                () =>
                  withTimeout(
                    supabase
                      .from("conversation_participants")
                      .select("profile_id")
                      .eq("conversation_id", convId),
                    10000,
                    "Failed to fetch conversation participants: request timed out"
                  ),
                2, // Max 2 retries for this operation
                1000 // 1 second initial delay
              )) as SupabaseResponse<ConversationParticipantProfileRow[]>;

              const participantSet = new Set<string>(
                (convParticipants ?? []).map(
                  (p: { profile_id: string }) => p.profile_id
                )
              );
              const targetSet = new Set(uniqueParticipants);

              if (
                participantSet.size === targetSet.size &&
                [...participantSet].every((id: string) => targetSet.has(id))
              ) {
                const { data: existingConv } = (await retryWithBackoff(
                  () =>
                    withTimeout(
                      supabase
                        .from("conversations")
                        .select("*")
                        .eq("id", convId)
                        .single(),
                      10000,
                      "Failed to fetch existing conversation: request timed out"
                    ),
                  2, // Max 2 retries for this operation
                  1000 // 1 second initial delay
                )) as SupabaseResponse<
                  Database["public"]["Tables"]["conversations"]["Row"]
                >;

                if (existingConv) return existingConv;
              }
            }
          }
        }

        // Create new conversation
        const { data: newConversation, error: convError } =
          (await retryWithBackoff(
            () =>
              withTimeout(
                supabase
                  .from("conversations")
                  .insert({
                    booking_request_id: bookingRequestId,
                    participants: uniqueParticipants, // Keep for backwards compatibility
                  })
                  .select()
                  .single(),
                10000,
                "Failed to create conversation: request timed out"
              ),
            2, // Max 2 retries for this operation
            1000 // 1 second initial delay
          )) as SupabaseResponse<
            Database["public"]["Tables"]["conversations"]["Row"]
          >;

        if (convError) throw convError;
        if (!newConversation) {
          throw new Error("Failed to create conversation");
        }

        // Add participants to junction table
        const participantInserts = uniqueParticipants.map((participantId) => ({
          conversation_id: newConversation.id,
          profile_id: participantId,
        }));

        const { error: participantError } = (await retryWithBackoff(
          () =>
            withTimeout(
              supabase
                .from("conversation_participants")
                .insert(participantInserts),
              10000,
              "Failed to add conversation participants: request timed out"
            ),
          2, // Max 2 retries for this operation
          1000 // 1 second initial delay
        )) as SupabaseResponse<undefined>;

        if (participantError) throw participantError;

        // Refresh conversations
        void fetchConversations();

        return newConversation;
      } catch (err) {
        console.error("Error creating conversation:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create conversation"
        );
        return null;
      }
    },
    [user, fetchConversations]
  );

  // Subscribe to broadcast events for the active conversation
  useEffect(() => {
    if (!user || !activeConversationId) {
      if (conversationChannelRef.current) {
        void supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
      }
      return;
    }

    const topic = `room:${activeConversationId}:messages`;

    // Check if we already have a subscription to this topic
    if (
      conversationChannelRef.current &&
      conversationChannelRef.current.topic === topic
    ) {
      return;
    }

    // Clean up existing channel before creating a new one
    if (conversationChannelRef.current) {
      void supabase.removeChannel(conversationChannelRef.current);
      conversationChannelRef.current = null;
    }

    const channel = supabase.channel(topic, {
      config: {
        broadcast: { self: true, ack: true },
        private: true,
      },
    });

    conversationChannelRef.current = channel;

    channel.on("broadcast", { event: "message_created" }, (payload) => {
      void (async () => {
      const rawPayload = payload?.payload as MessageCreatedPayload | undefined;
      const record = rawPayload?.record || rawPayload?.new;

      if (!record) {
        return;
      }

      const conversationId = record.conversation_id;
      const messageId = record.id;

      if (!conversationId || !messageId) {
        return;
      }

      if (!userConversationIdsRef.current.has(conversationId)) {
        userConversationIdsRef.current.add(conversationId);
      }

      try {
        const { data: fullMessage, error: fetchError } =
          (await retryWithBackoff(
            () =>
              withTimeout(
                supabase
                  .from("messages")
                  .select(
                    `
              *,
              sender:profiles(*)
            `
                  )
                  .eq("id", messageId)
                  .single(),
                10000,
                "Failed to fetch new message: request timed out"
              ),
            2, // Max 2 retries for this operation
            1000 // 1 second initial delay
          )) as SupabaseResponse<MessageRowWithSender>;

        if (fetchError || !fullMessage || !hasSender(fullMessage)) {
          console.error("Error fetching new message:", fetchError);
          return;
        }

        const normalizedMessage: MessageWithSender = {
          ...fullMessage,
          sender: fullMessage.sender,
        };

        if (currentConversationIdRef.current === conversationId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === normalizedMessage.id)) {
              return prev;
            }
            return [...prev, normalizedMessage];
          });
        }

        // Refresh conversations to update last message
        await fetchConversations();
      } catch (error) {
        console.error("Error handling message_created event:", error);
      }
      })();
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("Realtime channel error for messages topic:", topic);
        setError("Failed to subscribe to message updates");
      }
    });

    return () => {
      if (conversationChannelRef.current) {
        void supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
      }
    };
  }, [user, activeConversationId, fetchConversations]);

  // Listen for user-specific conversation updates
  useEffect(() => {
    if (!user) {
      if (userChannelRef.current) {
        void supabase.removeChannel(userChannelRef.current);
        userChannelRef.current = null;
      }
      return;
    }

    const topic = `user:${user.id}:conversations`;

    // Clean up existing channel before creating a new one
    if (userChannelRef.current) {
      void supabase.removeChannel(userChannelRef.current);
      userChannelRef.current = null;
    }

    const channel = supabase.channel(topic, {
      config: {
        broadcast: { self: true, ack: true },
        private: true,
      },
    });

    userChannelRef.current = channel;

    channel.on("broadcast", { event: "participant_added" }, (payload) => {
      const rawPayload = payload?.payload as
        | ParticipantAddedPayload
        | undefined;
      const record = rawPayload?.record || rawPayload?.new;

      if (!record) {
        return;
      }

      const conversationId = record.conversation_id;

      if (!conversationId) {
        return;
      }

      userConversationIdsRef.current.add(conversationId);
      void fetchConversations();
    });

    channel.on("broadcast", { event: "message_created" }, (payload) => {
      const messagePayload = payload?.payload as UserMessagePayload | undefined;

      if (!messagePayload) {
        return;
      }

      const conversationId = messagePayload.conversation_id;

      if (!conversationId) {
        return;
      }

      if (!userConversationIdsRef.current.has(conversationId)) {
        userConversationIdsRef.current.add(conversationId);
      }

      if (conversationId !== currentConversationIdRef.current) {
        void fetchConversations();
      }
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("Realtime channel error for user topic:", topic);
      }
    });

    return () => {
      if (userChannelRef.current) {
        void supabase.removeChannel(userChannelRef.current);
        userChannelRef.current = null;
      }
    };
  }, [user, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    messages,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    getOrCreateConversation,
  };
};
