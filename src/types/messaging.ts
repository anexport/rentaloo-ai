import type { Database, ProfileSummary } from "../lib/database.types";

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

export interface MessageWithSender extends Message {
  sender: Database["public"]["Tables"]["profiles"]["Row"];
}

export interface ConversationWithDetails
  extends Omit<Conversation, "participants"> {
  participants: string[] | null;
  last_message?: MessageWithSender | null;
  booking_request?: Database["public"]["Tables"]["booking_requests"]["Row"] & {
    equipment: Database["public"]["Tables"]["equipment"]["Row"];
  };
  unread_count?: number;
  last_read_at?: string | null;
  last_read_timestamp?: string | null;
}

export interface MessageFormData {
  content: string;
}

export type MessageType =
  | "text"
  | "system"
  | "booking_update"
  | "booking_approved"
  | "booking_cancelled";

export interface NewMessage {
  conversation_id: string;
  content: string;
  message_type?: MessageType;
}

export interface TypingStatus {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: string;
}
