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
          availability: string
          created_at: string
          last_seen_at: string
          online_since: string | null
          status: Database["public"]["Enums"]["listener_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active_chat_count?: number
          availability?: string
          created_at?: string
          last_seen_at?: string
          online_since?: string | null
          status?: Database["public"]["Enums"]["listener_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active_chat_count?: number
          availability?: string
          created_at?: string
          last_seen_at?: string
          online_since?: string | null
          status?: Database["public"]["Enums"]["listener_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_shift_events: {
        Row: {
          agent_user_id: string
          availability: string
          created_at: string
          id: string
        }
        Insert: {
          agent_user_id: string
          availability: string
          created_at?: string
          id?: string
        }
        Update: {
          agent_user_id?: string
          availability?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      ai_interactions: {
        Row: {
          ai_response: string
          created_at: string
          credit_purchased: boolean
          engagement_score: number
          id: string
          persona_id: string | null
          persona_name: string
          promoted: boolean
          replied_at: string | null
          session_duration_seconds: number
          session_id: string
          user_prompt: string
          user_replied: boolean
        }
        Insert: {
          ai_response: string
          created_at?: string
          credit_purchased?: boolean
          engagement_score?: number
          id?: string
          persona_id?: string | null
          persona_name?: string
          promoted?: boolean
          replied_at?: string | null
          session_duration_seconds?: number
          session_id: string
          user_prompt?: string
          user_replied?: boolean
        }
        Update: {
          ai_response?: string
          created_at?: string
          credit_purchased?: boolean
          engagement_score?: number
          id?: string
          persona_id?: string | null
          persona_name?: string
          promoted?: boolean
          replied_at?: string | null
          session_duration_seconds?: number
          session_id?: string
          user_prompt?: string
          user_replied?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_playbook: {
        Row: {
          ai_response: string
          created_at: string
          embedding: string | null
          engagement_score: number
          id: string
          interaction_id: string | null
          model_version: string
          persona_name: string
          user_prompt: string
        }
        Insert: {
          ai_response: string
          created_at?: string
          embedding?: string | null
          engagement_score?: number
          id?: string
          interaction_id?: string | null
          model_version?: string
          persona_name?: string
          user_prompt: string
        }
        Update: {
          ai_response?: string
          created_at?: string
          embedding?: string | null
          engagement_score?: number
          id?: string
          interaction_id?: string | null
          model_version?: string
          persona_name?: string
          user_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_playbook_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "ai_interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      argument_votes: {
        Row: {
          argument_id: string
          user_id: string
          value: number
        }
        Insert: {
          argument_id: string
          user_id: string
          value: number
        }
        Update: {
          argument_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "argument_votes_argument_id_fkey"
            columns: ["argument_id"]
            isOneToOne: false
            referencedRelation: "dilemma_arguments"
            referencedColumns: ["id"]
          },
        ]
      }
      bottle_echoes: {
        Row: {
          body: string
          bottle_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          bottle_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          bottle_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bottle_echoes_bottle_id_fkey"
            columns: ["bottle_id"]
            isOneToOne: false
            referencedRelation: "bottles"
            referencedColumns: ["id"]
          },
        ]
      }
      bottles: {
        Row: {
          body: string
          created_at: string
          echo_count: number
          id: string
          is_hidden: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          echo_count?: number
          id?: string
          is_hidden?: boolean
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          echo_count?: number
          id?: string
          is_hidden?: boolean
          user_id?: string
        }
        Relationships: []
      }
      buddies: {
        Row: {
          codename_a: string
          codename_b: string
          created_at: string
          id: string
          requested_by: string
          source_match_id: string | null
          status: string
          user_a: string
          user_b: string
        }
        Insert: {
          codename_a?: string
          codename_b?: string
          created_at?: string
          id?: string
          requested_by: string
          source_match_id?: string | null
          status?: string
          user_a: string
          user_b: string
        }
        Update: {
          codename_a?: string
          codename_b?: string
          created_at?: string
          id?: string
          requested_by?: string
          source_match_id?: string | null
          status?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      buddy_notes: {
        Row: {
          body: string
          buddy_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          buddy_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          buddy_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buddy_notes_buddy_id_fkey"
            columns: ["buddy_id"]
            isOneToOne: false
            referencedRelation: "buddies"
            referencedColumns: ["id"]
          },
        ]
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
          category: string | null
          chat_session_id: string | null
          client_alias: string | null
          client_id: string | null
          created_at: string
          id: string
          listener_user_id: string
        }
        Insert: {
          body: string
          call_id?: string | null
          category?: string | null
          chat_session_id?: string | null
          client_alias?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          listener_user_id: string
        }
        Update: {
          body?: string
          call_id?: string | null
          category?: string | null
          chat_session_id?: string | null
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
          {
            foreignKeyName: "call_notes_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
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
          failure_reason: string | null
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
          failure_reason?: string | null
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
          failure_reason?: string | null
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
          is_ai: boolean
          sender_role: string
          sender_user_id: string | null
          session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_ai?: boolean
          sender_role: string
          sender_user_id?: string | null
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          sender_role?: string
          sender_user_id?: string | null
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
          ai_active: boolean
          ai_muted: boolean
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
          listener_id: string | null
          mode: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_user_id?: string | null
          ai_active?: boolean
          ai_muted?: boolean
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
          listener_id?: string | null
          mode?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_user_id?: string | null
          ai_active?: boolean
          ai_muted?: boolean
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
          listener_id?: string | null
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
      community_posts: {
        Row: {
          alias: string
          body: string
          created_at: string
          id: string
          is_hidden: boolean
          parent_id: string | null
          score: number
          title: string | null
          topic: string
          user_id: string
        }
        Insert: {
          alias?: string
          body: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          parent_id?: string | null
          score?: number
          title?: string | null
          topic: string
          user_id: string
        }
        Update: {
          alias?: string
          body?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          parent_id?: string | null
          score?: number
          title?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_votes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          handled: boolean
          id: string
          message: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          handled?: boolean
          id?: string
          message: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          handled?: boolean
          id?: string
          message?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          credits_delta: number
          external_ref: string | null
          id: string
          kind: string
          payment_source: string | null
          seconds_delta: number
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          credits_delta?: number
          external_ref?: string | null
          id?: string
          kind?: string
          payment_source?: string | null
          seconds_delta: number
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          credits_delta?: number
          external_ref?: string | null
          id?: string
          kind?: string
          payment_source?: string | null
          seconds_delta?: number
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dilemma_arguments: {
        Row: {
          body: string
          created_at: string
          dilemma_id: string
          id: string
          score: number
          side: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          dilemma_id: string
          id?: string
          score?: number
          side: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          dilemma_id?: string
          id?: string
          score?: number
          side?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dilemma_arguments_dilemma_id_fkey"
            columns: ["dilemma_id"]
            isOneToOne: false
            referencedRelation: "dilemmas"
            referencedColumns: ["id"]
          },
        ]
      }
      dilemma_votes: {
        Row: {
          choice: string
          created_at: string
          dilemma_id: string
          id: string
          user_id: string
        }
        Insert: {
          choice: string
          created_at?: string
          dilemma_id: string
          id?: string
          user_id: string
        }
        Update: {
          choice?: string
          created_at?: string
          dilemma_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dilemma_votes_dilemma_id_fkey"
            columns: ["dilemma_id"]
            isOneToOne: false
            referencedRelation: "dilemmas"
            referencedColumns: ["id"]
          },
        ]
      }
      dilemmas: {
        Row: {
          created_at: string
          day: string
          id: string
          option_a: string
          option_b: string
          question: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          option_a: string
          option_b: string
          question: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          option_a?: string
          option_b?: string
          question?: string
        }
        Relationships: []
      }
      engagement_events: {
        Row: {
          created_at: string
          depth: string | null
          detail: Json
          event: string
          id: string
          mood: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          depth?: string | null
          detail?: Json
          event: string
          id?: string
          mood?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          depth?: string | null
          detail?: Json
          event?: string
          id?: string
          mood?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      fortune_claims: {
        Row: {
          created_at: string
          day: string
          quote_index: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          quote_index: number
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          quote_index?: number
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
          chat_credits: number
          created_at: string
          credit_seconds: number
          free_credits: number
          free_seconds_remaining: number
          id: string
          is_blocked: boolean
          locale: string
          referral_code: string | null
          sent_message_count: number
          signup_country: string | null
          updated_at: string
        }
        Insert: {
          alias?: string
          chat_credits?: number
          created_at?: string
          credit_seconds?: number
          free_credits?: number
          free_seconds_remaining?: number
          id: string
          is_blocked?: boolean
          locale?: string
          referral_code?: string | null
          sent_message_count?: number
          signup_country?: string | null
          updated_at?: string
        }
        Update: {
          alias?: string
          chat_credits?: number
          created_at?: string
          credit_seconds?: number
          free_credits?: number
          free_seconds_remaining?: number
          id?: string
          is_blocked?: boolean
          locale?: string
          referral_code?: string | null
          sent_message_count?: number
          signup_country?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          country: string | null
          created_at: string
          id: string
          path: string
          referrer: string | null
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      sos_days: {
        Row: {
          created_at: string
          day: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      speed_matches: {
        Row: {
          a_extend: boolean
          b_extend: boolean
          created_at: string
          ends_at: string
          id: string
          status: string
          user_a: string
          user_b: string
        }
        Insert: {
          a_extend?: boolean
          b_extend?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          status?: string
          user_a: string
          user_b: string
        }
        Update: {
          a_extend?: boolean
          b_extend?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          status?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      speed_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "speed_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_queue: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      speed_reports: {
        Row: {
          created_at: string
          id: string
          match_id: string
          reason: string | null
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          reason?: string | null
          reported_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          reason?: string | null
          reported_id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "speed_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_announcements: {
        Row: {
          author_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id: string
          author_name?: string
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          email: string | null
          id: string
          status: string
          summary: string
          transcript: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          status?: string
          summary: string
          transcript: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          status?: string
          summary?: string
          transcript?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          blocked: boolean
          created_at: string
          excerpt: string | null
          id: string
          reason: string | null
          reported_id: string | null
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          excerpt?: string | null
          id?: string
          reason?: string | null
          reported_id?: string | null
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          excerpt?: string | null
          id?: string
          reason?: string | null
          reported_id?: string | null
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
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
      admin_resolve_report: {
        Args: { _action: string; _report_id: string }
        Returns: undefined
      }
      assign_chat_agent: {
        Args: { _client_id: string; _listener_id: string }
        Returns: string
      }
      block_user_by_post: { Args: { _post_id: string }; Returns: undefined }
      buddy_end: { Args: { _buddy_id: string }; Returns: undefined }
      buddy_request: { Args: { _match_id: string }; Returns: string }
      buddy_respond: {
        Args: { _accept: boolean; _buddy_id: string }
        Returns: undefined
      }
      claim_daily_fortune: {
        Args: never
        Returns: {
          granted: boolean
          quote_index: number
        }[]
      }
      claim_next_chat: { Args: { _agent_user_id: string }; Returns: string }
      complete_sos: {
        Args: never
        Returns: {
          reward: number
          streak: number
        }[]
      }
      delete_user_content: { Args: { _user_id: string }; Returns: undefined }
      dilemma_results: {
        Args: { _dilemma_id: string }
        Returns: {
          votes_a: number
          votes_b: number
        }[]
      }
      expire_stale_chats: { Args: never; Returns: undefined }
      fish_bottle: {
        Args: never
        Returns: {
          body: string
          created_at: string
          echo_count: number
          id: string
        }[]
      }
      gen_codename: { Args: never; Returns: string }
      grant_chat_credits: {
        Args: {
          _cents: number
          _credits: number
          _session: string
          _user_id: string
        }
        Returns: boolean
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
      grant_google_play_credits: {
        Args: {
          _cents: number
          _credits: number
          _purchase_token: string
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
      mask_pii: { Args: { _t: string }; Returns: string }
      match_ai_playbook: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          ai_response: string
          similarity: number
          user_prompt: string
        }[]
      }
      my_wings: { Args: never; Returns: number }
      redeem_referral: { Args: { _code: string }; Returns: string }
      report_content: {
        Args: {
          _block: boolean
          _reason: string
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
      revoke_chat_credits: {
        Args: {
          _block: boolean
          _cents: number
          _credits: number
          _kind: string
          _ref: string
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
      send_buddy_note: {
        Args: { _body: string; _buddy_id: string }
        Returns: string
      }
      send_metered_chat_message: {
        Args: { _body: string; _session_id: string; _user_id: string }
        Returns: Json
      }
      set_agent_availability: {
        Args: { _agent_user_id: string; _availability: string }
        Returns: undefined
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
      settle_stale_agent_chats: {
        Args: { _agent_user_id: string; _rate_cents: number }
        Returns: undefined
      }
      settle_stale_calls: {
        Args: { _rate_cents: number; _user_id: string }
        Returns: undefined
      }
      settle_stale_chats: {
        Args: { _rate_cents: number; _user_id: string }
        Returns: undefined
      }
      speed_end: { Args: { _match_id: string }; Returns: undefined }
      speed_extend: { Args: { _match_id: string }; Returns: undefined }
      speed_join: { Args: never; Returns: string }
      speed_leave_queue: { Args: never; Returns: undefined }
      speed_report: {
        Args: { _match_id: string; _reason: string }
        Returns: undefined
      }
      speed_send: {
        Args: { _body: string; _match_id: string }
        Returns: string
      }
      spend_chat_credit: {
        Args: { _session_id: string; _user_id: string }
        Returns: {
          free_left: number
          ok: boolean
          paid_left: number
        }[]
      }
      spend_message_credit: {
        Args: { _kind: string; _user_id: string }
        Returns: number
      }
      sync_listener_status: {
        Args: { _listener_id: string }
        Returns: undefined
      }
      vote_argument: {
        Args: { _argument_id: string; _value: number }
        Returns: number
      }
      vote_post: { Args: { _post_id: string; _value: number }; Returns: number }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
