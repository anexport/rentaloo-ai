import type { Database } from "../lib/database.types";

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

export interface MessageWithSender extends Message {
  sender: Database["public"]["Tables"]["profiles"]["Row"];
}

export interface ConversationWithDetails extends Conversation {
  participants: Database["public"]["Tables"]["profiles"]["Row"][];
  last_message?: MessageWithSender;
  booking_request?: Database["public"]["Tables"]["booking_requests"]["Row"] & {
    equipment: Database["public"]["Tables"]["equipment"]["Row"];
  };
}

export interface MessageFormData {
  content: string;
}

export type MessageType = "text" | "system" | "booking_update";

export interface NewMessage {
  conversation_id: string;
  content: string;
  message_type?: MessageType;
}

