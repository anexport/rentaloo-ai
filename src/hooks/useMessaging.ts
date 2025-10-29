import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";
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
              profiles:profile_id (*)
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
          };
        })
      );

      setConversations(conversationsWithDetails);
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
        fetchConversations();

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

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as MessageWithSender;

          // Only update if the message is for a conversation we're viewing
          if (
            messages.length > 0 &&
            newMessage.conversation_id === messages[0]?.conversation_id
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }

          // Refresh conversations to update last message
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
    };
  }, [user, messages, fetchConversations]);

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
