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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_presence: {
        Row: {
          active_chat_count: number
          created_at: string
          last_seen_at: string
          status: Database["public"]["Enums"]["listener_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active_chat_count?: number
          created_at?: string
          last_seen_at?: string
          status?: Database["public"]["Enums"]["listener_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active_chat_count?: number
          created_at?: string
          last_seen_at?: string
          status?: Database["public"]["Enums"]["listener_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_monitor_sessions: {
        Row: {
          admin_user_id: string
          call_id: string
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
        }
        Insert: {
          admin_user_id: string
          call_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
        }
        Update: {
          admin_user_id?: string
          call_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_monitor_sessions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_notes: {
        Row: {
          body: string
          call_id: string | null
          client_alias: string | null
          client_id: string | null
          created_at: string
          id: string
          listener_user_id: string
        }
        Insert: {
          body: string
          call_id?: string | null
          client_alias?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          listener_user_id: string
        }
        Update: {
          body?: string
          call_id?: string | null
          client_alias?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          listener_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_notes_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_call_sid: string | null
          agent_user_id: string | null
          answered_at: string | null
          billed_seconds: number
          client_id: string
          conference_name: string | null
          cost_cents: number
          duration_seconds: number
          ended_at: string | null
          free_seconds_used: number
          id: string
          last_heartbeat_at: string
          listener_id: string
          mode: string
          room_name: string | null
          started_at: string
          status: string
        }
        Insert: {
          agent_call_sid?: string | null
          agent_user_id?: string | null
          answered_at?: string | null
          billed_seconds?: number
          client_id: string
          conference_name?: string | null
          cost_cents?: number
          duration_seconds?: number
          ended_at?: string | null
          free_seconds_used?: number
          id?: string
          last_heartbeat_at?: string
          listener_id: string
          mode?: string
          room_name?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          agent_call_sid?: string | null
          agent_user_id?: string | null
          answered_at?: string | null
          billed_seconds?: number
          client_id?: string
          conference_name?: string | null
          cost_cents?: number
          duration_seconds?: number
          ended_at?: string | null
          free_seconds_used?: number
          id?: string
          last_heartbeat_at?: string
          listener_id?: string
          mode?: string
          room_name?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_listener_id_fkey"
            columns: ["listener_id"]
            isOneToOne: false
            referencedRelation: "listeners"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_events: {
        Row: {
          actor_role: string
          created_at: string
          detail: string | null
          event: string
          id: string
          session_id: string
        }
        Insert: {
          actor_role?: string
          created_at?: string
          detail?: string | null
          event: string
          id?: string
          session_id: string
        }
        Update: {
          actor_role?: string
          created_at?: string
          detail?: string | null
          event?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_role: string
          sender_user_id: string
          session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_role: string
          sender_user_id: string
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_role?: string
          sender_user_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          agent_user_id: string | null
          answered_at: string | null
          billed_seconds: number
          client_id: string
          cost_cents: number
          created_at: string
          duration_seconds: number
          ended_at: string | null
          free_seconds_used: number
          id: string
          last_heartbeat_at: string
          listener_id: string
          mode: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_user_id?: string | null
          answered_at?: string | null
          billed_seconds?: number
          client_id: string
          cost_cents?: number
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          free_seconds_used?: number
          id?: string
          last_heartbeat_at?: string
          listener_id: string
          mode?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_user_id?: string | null
          answered_at?: string | null
          billed_seconds?: number
          client_id?: string
          cost_cents?: number
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          free_seconds_used?: number
          id?: string
          last_heartbeat_at?: string
          listener_id?: string
          mode?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_listener_id_fkey"
            columns: ["listener_id"]
            isOneToOne: false
            referencedRelation: "listeners"
            referencedColumns: ["id"]
          },
        ]
      }
      client_agent_routes: {
        Row: {
          agent_user_id: string
          client_id: string
          created_at: string
          id: string
          listener_id: string
          updated_at: string
        }
        Insert: {
          agent_user_id: string
          client_id: string
          created_at?: string
          id?: string
          listener_id: string
          updated_at?: string
        }
        Update: {
          agent_user_id?: string
          client_id?: string
          created_at?: string
          id?: string
          listener_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_agent_routes_listener_id_fkey"
            columns: ["listener_id"]
            isOneToOne: false
            referencedRelation: "listeners"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          kind: string
          seconds_delta: number
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          id?: string
          kind?: string
          seconds_delta: number
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          kind?: string
          seconds_delta?: number
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      listener_agents: {
        Row: {
          agent_user_id: string
          created_at: string
          id: string
          listener_id: string
        }
        Insert: {
          agent_user_id: string
          created_at?: string
          id?: string
          listener_id: string
        }
        Update: {
          agent_user_id?: string
          created_at?: string
          id?: string
          listener_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listener_agents_listener_id_fkey"
            columns: ["listener_id"]
            isOneToOne: false
            referencedRelation: "listeners"
            referencedColumns: ["id"]
          },
        ]
      }
      listeners: {
        Row: {
          avatar_key: string
          bio_en: string
          bio_nl: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          languages: string[]
          sort_order: number
          status: Database["public"]["Enums"]["listener_status"]
          topics_en: string[]
          topics_nl: string[]
          updated_at: string
          user_id: string | null
          years: number
        }
        Insert: {
          avatar_key: string
          bio_en: string
          bio_nl: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          languages?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]["listener_status"]
          topics_en?: string[]
          topics_nl?: string[]
          updated_at?: string
          user_id?: string | null
          years?: number
        }
        Update: {
          avatar_key?: string
          bio_en?: string
          bio_nl?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          languages?: string[]
          sort_order?: number
          status?: Database["public"]["Enums"]["listener_status"]
          topics_en?: string[]
          topics_nl?: string[]
          updated_at?: string
          user_id?: string | null
          years?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          alias: string
          created_at: string
          credit_seconds: number
          free_seconds_remaining: number
          id: string
          is_blocked: boolean
          locale: string
          updated_at: string
        }
        Insert: {
          alias?: string
          created_at?: string
          credit_seconds?: number
          free_seconds_remaining?: number
          id: string
          is_blocked?: boolean
          locale?: string
          updated_at?: string
        }
        Update: {
          alias?: string
          created_at?: string
          credit_seconds?: number
          free_seconds_remaining?: number
          id?: string
          is_blocked?: boolean
          locale?: string
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      assign_chat_agent: {
        Args: { _client_id: string; _listener_id: string }
        Returns: string
      }
      grant_credits: {
        Args: {
          _cents: number
          _seconds: number
          _session: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      revoke_credits: {
        Args: {
          _block: boolean
          _cents: number
          _kind: string
          _ref: string
          _seconds: number
          _user_id: string
        }
        Returns: boolean
      }
      set_agent_status: {
        Args: {
          _agent_user_id: string
          _status: Database["public"]["Enums"]["listener_status"]
        }
        Returns: undefined
      }
      settle_call: {
        Args: { _call_id: string; _end_at?: string; _rate_cents: number }
        Returns: {
          billed: number
          cost: number
          free_left: number
          paid_left: number
        }[]
      }
      settle_chat: {
        Args: { _end_at?: string; _rate_cents: number; _session_id: string }
        Returns: {
          billed: number
          cost: number
          free_left: number
          paid_left: number
        }[]
      }
      settle_stale_calls: {
        Args: { _rate_cents: number; _user_id: string }
        Returns: undefined
      }
      settle_stale_chats: {
        Args: { _rate_cents: number; _user_id: string }
        Returns: undefined
      }
      sync_listener_status: {
        Args: { _listener_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "client" | "staff" | "admin"
      listener_status: "online" | "busy" | "offline"
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
      app_role: ["client", "staff", "admin"],
      listener_status: ["online", "busy", "offline"],
    },
  },
} as const
