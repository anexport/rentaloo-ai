export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      availability_calendar: {
        Row: {
          created_at: string | null
          custom_rate: number | null
          date: string
          equipment_id: string
          id: string
          is_available: boolean | null
        }
        Insert: {
          created_at?: string | null
          custom_rate?: number | null
          date: string
          equipment_id: string
          id?: string
          is_available?: boolean | null
        }
        Update: {
          created_at?: string | null
          custom_rate?: number | null
          date?: string
          equipment_id?: string
          id?: string
          is_available?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_calendar_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_history: {
        Row: {
          booking_request_id: string
          changed_at: string | null
          changed_by: string | null
          id: string
          metadata: Json | null
          new_status: Database["public"]["Enums"]["booking_status"]
          old_status: Database["public"]["Enums"]["booking_status"] | null
          reason: string | null
        }
        Insert: {
          booking_request_id: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          new_status: Database["public"]["Enums"]["booking_status"]
          old_status?: Database["public"]["Enums"]["booking_status"] | null
          reason?: string | null
        }
        Update: {
          booking_request_id?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["booking_status"]
          old_status?: Database["public"]["Enums"]["booking_status"] | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_history_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          activated_at: string | null
          completed_at: string | null
          created_at: string | null
          damage_deposit_amount: number | null
          end_date: string
          equipment_id: string
          id: string
          insurance_cost: number | null
          insurance_type: string | null
          message: string | null
          owner_reviewed_at: string | null
          renter_id: string
          renter_reviewed_at: string | null
          start_date: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          damage_deposit_amount?: number | null
          end_date: string
          equipment_id: string
          id?: string
          insurance_cost?: number | null
          insurance_type?: string | null
          message?: string | null
          owner_reviewed_at?: string | null
          renter_id: string
          renter_reviewed_at?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          damage_deposit_amount?: number | null
          end_date?: string
          equipment_id?: string
          id?: string
          insurance_cost?: number | null
          insurance_type?: string | null
          message?: string | null
          owner_reviewed_at?: string | null
          renter_id?: string
          renter_reviewed_at?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_request_id: string
          created_at: string | null
          id: string
          payment_status: string | null
          pickup_method: string | null
          return_status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_request_id: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          pickup_method?: string | null
          return_status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_request_id?: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          pickup_method?: string | null
          return_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: true
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          attributes: Json | null
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          sport_type: string
          updated_at: string | null
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sport_type: string
          updated_at?: string | null
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sport_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      content_translations: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          field_name: string
          id: string
          original_text: string
          source_lang: string
          target_lang: string
          translated_text: string
          updated_at: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          field_name: string
          id?: string
          original_text: string
          source_lang?: string
          target_lang: string
          translated_text: string
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          field_name?: string
          id?: string
          original_text?: string
          source_lang?: string
          target_lang?: string
          translated_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messaging_conversation_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_request_id: string | null
          created_at: string | null
          id: string
          participants: string[]
          updated_at: string | null
        }
        Insert: {
          booking_request_id?: string | null
          created_at?: string | null
          id?: string
          participants: string[]
          updated_at?: string | null
        }
        Update: {
          booking_request_id?: string | null
          created_at?: string | null
          id?: string
          participants?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_claims: {
        Row: {
          booking_id: string
          created_at: string | null
          damage_description: string
          estimated_cost: number
          evidence_photos: string[]
          filed_at: string
          filed_by: string
          id: string
          renter_response: Json | null
          repair_quotes: string[] | null
          resolution: Json | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          damage_description: string
          estimated_cost: number
          evidence_photos?: string[]
          filed_at?: string
          filed_by: string
          id?: string
          renter_response?: Json | null
          repair_quotes?: string[] | null
          resolution?: Json | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          damage_description?: string
          estimated_cost?: number
          evidence_photos?: string[]
          filed_at?: string
          filed_by?: string
          id?: string
          renter_response?: Json | null
          repair_quotes?: string[] | null
          resolution?: Json | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "damage_claims_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_claims_filed_by_fkey"
            columns: ["filed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category_id: string
          condition: Database["public"]["Enums"]["equipment_condition"]
          created_at: string | null
          daily_rate: number
          damage_deposit_amount: number | null
          damage_deposit_percentage: number | null
          deposit_refund_timeline_hours: number | null
          description: string
          id: string
          is_available: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          owner_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          condition: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string | null
          daily_rate: number
          damage_deposit_amount?: number | null
          damage_deposit_percentage?: number | null
          deposit_refund_timeline_hours?: number | null
          description: string
          id?: string
          is_available?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          owner_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          condition?: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string | null
          daily_rate?: number
          damage_deposit_amount?: number | null
          damage_deposit_percentage?: number | null
          deposit_refund_timeline_hours?: number | null
          description?: string
          id?: string
          is_available?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          owner_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_inspections: {
        Row: {
          booking_id: string
          checklist_items: Json | null
          condition_notes: string | null
          created_at: string | null
          id: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          location: Json | null
          owner_signature: string | null
          photos: string[]
          renter_signature: string | null
          timestamp: string
          verified_by_owner: boolean | null
          verified_by_renter: boolean | null
        }
        Insert: {
          booking_id: string
          checklist_items?: Json | null
          condition_notes?: string | null
          created_at?: string | null
          id?: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          location?: Json | null
          owner_signature?: string | null
          photos?: string[]
          renter_signature?: string | null
          timestamp?: string
          verified_by_owner?: boolean | null
          verified_by_renter?: boolean | null
        }
        Update: {
          booking_id?: string
          checklist_items?: Json | null
          condition_notes?: string | null
          created_at?: string | null
          id?: string
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          location?: Json | null
          owner_signature?: string | null
          photos?: string[]
          renter_signature?: string | null
          timestamp?: string
          verified_by_owner?: boolean | null
          verified_by_renter?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inspections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_photos: {
        Row: {
          alt: string | null
          created_at: string | null
          description: string | null
          equipment_id: string
          id: string
          is_primary: boolean | null
          order_index: number | null
          photo_url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string | null
          description?: string | null
          equipment_id: string
          id?: string
          is_primary?: boolean | null
          order_index?: number | null
          photo_url: string
        }
        Update: {
          alt?: string | null
          created_at?: string | null
          description?: string | null
          equipment_id?: string
          id?: string
          is_primary?: boolean | null
          order_index?: number | null
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_photos_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          message_type: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "messaging_conversation_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profiles: {
        Row: {
          business_info: Json | null
          created_at: string | null
          earnings_total: number | null
          id: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          business_info?: Json | null
          created_at?: string | null
          earnings_total?: number | null
          id?: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          business_info?: Json | null
          created_at?: string | null
          earnings_total?: number | null
          id?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          booking_request_id: string | null
          created_at: string | null
          currency: string
          deposit_amount: number | null
          deposit_released_at: string | null
          deposit_status: Database["public"]["Enums"]["deposit_status"] | null
          escrow_amount: number
          escrow_released_at: string | null
          escrow_status: string
          failure_reason: string | null
          id: string
          insurance_amount: number | null
          owner_id: string
          owner_payout_amount: number
          payment_method_id: string | null
          payment_status: string
          payout_processed_at: string | null
          payout_status: string
          refund_amount: number | null
          refund_reason: string | null
          rental_amount: number | null
          renter_id: string
          service_fee: number
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          subtotal: number
          tax: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          booking_request_id?: string | null
          created_at?: string | null
          currency?: string
          deposit_amount?: number | null
          deposit_released_at?: string | null
          deposit_status?: Database["public"]["Enums"]["deposit_status"] | null
          escrow_amount: number
          escrow_released_at?: string | null
          escrow_status?: string
          failure_reason?: string | null
          id?: string
          insurance_amount?: number | null
          owner_id: string
          owner_payout_amount: number
          payment_method_id?: string | null
          payment_status?: string
          payout_processed_at?: string | null
          payout_status?: string
          refund_amount?: number | null
          refund_reason?: string | null
          rental_amount?: number | null
          renter_id: string
          service_fee?: number
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          subtotal: number
          tax?: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          booking_request_id?: string | null
          created_at?: string | null
          currency?: string
          deposit_amount?: number | null
          deposit_released_at?: string | null
          deposit_status?: Database["public"]["Enums"]["deposit_status"] | null
          escrow_amount?: number
          escrow_released_at?: string | null
          escrow_status?: string
          failure_reason?: string | null
          id?: string
          insurance_amount?: number | null
          owner_id?: string
          owner_payout_amount?: number
          payment_method_id?: string | null
          payment_status?: string
          payout_processed_at?: string | null
          payout_status?: string
          refund_amount?: number | null
          refund_reason?: string | null
          rental_amount?: number | null
          renter_id?: string
          service_fee?: number
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          subtotal?: number
          tax?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_verified: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          identity_verified: boolean | null
          last_seen_at: string | null
          phone_verified: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          username: string | null
          verified_at: string | null
        }
        Insert: {
          address_verified?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          identity_verified?: boolean | null
          last_seen_at?: string | null
          phone_verified?: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string | null
          verified_at?: string | null
        }
        Update: {
          address_verified?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          identity_verified?: boolean | null
          last_seen_at?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      rental_events: {
        Row: {
          booking_id: string
          created_at: string | null
          created_by: string | null
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      renter_profiles: {
        Row: {
          created_at: string | null
          experience_level: string | null
          id: string
          preferences: Json | null
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          experience_level?: string | null
          id?: string
          preferences?: Json | null
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          experience_level?: string | null
          id?: string
          preferences?: Json | null
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renter_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          photos: Json | null
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          photos?: Json | null
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          photos?: Json | null
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          equipment_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_verifications: {
        Row: {
          created_at: string | null
          document_url: string | null
          id: string
          status: Database["public"]["Enums"]["verification_status"] | null
          user_id: string
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["verification_status"] | null
          user_id: string
          verification_type: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["verification_status"] | null
          user_id?: string
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      available_equipment_counts_by_category: {
        Row: {
          available_count: number | null
          category_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      messaging_conversation_summaries: {
        Row: {
          booking_request_id: string | null
          booking_status: Database["public"]["Enums"]["booking_status"] | null
          created_at: string | null
          end_date: string | null
          equipment_title: string | null
          id: string | null
          last_message_content: string | null
          last_message_created_at: string | null
          last_message_id: string | null
          last_message_sender_id: string | null
          last_message_type: string | null
          last_seen_at: string | null
          participant_email: string | null
          participant_id: string | null
          start_date: string | null
          total_amount: number | null
          unread_count: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["last_message_sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_rental: { Args: { p_booking_id: string }; Returns: undefined }
      check_booking_conflicts: {
        Args: {
          p_end_date: string
          p_equipment_id: string
          p_exclude_booking_id?: string
          p_start_date: string
        }
        Returns: boolean
      }
      cleanup_stale_pending_bookings: {
        Args: { timeout_minutes?: number }
        Returns: number
      }
      complete_rental: { Args: { p_booking_id: string }; Returns: undefined }
      get_unread_messages_count: { Args: Record<PropertyKey, never>; Returns: number }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_conversation_participant: {
        Args: { conv_id: string; user_id: string }
        Returns: boolean
      }
      is_equipment_owner: {
        Args: { equipment_id: string; user_id: string }
        Returns: boolean
      }
      is_user_in_conversation_participants: {
        Args: { conv_id: string; user_id: string }
        Returns: boolean
      }
      mark_conversation_read: {
        Args: { p_conversation: string }
        Returns: undefined
      }
      update_last_seen: { Args: Record<PropertyKey, never>; Returns: undefined }
    }
    Enums: {
      booking_status:
        | "pending"
        | "approved"
        | "active"
        | "declined"
        | "cancelled"
        | "completed"
      claim_status:
        | "pending"
        | "accepted"
        | "disputed"
        | "resolved"
        | "escalated"
      deposit_status: "held" | "releasing" | "released" | "claimed" | "refunded"
      equipment_condition: "new" | "excellent" | "good" | "fair"
      inspection_type: "pickup" | "return"
      user_role: "renter" | "owner"
      verification_status: "unverified" | "pending" | "verified"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "pending",
        "approved",
        "active",
        "declined",
        "cancelled",
        "completed",
      ],
      claim_status: [
        "pending",
        "accepted",
        "disputed",
        "resolved",
        "escalated",
      ],
      deposit_status: ["held", "releasing", "released", "claimed", "refunded"],
      equipment_condition: ["new", "excellent", "good", "fair"],
      inspection_type: ["pickup", "return"],
      user_role: ["renter", "owner"],
      verification_status: ["unverified", "pending", "verified"],
    },
  },
} as const
