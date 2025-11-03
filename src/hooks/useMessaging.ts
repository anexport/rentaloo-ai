import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  ConversationWithDetails,
  MessageWithSender,
  NewMessage,
} from "../types/messaging";

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

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setMessages([]);
      setActiveConversationId(null);
      currentConversationIdRef.current = null;
      userConversationIdsRef.current = new Set();

      // Explicitly clean up channels on logout
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
      }
      if (userChannelRef.current) {
        supabase.removeChannel(userChannelRef.current);
        userChannelRef.current = null;
      }
    }
  }, [user]);

  // Fetch user's conversations using the messaging_conversation_summaries view
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // First, get all conversation IDs where the user is a participant
      const { data: userConversations, error: convError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", user.id);

      if (convError) throw convError;

      if (!userConversations || userConversations.length === 0) {
        setConversations([]);
        userConversationIdsRef.current = new Set();
        setLoading(false);
        return;
      }

      const userConversationIdArray = userConversations.map(
        (uc) => uc.conversation_id
      );

      // Fetch all rows from the view for these conversations (includes all participants)
      const { data: summaries, error } = await supabase
        .from("messaging_conversation_summaries")
        .select("*")
        .in("id", userConversationIdArray)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (!summaries || summaries.length === 0) {
        setConversations([]);
        userConversationIdsRef.current = new Set();
        setLoading(false);
        return;
      }

      // Group by conversation_id (view returns one row per participant)
      const groupedSummaries = new Map<
        string,
        {
          summary: any;
          participants: Map<
            string,
            {
              id: string;
              email: string | null;
              last_seen_at: string | null;
            }
          >;
          unreadCount: number;
        }
      >();

      summaries.forEach((summary: any) => {
        const convId = summary.id;

        const participant = {
          id: summary.participant_id,
          email: summary.participant_email,
          last_seen_at: summary.last_seen_at,
        };

        const existingGroup = groupedSummaries.get(convId);
        const unreadValue = Number(summary.unread_count) || 0;

        if (!existingGroup) {
          const participantMap = new Map<
            string,
            {
              id: string;
              email: string | null;
              last_seen_at: string | null;
            }
          >();
          participantMap.set(participant.id, participant);

          groupedSummaries.set(convId, {
            summary,
            participants: participantMap,
            unreadCount: summary.participant_id === user.id ? unreadValue : 0,
          });
          return;
        }

        existingGroup.participants.set(participant.id, participant);
        if (summary.participant_id === user.id) {
          existingGroup.unreadCount = unreadValue;
        }
      });

      const conversationMap = new Map<string, any>();

      groupedSummaries.forEach((group, convId) => {
        const { summary, participants, unreadCount } = group;

        conversationMap.set(convId, {
          id: summary.id,
          booking_request_id: summary.booking_request_id,
          created_at: summary.created_at,
          updated_at: summary.updated_at,
          participants: Array.from(participants.values()),
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

      const conversationList = Array.from(conversationMap.values());

      const participantIds = new Set<string>();
      const lastMessageIds = new Set<string>();
      const bookingRequestIds = new Set<string>();
      const conversationIds = new Set<string>();

      conversationList.forEach((conversation) => {
        conversationIds.add(conversation.id);
        conversation.participants.forEach((participant: any) => {
          if (participant?.id) {
            participantIds.add(participant.id);
          }
        });

        if (conversation.last_message?.id) {
          lastMessageIds.add(conversation.last_message.id);
        }

        if (conversation.booking_request_id) {
          bookingRequestIds.add(conversation.booking_request_id);
        }
      });

      const resolveEmpty = () =>
        Promise.resolve({ data: [], error: null } as {
          data: any[];
          error: null;
        });

      const [
        profilesResult,
        messagesResult,
        bookingRequestsResult,
        participantsResult,
      ] = await Promise.all([
        participantIds.size
          ? supabase
              .from("profiles")
              .select("*")
              .in("id", Array.from(participantIds))
          : resolveEmpty(),
        lastMessageIds.size
          ? supabase
              .from("messages")
              .select(
                `
                *,
                sender:profiles(*)
              `
              )
              .in("id", Array.from(lastMessageIds))
          : resolveEmpty(),
        bookingRequestIds.size
          ? supabase
              .from("booking_requests")
              .select(
                `
                *,
                equipment:equipment(*)
              `
              )
              .in("id", Array.from(bookingRequestIds))
          : resolveEmpty(),
        conversationIds.size && user?.id
          ? supabase
              .from("conversation_participants")
              .select("conversation_id, last_read_at")
              .in("conversation_id", Array.from(conversationIds))
              .eq("profile_id", user.id)
          : resolveEmpty(),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (messagesResult.error) throw messagesResult.error;
      if (bookingRequestsResult.error) throw bookingRequestsResult.error;
      if (participantsResult?.error) throw participantsResult.error;

      const profileMap = new Map(
        (profilesResult.data || []).map((profile: any) => [profile.id, profile])
      );
      const messageMap = new Map(
        (messagesResult.data || []).map((message: any) => [message.id, message])
      );
      const bookingRequestMap = new Map(
        (bookingRequestsResult.data || []).map((booking: any) => [
          booking.id,
          {
            ...booking,
            equipment: booking.equipment || undefined,
          },
        ])
      );
      const participantMap = new Map(
        (participantsResult?.data || []).map((participant: any) => [
          participant.conversation_id,
          participant,
        ])
      );

      const conversationsWithDetails = conversationList.map((conversation) => {
        const fullParticipants = conversation.participants.reduce(
          (acc: any[], participant: any) => {
            const profile = profileMap.get(participant.id);
            if (!profile) {
              return acc;
            }

            acc.push({
              ...profile,
              last_seen_at:
                participant.last_seen_at ?? profile.last_seen_at ?? null,
            });
            return acc;
          },
          []
        );

        const lastMessageId = conversation.last_message?.id;
        const lastMessage = lastMessageId
          ? messageMap.get(lastMessageId) || conversation.last_message
          : null;

        const bookingRequestId = conversation.booking_request_id;
        const bookingRequest = bookingRequestId
          ? bookingRequestMap.get(bookingRequestId) ||
            conversation.booking_request
          : undefined;

        const participantData = participantMap.get(conversation.id);
        const lastReadAt = participantData?.last_read_at || null;

        return {
          ...conversation,
          participants: fullParticipants,
          last_message: lastMessage,
          booking_request: bookingRequest,
          last_read_at: lastReadAt,
          last_read_timestamp: lastReadAt, // Alias for compatibility
        };
      });

      setConversations(conversationsWithDetails);

      // Update user conversation IDs ref for filtering
      const conversationIdsArray: string[] = Array.from(conversationMap.keys());
      userConversationIdsRef.current = new Set(conversationIdsArray);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch conversations"
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      try {
        // Update current conversation ID ref
        currentConversationIdRef.current = conversationId;
        setActiveConversationId(conversationId);

        const { data, error } = await supabase
          .from("messages")
          .select(
            `
          *,
          sender:profiles(*)
        `
          )
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Guard: Check if user switched conversations while network call was in flight
        if (currentConversationIdRef.current !== conversationId) {
          // User switched to a different conversation, skip updating state
          return;
        }

        setMessages(data || []);

        // Mark conversation as read when viewing it
        if (user?.id) {
          // Guard: Check again before marking as read (conversation may have changed)
          if (currentConversationIdRef.current !== conversationId) {
            // User switched to a different conversation, skip marking as read
            return;
          }

          try {
            await supabase.rpc("mark_conversation_read", {
              p_conversation: conversationId,
            });

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
        console.error("Error fetching messages:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch messages"
        );
      }
    },
    [user?.id, fetchConversations]
  );

  // Send a new message
  const sendMessage = useCallback(
    async (messageData: NewMessage) => {
      if (!user) return;

      try {
        const { data, error } = await supabase
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
          .single();

        if (error) throw error;

        const timestamp = new Date().toISOString();

        // Add the new message to the current messages
        setMessages((prev) => [...prev, data]);

        // Update related metadata without blocking the UI any longer than needed
        await supabase
          .from("conversations")
          .update({ updated_at: timestamp })
          .eq("id", messageData.conversation_id);

        // Refresh conversations to update last message, but do it in the background
        void fetchConversations();

        return data;
      } catch (err) {
        console.error("Error sending message:", err);
        setError(err instanceof Error ? err.message : "Failed to send message");
        throw err;
      }
    },
    [user, fetchConversations]
  );

  // Create or get existing conversation
  const getOrCreateConversation = useCallback(
    async (participantIds: string[], bookingRequestId?: string) => {
      if (!user) return null;

      try {
        const allParticipants = [user.id, ...participantIds];

        // Check if conversation already exists for this booking request
        if (bookingRequestId) {
          const { data: existingConversation } = await supabase
            .from("conversations")
            .select("*")
            .eq("booking_request_id", bookingRequestId)
            .single();

          if (existingConversation) {
            return existingConversation;
          }
        }

        // If no booking request, check for existing conversation between these participants
        if (!bookingRequestId) {
          // Get all conversations where current user is a participant
          const { data: userConvs } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("profile_id", user.id);

          if (userConvs && userConvs.length > 0) {
            const convIds = userConvs.map((c) => c.conversation_id);

            // For each conversation, check if it has exactly the right participants
            for (const convId of convIds) {
              const { data: convParticipants } = await supabase
                .from("conversation_participants")
                .select("profile_id")
                .eq("conversation_id", convId);

              const participantSet = new Set(
                convParticipants?.map((p) => p.profile_id) || []
              );
              const targetSet = new Set(allParticipants);

              if (
                participantSet.size === targetSet.size &&
                [...participantSet].every((id) => targetSet.has(id))
              ) {
                const { data: existingConv } = await supabase
                  .from("conversations")
                  .select("*")
                  .eq("id", convId)
                  .single();

                if (existingConv) return existingConv;
              }
            }
          }
        }

        // Create new conversation
        const { data: newConversation, error: convError } = await supabase
          .from("conversations")
          .insert({
            booking_request_id: bookingRequestId,
            participants: allParticipants, // Keep for backwards compatibility
          })
          .select()
          .single();

        if (convError) throw convError;

        // Add participants to junction table
        const participantInserts = allParticipants.map((participantId) => ({
          conversation_id: newConversation.id,
          profile_id: participantId,
        }));

        const { error: participantError } = await supabase
          .from("conversation_participants")
          .insert(participantInserts);

        if (participantError) throw participantError;

        // Refresh conversations
        fetchConversations();

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
        supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
      }
      return;
    }

    const topic = `room:${activeConversationId}:messages`;

    if (
      conversationChannelRef.current &&
      conversationChannelRef.current.topic === topic
    ) {
      return;
    }

    if (conversationChannelRef.current) {
      supabase.removeChannel(conversationChannelRef.current);
      conversationChannelRef.current = null;
    }

    const channel = supabase.channel(topic, {
      config: {
        broadcast: { self: true, ack: true },
        private: true,
      },
    });

    conversationChannelRef.current = channel;

    channel.on("broadcast", { event: "message_created" }, async (payload) => {
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

      const { data: fullMessage, error: fetchError } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles(*)
        `
        )
        .eq("id", messageId)
        .single();

      if (fetchError || !fullMessage) {
        console.error("Error fetching new message:", fetchError);
        return;
      }

      if (currentConversationIdRef.current === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === fullMessage.id)) {
            return prev;
          }
          return [...prev, fullMessage as MessageWithSender];
        });
      }

      await fetchConversations();
    });

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error("Realtime channel error for messages topic:", topic);
        setError("Failed to subscribe to message updates");
      }
    });

    return () => {
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
      }
    };
  }, [user, activeConversationId, fetchConversations]);

  // Listen for user-specific conversation updates
  useEffect(() => {
    if (!user) {
      if (userChannelRef.current) {
        supabase.removeChannel(userChannelRef.current);
        userChannelRef.current = null;
      }
      return;
    }

    const topic = `user:${user.id}:conversations`;

    if (userChannelRef.current) {
      supabase.removeChannel(userChannelRef.current);
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
        supabase.removeChannel(userChannelRef.current);
        userChannelRef.current = null;
      }
    };
  }, [user, fetchConversations]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
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
