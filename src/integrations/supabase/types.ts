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
      call_notes: {
        Row: {
          body: string
          call_id: string | null
          client_alias: string | null
          created_at: string
          id: string
          listener_user_id: string
        }
        Insert: {
          body: string
          call_id?: string | null
          client_alias?: string | null
          created_at?: string
          id?: string
          listener_user_id: string
        }
        Update: {
          body?: string
          call_id?: string | null
          client_alias?: string | null
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
          billed_seconds: number
          client_id: string
          cost_cents: number
          duration_seconds: number
          ended_at: string | null
          free_seconds_used: number
          id: string
          listener_id: string
          room_name: string | null
          started_at: string
        }
        Insert: {
          billed_seconds?: number
          client_id: string
          cost_cents?: number
          duration_seconds?: number
          ended_at?: string | null
          free_seconds_used?: number
          id?: string
          listener_id: string
          room_name?: string | null
          started_at?: string
        }
        Update: {
          billed_seconds?: number
          client_id?: string
          cost_cents?: number
          duration_seconds?: number
          ended_at?: string | null
          free_seconds_used?: number
          id?: string
          listener_id?: string
          room_name?: string | null
          started_at?: string
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
      credit_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          kind: string
          seconds_delta: number
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          id?: string
          kind?: string
          seconds_delta: number
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          kind?: string
          seconds_delta?: number
          user_id?: string
        }
        Relationships: []
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
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          alias?: string
          created_at?: string
          credit_seconds?: number
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          alias?: string
          created_at?: string
          credit_seconds?: number
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
