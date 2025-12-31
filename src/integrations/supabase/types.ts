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
      approval_logs: {
        Row: {
          action: string
          approved_by_admin_id: string
          approved_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          action: string
          approved_by_admin_id: string
          approved_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          approved_by_admin_id?: string
          approved_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          deleted_by: string | null
          id: string
          is_deleted: boolean
          is_pinned: boolean
          media_type: string | null
          media_url: string | null
          pinned_at: string | null
          pinned_by: string | null
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          media_type?: string | null
          media_url?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          is_pinned?: boolean
          media_type?: string | null
          media_url?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          reply_to_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      church_info: {
        Row: {
          category: string
          id: string
          key: string
          label: string | null
          sort_order: number | null
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          category: string
          id?: string
          key: string
          label?: string | null
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          category?: string
          id?: string
          key?: string
          label?: string | null
          sort_order?: number | null
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      devotionals: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          devotional_date: string
          id: string
          scripture_reference: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          devotional_date: string
          id?: string
          scripture_reference?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          devotional_date?: string
          id?: string
          scripture_reference?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      donation_payment_details: {
        Row: {
          created_at: string
          donation_id: string
          id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          created_at?: string
          donation_id: string
          id?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          created_at?: string
          donation_id?: string
          id?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donation_payment_details_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: true
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          campaign_id: string | null
          category: string
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          category: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "giving_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders_sent: {
        Row: {
          event_id: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reminders_sent_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          event_date: string
          id: string
          location: string
          media_type: string | null
          media_url: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          event_date: string
          id?: string
          location: string
          media_type?: string | null
          media_url?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          event_date?: string
          id?: string
          location?: string
          media_type?: string | null
          media_url?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      giving_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          current_amount: number
          description: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_amount?: number
          description: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          target_amount: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_amount?: number
          description?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      guest_event_reminders_sent: {
        Row: {
          event_id: string
          guest_email: string
          id: string
          sent_at: string
        }
        Insert: {
          event_id: string
          guest_email: string
          id?: string
          sent_at?: string
        }
        Update: {
          event_id?: string
          guest_email?: string
          id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_event_reminders_sent_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_event_rsvps: {
        Row: {
          created_at: string
          email: string
          event_id: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          full_name: string
          id?: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      livestream_links: {
        Row: {
          id: string
          is_active: boolean
          platform: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          platform: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          id?: string
          is_active?: boolean
          platform?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          media_type: string | null
          media_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          devotionals_enabled: boolean
          events_enabled: boolean
          id: string
          news_enabled: boolean
          sermons_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          devotionals_enabled?: boolean
          events_enabled?: boolean
          id?: string
          news_enabled?: boolean
          sermons_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          devotionals_enabled?: boolean
          events_enabled?: boolean
          id?: string
          news_enabled?: boolean
          sermons_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          content: string
          created_at: string
          id: string
          is_answered: boolean
          is_urgent: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_answered?: boolean
          is_urgent?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_answered?: boolean
          is_urgent?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          church_name: string | null
          created_at: string
          full_name: string
          id: string
          is_approved: boolean
          ministry: string | null
          phone: string | null
          phone_visible: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          church_name?: string | null
          created_at?: string
          full_name: string
          id: string
          is_approved?: boolean
          ministry?: string | null
          phone?: string | null
          phone_visible?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          church_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_approved?: boolean
          ministry?: string | null
          phone?: string | null
          phone_visible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_change_logs: {
        Row: {
          action: string
          changed_by_user_id: string
          created_at: string
          id: string
          role: string
          target_user_id: string
        }
        Insert: {
          action: string
          changed_by_user_id: string
          created_at?: string
          id?: string
          role: string
          target_user_id: string
        }
        Update: {
          action?: string
          changed_by_user_id?: string
          created_at?: string
          id?: string
          role?: string
          target_user_id?: string
        }
        Relationships: []
      }
      sermons: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          media_type: string
          media_url: string | null
          sermon_date: string
          speaker: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          media_type: string
          media_url?: string | null
          sermon_date: string
          speaker?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          media_type?: string
          media_url?: string | null
          sermon_date?: string
          speaker?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      campaign_donor_stats: {
        Row: {
          campaign_id: string | null
          donation_count: number | null
          full_name: string | null
          last_donation_date: string | null
          total_donated: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "giving_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_donor_stats: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "leader" | "member" | "super_leader"
    }
    CompositeTypes: {
      [_ in never]: never
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
      app_role: ["admin", "leader", "member", "super_leader"],
    },
  },
} as const
