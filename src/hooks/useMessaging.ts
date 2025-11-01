import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  ConversationWithDetails,
  MessageWithSender,
  NewMessage,
} from "../types/messaging";

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
    }
  }, [user]);

  // Fetch user's conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // First, get conversation IDs where user is a participant
      const { data: userConversations, error: convError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", user.id);

      if (convError) throw convError;

      const conversationIds = (userConversations || []).map(
        (uc) => uc.conversation_id
      );

      if (conversationIds.length === 0) {
        setConversations([]);
        userConversationIdsRef.current = new Set();
        setLoading(false);
        return;
      }

      // Get full conversation details
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          booking_request:booking_requests(
            *,
            equipment:equipment(*)
          )
        `
        )
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get participants and last message for each conversation
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conversation) => {
          // Get participants
          const { data: participantLinks } = await supabase
            .from("conversation_participants")
            .select(
              `
              profile_id,
              profiles!conversation_participants_profile_id_fkey (*)
            `
            )
            .eq("conversation_id", conversation.id);

          const participants =
            participantLinks?.map((link: any) => link.profiles) || [];

          // Get last message
          const { data: lastMessage } = await supabase
            .from("messages")
            .select(
              `
              *,
              sender:profiles(*)
            `
            )
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...conversation,
            participants,
            last_message: lastMessage,
            booking_request: conversation.booking_request || undefined,
          };
        })
      );

      setConversations(conversationsWithDetails);

      // Update user conversation IDs ref for filtering
      userConversationIdsRef.current = new Set(conversationIds);
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
  const fetchMessages = useCallback(async (conversationId: string) => {
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
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
    }
  }, []);

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

        // Add the new message to the current messages
        setMessages((prev) => [...prev, data]);

        // Update conversation's updated_at timestamp
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", messageData.conversation_id);

        // Refresh conversations to update last message
        await fetchConversations();

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
      const rawPayload = payload?.payload as
        | { record?: Record<string, any>; new?: Record<string, any> }
        | undefined;

      const record = (rawPayload?.record || rawPayload?.new || null) as {
        id?: string;
        conversation_id?: string;
      } | null;

      const conversationId = record?.conversation_id;
      const messageId = record?.id;

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
        | { record?: Record<string, any>; new?: Record<string, any> }
        | undefined;

      const record = (rawPayload?.record || rawPayload?.new || null) as {
        conversation_id?: string;
      } | null;

      const conversationId = record?.conversation_id;

      if (!conversationId) {
        return;
      }

      userConversationIdsRef.current.add(conversationId);
      void fetchConversations();
    });

    channel.on("broadcast", { event: "message_created" }, (payload) => {
      const messagePayload = payload?.payload as
        | { conversation_id?: string; message_id?: string }
        | undefined;

      const conversationId = messagePayload?.conversation_id;

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
