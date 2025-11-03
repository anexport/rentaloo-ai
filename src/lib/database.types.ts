export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      availability_calendar: {
        Row: {
          created_at: string | null;
          custom_rate: number | null;
          date: string;
          equipment_id: string;
          id: string;
          is_available: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          custom_rate?: number | null;
          date: string;
          equipment_id: string;
          id?: string;
          is_available?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          custom_rate?: number | null;
          date?: string;
          equipment_id?: string;
          id?: string;
          is_available?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "availability_calendar_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          }
        ];
      };
      booking_requests: {
        Row: {
          created_at: string | null;
          end_date: string;
          equipment_id: string;
          id: string;
          message: string | null;
          renter_id: string;
          start_date: string;
          status: Database["public"]["Enums"]["booking_status"] | null;
          total_amount: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          end_date: string;
          equipment_id: string;
          id?: string;
          message?: string | null;
          renter_id: string;
          start_date: string;
          status?: Database["public"]["Enums"]["booking_status"] | null;
          total_amount: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          end_date?: string;
          equipment_id?: string;
          id?: string;
          message?: string | null;
          renter_id?: string;
          start_date?: string;
          status?: Database["public"]["Enums"]["booking_status"] | null;
          total_amount?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_requests_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_requests_renter_id_fkey";
            columns: ["renter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      bookings: {
        Row: {
          booking_request_id: string;
          created_at: string | null;
          id: string;
          payment_status: string | null;
          pickup_method: string | null;
          return_status: string | null;
          updated_at: string | null;
        };
        Insert: {
          booking_request_id: string;
          created_at?: string | null;
          id?: string;
          payment_status?: string | null;
          pickup_method?: string | null;
          return_status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          booking_request_id?: string;
          created_at?: string | null;
          id?: string;
          payment_status?: string | null;
          pickup_method?: string | null;
          return_status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_booking_request_id_fkey";
            columns: ["booking_request_id"];
            isOneToOne: false;
            referencedRelation: "booking_requests";
            referencedColumns: ["id"];
          }
        ];
      };
      categories: {
        Row: {
          attributes: Json | null;
          created_at: string | null;
          id: string;
          name: string;
          parent_id: string | null;
          sport_type: string;
          updated_at: string | null;
        };
        Insert: {
          attributes?: Json | null;
          created_at?: string | null;
          id?: string;
          name: string;
          parent_id?: string | null;
          sport_type: string;
          updated_at?: string | null;
        };
        Update: {
          attributes?: Json | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          parent_id?: string | null;
          sport_type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          booking_request_id: string | null;
          created_at: string | null;
          id: string;
          participants: string[];
          updated_at: string | null;
        };
        Insert: {
          booking_request_id?: string | null;
          created_at?: string | null;
          id?: string;
          participants: string[];
          updated_at?: string | null;
        };
        Update: {
          booking_request_id?: string | null;
          created_at?: string | null;
          id?: string;
          participants?: string[];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_booking_request_id_fkey";
            columns: ["booking_request_id"];
            isOneToOne: false;
            referencedRelation: "booking_requests";
            referencedColumns: ["id"];
          }
        ];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          created_at: string | null;
          id: string;
          profile_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          profile_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      equipment: {
        Row: {
          category_id: string;
          condition: Database["public"]["Enums"]["equipment_condition"];
          created_at: string | null;
          daily_rate: number;
          description: string;
          id: string;
          is_available: boolean | null;
          latitude: number | null;
          location: string;
          longitude: number | null;
          owner_id: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          category_id: string;
          condition: Database["public"]["Enums"]["equipment_condition"];
          created_at?: string | null;
          daily_rate: number;
          description: string;
          id?: string;
          is_available?: boolean | null;
          latitude?: number | null;
          location: string;
          longitude?: number | null;
          owner_id: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          category_id?: string;
          condition?: Database["public"]["Enums"]["equipment_condition"];
          created_at?: string | null;
          daily_rate?: number;
          description?: string;
          id?: string;
          is_available?: boolean | null;
          latitude?: number | null;
          location?: string;
          longitude?: number | null;
          owner_id?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "equipment_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      equipment_photos: {
        Row: {
          alt: string | null;
          created_at: string | null;
          description: string | null;
          equipment_id: string;
          id: string;
          is_primary: boolean | null;
          order_index: number | null;
          photo_url: string;
        };
        Insert: {
          alt?: string | null;
          created_at?: string | null;
          description?: string | null;
          equipment_id: string;
          id?: string;
          is_primary?: boolean | null;
          order_index?: number | null;
          photo_url: string;
        };
        Update: {
          alt?: string | null;
          created_at?: string | null;
          description?: string | null;
          equipment_id?: string;
          id?: string;
          is_primary?: boolean | null;
          order_index?: number | null;
          photo_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_photos_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string | null;
          id: string;
          message_type: string | null;
          sender_id: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          message_type?: string | null;
          sender_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          message_type?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      owner_profiles: {
        Row: {
          business_info: Json | null;
          created_at: string | null;
          earnings_total: number | null;
          id: string;
          profile_id: string;
          updated_at: string | null;
          verification_level:
            | Database["public"]["Enums"]["verification_status"]
            | null;
        };
        Insert: {
          business_info?: Json | null;
          created_at?: string | null;
          earnings_total?: number | null;
          id?: string;
          profile_id: string;
          updated_at?: string | null;
          verification_level?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
        };
        Update: {
          business_info?: Json | null;
          created_at?: string | null;
          earnings_total?: number | null;
          id?: string;
          profile_id?: string;
          updated_at?: string | null;
          verification_level?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
        };
        Relationships: [
          {
            foreignKeyName: "owner_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          booking_request_id: string;
          created_at: string | null;
          currency: string;
          escrow_amount: number;
          escrow_released_at: string | null;
          escrow_status: string;
          failure_reason: string | null;
          id: string;
          owner_id: string;
          owner_payout_amount: number;
          payment_method_id: string | null;
          payment_status: string;
          payout_processed_at: string | null;
          payout_status: string;
          refund_amount: number | null;
          refund_reason: string | null;
          renter_id: string;
          service_fee: number;
          stripe_charge_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
          subtotal: number;
          tax: number;
          total_amount: number;
          updated_at: string | null;
        };
        Insert: {
          booking_request_id: string;
          created_at?: string | null;
          currency?: string;
          escrow_amount: number;
          escrow_released_at?: string | null;
          escrow_status?: string;
          failure_reason?: string | null;
          id?: string;
          owner_id: string;
          owner_payout_amount: number;
          payment_method_id?: string | null;
          payment_status?: string;
          payout_processed_at?: string | null;
          payout_status?: string;
          refund_amount?: number | null;
          refund_reason?: string | null;
          renter_id: string;
          service_fee?: number;
          stripe_charge_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          subtotal: number;
          tax?: number;
          total_amount: number;
          updated_at?: string | null;
        };
        Update: {
          booking_request_id?: string;
          created_at?: string | null;
          currency?: string;
          escrow_amount?: number;
          escrow_released_at?: string | null;
          escrow_status?: string;
          failure_reason?: string | null;
          id?: string;
          owner_id?: string;
          owner_payout_amount?: number;
          payment_method_id?: string | null;
          payment_status?: string;
          payout_processed_at?: string | null;
          payout_status?: string;
          refund_amount?: number | null;
          refund_reason?: string | null;
          renter_id?: string;
          service_fee?: number;
          stripe_charge_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          subtotal?: number;
          tax?: number;
          total_amount?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_request_id_fkey";
            columns: ["booking_request_id"];
            isOneToOne: false;
            referencedRelation: "booking_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_renter_id_fkey";
            columns: ["renter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          last_seen_at: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          last_seen_at?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          last_seen_at?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      renter_profiles: {
        Row: {
          created_at: string | null;
          experience_level: string | null;
          id: string;
          preferences: Json | null;
          profile_id: string;
          updated_at: string | null;
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null;
        };
        Insert: {
          created_at?: string | null;
          experience_level?: string | null;
          id?: string;
          preferences?: Json | null;
          profile_id: string;
          updated_at?: string | null;
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
        };
        Update: {
          created_at?: string | null;
          experience_level?: string | null;
          id?: string;
          preferences?: Json | null;
          profile_id?: string;
          updated_at?: string | null;
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null;
        };
        Relationships: [
          {
            foreignKeyName: "renter_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      reviews: {
        Row: {
          booking_id: string;
          comment: string | null;
          created_at: string | null;
          id: string;
          photos: Json | null;
          rating: number;
          reviewee_id: string;
          reviewer_id: string;
        };
        Insert: {
          booking_id: string;
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          photos?: Json | null;
          rating: number;
          reviewee_id: string;
          reviewer_id: string;
        };
        Update: {
          booking_id?: string;
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          photos?: Json | null;
          rating?: number;
          reviewee_id?: string;
          reviewer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey";
            columns: ["reviewee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      user_verifications: {
        Row: {
          created_at: string | null;
          document_url: string | null;
          id: string;
          status: Database["public"]["Enums"]["verification_status"] | null;
          user_id: string;
          verification_type: string;
          verified_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          document_url?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["verification_status"] | null;
          user_id: string;
          verification_type: string;
          verified_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          document_url?: string | null;
          id?: string;
          status?: Database["public"]["Enums"]["verification_status"] | null;
          user_id?: string;
          verification_type?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      messaging_conversation_summaries: {
        Row: {
          id: string;
          booking_request_id: string | null;
          created_at: string | null;
          updated_at: string | null;
          last_message_id: string | null;
          last_message_sender_id: string | null;
          last_message_content: string | null;
          last_message_type: string | null;
          last_message_created_at: string | null;
          participant_id: string;
          participant_email: string;
          last_seen_at: string | null;
          booking_status: Database["public"]["Enums"]["booking_status"] | null;
          start_date: string | null;
          end_date: string | null;
          total_amount: number | null;
          equipment_title: string | null;
          unread_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      update_last_seen: {
        Args: {};
        Returns: void;
      };
      mark_conversation_read: {
        Args: {
          /** UUID of the conversation to mark as read */
          p_conversation: string;
        };
        Returns: void;
      };
    };
    Enums: {
      booking_status: "pending" | "approved" | "declined" | "cancelled";
      equipment_condition: "new" | "excellent" | "good" | "fair";
      user_role: "renter" | "owner";
      verification_status: "unverified" | "pending" | "verified";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      booking_status: ["pending", "approved", "declined", "cancelled"],
      equipment_condition: ["new", "excellent", "good", "fair"],
      user_role: ["renter", "owner"],
      verification_status: ["unverified", "pending", "verified"],
    },
  },
} as const;
