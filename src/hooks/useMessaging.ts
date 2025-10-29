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
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          participants:profiles(*),
          booking_request:booking_requests(
            *,
            equipment:equipment(*)
          )
        `
        )
        .contains("participants", [user.id])
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get last message for each conversation
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation) => {
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
            last_message: lastMessage,
          };
        })
      );

      setConversations(conversationsWithLastMessage);
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
        // Check if conversation already exists
        const allParticipants = [user.id, ...participantIds];
        const { data: existingConversation } = await supabase
          .from("conversations")
          .select("*")
          .contains("participants", allParticipants)
          .single();

        if (existingConversation) {
          return existingConversation;
        }

        // Create new conversation
        const { data, error } = await supabase
          .from("conversations")
          .insert({
            participants: allParticipants.map((id) => id), // Ensure UUIDs are properly handled
            booking_request_id: bookingRequestId,
          })
          .select()
          .single();

        if (error) throw error;

        // Refresh conversations
        fetchConversations();

        return data;
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
