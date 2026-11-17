// AUTO-GENERATED — do not edit by hand.
// Generated 2026-11-17 from Supabase project yybpacultmaxqxjfsrvx (public schema) via the
// Supabase MCP connector's generate_typescript_types tool. The equivalent CLI command is:
//
//   npx supabase gen types typescript --project-id yybpacultmaxqxjfsrvx --schema public > src/types/database.ts
//
// Regenerate after every applied migration. The committed snapshot of the same
// schema (columns, RLS status, policies) lives in docs/db/schema-snapshot-2026-11-17.md.

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_insights: {
        Row: {
          account_id: string
          ad_id: string
          ad_name: string | null
          adset_id: string | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number
          conversions: number | null
          cpc: number
          created_at: string
          ctr: number
          date: string
          id: string
          impressions: number
          platform: string
          project_id: string
          raw: Json
          roas: number | null
          spend: number
          synced_at: string
        }
        Insert: {
          account_id: string
          ad_id: string
          ad_name?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number
          conversions?: number | null
          cpc?: number
          created_at?: string
          ctr?: number
          date: string
          id?: string
          impressions?: number
          platform?: string
          project_id: string
          raw?: Json
          roas?: number | null
          spend?: number
          synced_at?: string
        }
        Update: {
          account_id?: string
          ad_id?: string
          ad_name?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number
          conversions?: number | null
          cpc?: number
          created_at?: string
          ctr?: number
          date?: string
          id?: string
          impressions?: number
          platform?: string
          project_id?: string
          raw?: Json
          roas?: number | null
          spend?: number
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generations: {
        Row: {
          agent_used: string
          asset_id: string | null
          created_at: string | null
          duration_ms: number | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          project_id: string | null
          prompt_hash: string | null
        }
        Insert: {
          agent_used: string
          asset_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          project_id?: string | null
          prompt_hash?: string | null
        }
        Update: {
          agent_used?: string
          asset_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          project_id?: string | null
          prompt_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_visibility_checks: {
        Row: {
          answer_excerpt: string | null
          asked_at: string
          cited: boolean
          competitors_mentioned: string[]
          created_at: string
          engine: string
          id: string
          mentioned: boolean
          position: number | null
          project_id: string
          question: string
          raw: Json
        }
        Insert: {
          answer_excerpt?: string | null
          asked_at?: string
          cited?: boolean
          competitors_mentioned?: string[]
          created_at?: string
          engine: string
          id?: string
          mentioned?: boolean
          position?: number | null
          project_id: string
          question: string
          raw?: Json
        }
        Update: {
          answer_excerpt?: string | null
          asked_at?: string
          cited?: boolean
          competitors_mentioned?: string[]
          created_at?: string
          engine?: string
          id?: string
          mentioned?: boolean
          position?: number | null
          project_id?: string
          question?: string
          raw?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_visibility_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      assets: {
        Row: {
          archived: boolean | null
          campaign_id: string | null
          channel: string | null
          content: Json
          created_at: string | null
          external_id: string | null
          id: string
          parent_asset_id: string | null
          performance: Json | null
          project_id: string
          published_at: string | null
          selected: boolean | null
          status: string | null
          title: string | null
          type: string
          updated_at: string | null
          variant_group_id: string | null
          variant_label: string | null
          version: number | null
        }
        Insert: {
          archived?: boolean | null
          campaign_id?: string | null
          channel?: string | null
          content: Json
          created_at?: string | null
          external_id?: string | null
          id?: string
          parent_asset_id?: string | null
          performance?: Json | null
          project_id: string
          published_at?: string | null
          selected?: boolean | null
          status?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
          variant_group_id?: string | null
          variant_label?: string | null
          version?: number | null
        }
        Update: {
          archived?: boolean | null
          campaign_id?: string | null
          channel?: string | null
          content?: Json
          created_at?: string | null
          external_id?: string | null
          id?: string
          parent_asset_id?: string | null
          performance?: Json | null
          project_id?: string
          published_at?: string | null
          selected?: boolean | null
          status?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
          variant_group_id?: string | null
          variant_label?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_contacts: {
        Row: {
          audience_id: string
          created_at: string
          custom_fields: Json
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          resend_contact_id: string | null
          status: string
          subscribed_at: string
          suppression_reason: string | null
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
          whatsapp_opt_in: boolean
          whatsapp_opt_in_at: string | null
        }
        Insert: {
          audience_id: string
          created_at?: string
          custom_fields?: Json
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          resend_contact_id?: string | null
          status?: string
          subscribed_at?: string
          suppression_reason?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
        }
        Update: {
          audience_id?: string
          created_at?: string
          custom_fields?: Json
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          resend_contact_id?: string | null
          status?: string
          subscribed_at?: string
          suppression_reason?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          whatsapp_opt_in?: boolean
          whatsapp_opt_in_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audience_contacts_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
        ]
      }
      audiences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          resend_audience_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          resend_audience_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          resend_audience_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          auto_fixes_applied: Json | null
          created_at: string | null
          findings: Json
          id: string
          metadata: Json | null
          project_id: string
          score: number | null
          type: string
          url: string
        }
        Insert: {
          auto_fixes_applied?: Json | null
          created_at?: string | null
          findings: Json
          id?: string
          metadata?: Json | null
          project_id: string
          score?: number | null
          type: string
          url: string
        }
        Update: {
          auto_fixes_applied?: Json | null
          created_at?: string | null
          findings?: Json
          id?: string
          metadata?: Json | null
          project_id?: string
          score?: number | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_settings: {
        Row: {
          created_at: string
          linkedin_mode: string
          review_hold_hours: number
          updated_at: string
          user_id: string
          x_mode: string
        }
        Insert: {
          created_at?: string
          linkedin_mode?: string
          review_hold_hours?: number
          updated_at?: string
          user_id: string
          x_mode?: string
        }
        Update: {
          created_at?: string
          linkedin_mode?: string
          review_hold_hours?: number
          updated_at?: string
          user_id?: string
          x_mode?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          content_markdown: string | null
          created_at: string
          cta: Json
          date_modified: string
          date_published: string
          description: string
          excerpt: string
          featured_image_query: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          project_id: string | null
          reading_time_minutes: number | null
          sections: Json | null
          slug: string
          source_asset_id: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author?: string
          content_markdown?: string | null
          created_at?: string
          cta?: Json
          date_modified?: string
          date_published?: string
          description: string
          excerpt: string
          featured_image_query?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          project_id?: string | null
          reading_time_minutes?: number | null
          sections?: Json | null
          slug: string
          source_asset_id?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author?: string
          content_markdown?: string | null
          created_at?: string
          cta?: Json
          date_modified?: string
          date_published?: string
          description?: string
          excerpt?: string
          featured_image_query?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          project_id?: string | null
          reading_time_minutes?: number | null
          sections?: Json | null
          slug?: string
          source_asset_id?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          audience_id: string
          created_at: string
          error_message: string | null
          from_email: string
          from_name: string
          html_body: string
          id: string
          project_id: string
          reply_to: string | null
          resend_broadcast_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string
          text_body: string | null
          totals: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_id: string
          created_at?: string
          error_message?: string | null
          from_email: string
          from_name: string
          html_body: string
          id?: string
          project_id: string
          reply_to?: string | null
          resend_broadcast_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          text_body?: string | null
          totals?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_id?: string
          created_at?: string
          error_message?: string | null
          from_email?: string
          from_name?: string
          html_body?: string
          id?: string
          project_id?: string
          reply_to?: string | null
          resend_broadcast_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          text_body?: string | null
          totals?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_jobs: {
        Row: {
          agent_id: string
          completed: number | null
          completed_at: string | null
          created_at: string | null
          failed: number | null
          id: string
          project_id: string | null
          status: string | null
          total: number
          user_id: string | null
        }
        Insert: {
          agent_id: string
          completed?: number | null
          completed_at?: string | null
          created_at?: string | null
          failed?: number | null
          id?: string
          project_id?: string | null
          status?: string | null
          total: number
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          completed?: number | null
          completed_at?: string | null
          created_at?: string | null
          failed?: number | null
          id?: string
          project_id?: string | null
          status?: string | null
          total?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_steps: {
        Row: {
          agent_id: string
          campaign_id: string
          completed_at: string | null
          config: Json | null
          created_at: string | null
          id: string
          result: Json | null
          started_at: string | null
          status: string | null
          step_order: number
        }
        Insert: {
          agent_id: string
          campaign_id: string
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
          step_order: number
        }
        Update: {
          agent_id?: string
          campaign_id?: string
          completed_at?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          result?: Json | null
          started_at?: string | null
          status?: string | null
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          name: string
          project_id: string
          results: Json | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          name: string
          project_id: string
          results?: Json | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string
          results?: Json | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_snapshots: {
        Row: {
          content_gaps: string[] | null
          created_at: string | null
          estimated_da: number | null
          id: string
          keyword_overlap: number | null
          snapshot_data: Json | null
          top_keywords: string[] | null
          tracker_id: string | null
        }
        Insert: {
          content_gaps?: string[] | null
          created_at?: string | null
          estimated_da?: number | null
          id?: string
          keyword_overlap?: number | null
          snapshot_data?: Json | null
          top_keywords?: string[] | null
          tracker_id?: string | null
        }
        Update: {
          content_gaps?: string[] | null
          created_at?: string | null
          estimated_da?: number | null
          id?: string
          keyword_overlap?: number | null
          snapshot_data?: Json | null
          top_keywords?: string[] | null
          tracker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_snapshots_tracker_id_fkey"
            columns: ["tracker_id"]
            isOneToOne: false
            referencedRelation: "competitor_trackers"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_trackers: {
        Row: {
          competitor_name: string | null
          competitor_url: string
          created_at: string | null
          id: string
          last_checked_at: string | null
          project_id: string | null
        }
        Insert: {
          competitor_name?: string | null
          competitor_url: string
          created_at?: string | null
          id?: string
          last_checked_at?: string | null
          project_id?: string | null
        }
        Update: {
          competitor_name?: string | null
          competitor_url?: string
          created_at?: string | null
          id?: string
          last_checked_at?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_trackers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          metadata: Json
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          project_id: string | null
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          metadata?: Json
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          project_id?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          metadata?: Json
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          project_id?: string | null
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connected_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revisions: {
        Row: {
          asset_id: string
          content: Json
          created_at: string
          id: string
          source: string
        }
        Insert: {
          asset_id: string
          content: Json
          created_at?: string
          id?: string
          source: string
        }
        Update: {
          asset_id?: string
          content?: Json
          created_at?: string
          id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      content_scores: {
        Row: {
          brand_alignment: number
          clarity: number
          content_preview: string | null
          content_type: string
          engagement_potential: number
          id: string
          post_id: string | null
          project_id: string | null
          relevance: number
          scored_at: string | null
          summary: string | null
          top_improvement: string | null
          top_strength: string | null
          total_score: number
        }
        Insert: {
          brand_alignment: number
          clarity: number
          content_preview?: string | null
          content_type: string
          engagement_potential: number
          id?: string
          post_id?: string | null
          project_id?: string | null
          relevance: number
          scored_at?: string | null
          summary?: string | null
          top_improvement?: string | null
          top_strength?: string | null
          total_score: number
        }
        Update: {
          brand_alignment?: number
          clarity?: number
          content_preview?: string | null
          content_type?: string
          engagement_potential?: number
          id?: string
          post_id?: string | null
          project_id?: string | null
          relevance?: number
          scored_at?: string | null
          summary?: string | null
          top_improvement?: string | null
          top_strength?: string | null
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          broadcast_id: string
          contact_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          resend_event_id: string | null
        }
        Insert: {
          broadcast_id: string
          contact_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          resend_event_id?: string | null
        }
        Update: {
          broadcast_id?: string
          contact_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          resend_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "audience_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_enrollments: {
        Row: {
          audience_id: string
          cancellation_reason: string | null
          completed_at: string | null
          contact_id: string
          created_at: string
          current_step_order: number
          enrolled_at: string
          id: string
          last_step_at: string | null
          sequence_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_id: string
          cancellation_reason?: string | null
          completed_at?: string | null
          contact_id: string
          created_at?: string
          current_step_order?: number
          enrolled_at?: string
          id?: string
          last_step_at?: string | null
          sequence_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_id?: string
          cancellation_reason?: string | null
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          current_step_order?: number
          enrolled_at?: string
          id?: string
          last_step_at?: string | null
          sequence_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_enrollments_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "audience_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          asset_id: string
          channel: string
          created_at: string | null
          delay_hours: number | null
          id: string
          preview_text: string | null
          sequence_id: string
          step_order: number
          subject_line: string
        }
        Insert: {
          asset_id: string
          channel?: string
          created_at?: string | null
          delay_hours?: number | null
          id?: string
          preview_text?: string | null
          sequence_id: string
          step_order: number
          subject_line: string
        }
        Update: {
          asset_id?: string
          channel?: string
          created_at?: string | null
          delay_hours?: number | null
          id?: string
          preview_text?: string | null
          sequence_id?: string
          step_order?: number
          subject_line?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          exit_conditions: Json | null
          id: string
          name: string
          project_id: string
          status: string | null
          trigger_event: string | null
          type: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          exit_conditions?: Json | null
          id?: string
          name: string
          project_id: string
          status?: string | null
          trigger_event?: string | null
          type: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          exit_conditions?: Json | null
          id?: string
          name?: string
          project_id?: string
          status?: string | null
          trigger_event?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hosted_pages: {
        Row: {
          asset_id: string | null
          created_at: string
          id: string
          meta_description: string | null
          page: Json
          project_id: string
          published_at: string | null
          site_slug: string
          slug: string
          status: string
          template: string
          title: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          page: Json
          project_id: string
          published_at?: string | null
          site_slug: string
          slug: string
          status?: string
          template?: string
          title: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          page?: Json
          project_id?: string
          published_at?: string | null
          site_slug?: string
          slug?: string
          status?: string
          template?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hosted_pages_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hosted_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_data: {
        Row: {
          clicks: number | null
          cluster: string | null
          created_at: string | null
          ctr: number | null
          date_range_end: string | null
          date_range_start: string | null
          difficulty: string | null
          estimated_volume: string | null
          id: string
          impressions: number | null
          intent: string | null
          notes: string | null
          position: number | null
          project_id: string
          quick_win: boolean | null
          saved_at: string | null
          seed: string
          source: string | null
          term: string
        }
        Insert: {
          clicks?: number | null
          cluster?: string | null
          created_at?: string | null
          ctr?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          difficulty?: string | null
          estimated_volume?: string | null
          id?: string
          impressions?: number | null
          intent?: string | null
          notes?: string | null
          position?: number | null
          project_id: string
          quick_win?: boolean | null
          saved_at?: string | null
          seed: string
          source?: string | null
          term: string
        }
        Update: {
          clicks?: number | null
          cluster?: string | null
          created_at?: string | null
          ctr?: number | null
          date_range_end?: string | null
          date_range_start?: string | null
          difficulty?: string | null
          estimated_volume?: string | null
          id?: string
          impressions?: number | null
          intent?: string | null
          notes?: string | null
          position?: number | null
          project_id?: string
          quick_win?: boolean | null
          saved_at?: string | null
          seed?: string
          source?: string | null
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_forms: {
        Row: {
          audience_id: string
          created_at: string
          fields: Json
          headline: string | null
          id: string
          is_active: boolean
          name: string
          project_id: string
          redirect_url: string | null
          sequence_id: string | null
          submission_count: number
          submit_label: string
          thank_you_message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audience_id: string
          created_at?: string
          fields?: Json
          headline?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          redirect_url?: string | null
          sequence_id?: string | null
          submission_count?: number
          submit_label?: string
          thank_you_message?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audience_id?: string
          created_at?: string
          fields?: Json
          headline?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          redirect_url?: string | null
          sequence_id?: string | null
          submission_count?: number
          submit_label?: string
          thank_you_message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_forms_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_forms_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_page_candidates: {
        Row: {
          asset_id: string | null
          competition: string | null
          created_at: string
          estimated: boolean
          hosted_page_id: string | null
          id: string
          kind: string
          last_error: string | null
          last_seen_at: string
          match_score: number
          matched_url: string | null
          monthly_searches: number | null
          project_id: string
          query: string
          readiness: Json | null
          score: number
          status: string
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          competition?: string | null
          created_at?: string
          estimated?: boolean
          hosted_page_id?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          last_seen_at?: string
          match_score?: number
          matched_url?: string | null
          monthly_searches?: number | null
          project_id: string
          query: string
          readiness?: Json | null
          score?: number
          status?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          competition?: string | null
          created_at?: string
          estimated?: boolean
          hosted_page_id?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          last_seen_at?: string
          match_score?: number
          matched_url?: string | null
          monthly_searches?: number | null
          project_id?: string
          query?: string
          readiness?: Json | null
          score?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missing_page_candidates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missing_page_candidates_hosted_page_id_fkey"
            columns: ["hosted_page_id"]
            isOneToOne: false
            referencedRelation: "hosted_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missing_page_candidates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      missing_page_runs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          gaps_found: number
          id: string
          mode: string
          pages_crawled: number
          pages_published: number
          pages_written: number
          project_id: string
          queries_checked: number
          started_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          gaps_found?: number
          id?: string
          mode: string
          pages_crawled?: number
          pages_published?: number
          pages_written?: number
          project_id: string
          queries_checked?: number
          started_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          gaps_found?: number
          id?: string
          mode?: string
          pages_crawled?: number
          pages_published?: number
          pages_written?: number
          project_id?: string
          queries_checked?: number
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "missing_page_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_content_state: {
        Row: {
          banned_hashes: string[] | null
          id: string
          posted_history: Json | null
          rotation_index: number | null
          updated_at: string | null
        }
        Insert: {
          banned_hashes?: string[] | null
          id?: string
          posted_history?: Json | null
          rotation_index?: number | null
          updated_at?: string | null
        }
        Update: {
          banned_hashes?: string[] | null
          id?: string
          posted_history?: Json | null
          rotation_index?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          project_id: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          project_id?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          project_id?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pitchodds_daily_picks: {
        Row: {
          actual_outcome: string | null
          away_team: string
          created_at: string
          home_team: string
          id: string
          kickoff_at: string | null
          match_id: string | null
          pick_date: string
          predicted_outcome: string
          predicted_prob: number
          settled_at: string | null
          updated_at: string
        }
        Insert: {
          actual_outcome?: string | null
          away_team: string
          created_at?: string
          home_team: string
          id?: string
          kickoff_at?: string | null
          match_id?: string | null
          pick_date: string
          predicted_outcome: string
          predicted_prob: number
          settled_at?: string | null
          updated_at?: string
        }
        Update: {
          actual_outcome?: string | null
          away_team?: string
          created_at?: string
          home_team?: string
          id?: string
          kickoff_at?: string | null
          match_id?: string | null
          pick_date?: string
          predicted_outcome?: string
          predicted_prob?: number
          settled_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      post_learnings: {
        Row: {
          active: boolean
          channel: string
          confidence: number
          created_at: string
          evidence: Json
          generated_at: string
          hypothesis: string
          id: string
          pattern_key: string
          project_id: string | null
        }
        Insert: {
          active?: boolean
          channel: string
          confidence?: number
          created_at?: string
          evidence?: Json
          generated_at?: string
          hypothesis: string
          id?: string
          pattern_key: string
          project_id?: string | null
        }
        Update: {
          active?: boolean
          channel?: string
          confidence?: number
          created_at?: string
          evidence?: Json
          generated_at?: string
          hypothesis?: string
          id?: string
          pattern_key?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_learnings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      post_metrics: {
        Row: {
          channel: string
          clicks: number | null
          comments: number | null
          created_at: string | null
          external_post_id: string
          id: string
          impressions: number | null
          likes: number | null
          project_id: string | null
          scheduled_post_id: string | null
          shares: number | null
          synced_at: string | null
        }
        Insert: {
          channel: string
          clicks?: number | null
          comments?: number | null
          created_at?: string | null
          external_post_id: string
          id?: string
          impressions?: number | null
          likes?: number | null
          project_id?: string | null
          scheduled_post_id?: string | null
          shares?: number | null
          synced_at?: string | null
        }
        Update: {
          channel?: string
          clicks?: number | null
          comments?: number | null
          created_at?: string | null
          external_post_id?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          project_id?: string | null
          scheduled_post_id?: string | null
          shares?: number | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_metrics_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brand_font: string | null
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          created_at: string | null
          email_usage_count: number
          email_usage_reset_at: string | null
          full_name: string | null
          generation_count: number | null
          generation_reset_at: string | null
          id: string
          onboarding_completed: boolean | null
          payment_authorization: string | null
          payment_customer_id: string | null
          payment_plan_code: string | null
          payment_provider: string | null
          payment_subscription_id: string | null
          plan: string | null
          referred_at: string | null
          referred_via: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          brand_font?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string | null
          email_usage_count?: number
          email_usage_reset_at?: string | null
          full_name?: string | null
          generation_count?: number | null
          generation_reset_at?: string | null
          id: string
          onboarding_completed?: boolean | null
          payment_authorization?: string | null
          payment_customer_id?: string | null
          payment_plan_code?: string | null
          payment_provider?: string | null
          payment_subscription_id?: string | null
          plan?: string | null
          referred_at?: string | null
          referred_via?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          brand_font?: string | null
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string | null
          email_usage_count?: number
          email_usage_reset_at?: string | null
          full_name?: string | null
          generation_count?: number | null
          generation_reset_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          payment_authorization?: string | null
          payment_customer_id?: string | null
          payment_plan_code?: string | null
          payment_provider?: string | null
          payment_subscription_id?: string | null
          plan?: string | null
          referred_at?: string | null
          referred_via?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_via_fkey"
            columns: ["referred_via"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          audience_pain_point: string | null
          automation_mode: string
          brand_voice: Json | null
          brand_voice_example: string | null
          business_description: string | null
          business_location: string | null
          business_type: string | null
          client_logo_url: string | null
          client_name: string | null
          competitors: Json | null
          created_at: string | null
          description: string | null
          gsc_site_url: string | null
          id: string
          industry: string | null
          keywords: Json | null
          missing_pages_enabled: boolean
          name: string
          onboarding_answers: Json | null
          onboarding_completed: boolean | null
          online_channels: string[] | null
          positioning_statement: string | null
          primary_goal: string | null
          report_accent_color: string | null
          services: string[]
          target_audience: Json | null
          updated_at: string | null
          user_id: string
          value_proposition: string | null
          wants_hosted_page: boolean
          website_url: string | null
        }
        Insert: {
          audience_pain_point?: string | null
          automation_mode?: string
          brand_voice?: Json | null
          brand_voice_example?: string | null
          business_description?: string | null
          business_location?: string | null
          business_type?: string | null
          client_logo_url?: string | null
          client_name?: string | null
          competitors?: Json | null
          created_at?: string | null
          description?: string | null
          gsc_site_url?: string | null
          id?: string
          industry?: string | null
          keywords?: Json | null
          missing_pages_enabled?: boolean
          name: string
          onboarding_answers?: Json | null
          onboarding_completed?: boolean | null
          online_channels?: string[] | null
          positioning_statement?: string | null
          primary_goal?: string | null
          report_accent_color?: string | null
          services?: string[]
          target_audience?: Json | null
          updated_at?: string | null
          user_id: string
          value_proposition?: string | null
          wants_hosted_page?: boolean
          website_url?: string | null
        }
        Update: {
          audience_pain_point?: string | null
          automation_mode?: string
          brand_voice?: Json | null
          brand_voice_example?: string | null
          business_description?: string | null
          business_location?: string | null
          business_type?: string | null
          client_logo_url?: string | null
          client_name?: string | null
          competitors?: Json | null
          created_at?: string | null
          description?: string | null
          gsc_site_url?: string | null
          id?: string
          industry?: string | null
          keywords?: Json | null
          missing_pages_enabled?: boolean
          name?: string
          onboarding_answers?: Json | null
          onboarding_completed?: boolean | null
          online_channels?: string[] | null
          positioning_statement?: string | null
          primary_goal?: string | null
          report_accent_color?: string | null
          services?: string[]
          target_audience?: Json | null
          updated_at?: string | null
          user_id?: string
          value_proposition?: string | null
          wants_hosted_page?: boolean
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_clicks: {
        Row: {
          country: string | null
          id: string
          ip_hash: string | null
          referer: string | null
          referral_link_id: string | null
          user_agent: string | null
          visited_at: string | null
        }
        Insert: {
          country?: string | null
          id?: string
          ip_hash?: string | null
          referer?: string | null
          referral_link_id?: string | null
          user_agent?: string | null
          visited_at?: string | null
        }
        Update: {
          country?: string | null
          id?: string
          ip_hash?: string | null
          referer?: string | null
          referral_link_id?: string | null
          user_agent?: string | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_conversions: {
        Row: {
          current_plan: string | null
          first_paid_at: string | null
          id: string
          referral_link_id: string | null
          signed_up_at: string | null
          user_id: string
        }
        Insert: {
          current_plan?: string | null
          first_paid_at?: string | null
          id?: string
          referral_link_id?: string | null
          signed_up_at?: string | null
          user_id: string
        }
        Update: {
          current_plan?: string | null
          first_paid_at?: string | null
          id?: string
          referral_link_id?: string | null
          signed_up_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_conversions_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_earnings: {
        Row: {
          commission_usd: number
          conversion_id: string | null
          created_at: string | null
          id: string
          paid_out: boolean | null
          payment_amount_usd: number
          payment_reference: string | null
          payment_source: string | null
          payout_id: string | null
          referral_link_id: string | null
          user_id: string | null
        }
        Insert: {
          commission_usd: number
          conversion_id?: string | null
          created_at?: string | null
          id?: string
          paid_out?: boolean | null
          payment_amount_usd: number
          payment_reference?: string | null
          payment_source?: string | null
          payout_id?: string | null
          referral_link_id?: string | null
          user_id?: string | null
        }
        Update: {
          commission_usd?: number
          conversion_id?: string | null
          created_at?: string | null
          id?: string
          paid_out?: boolean | null
          payment_amount_usd?: number
          payment_reference?: string | null
          payment_source?: string | null
          payout_id?: string | null
          referral_link_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "referral_conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "referral_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          active: boolean | null
          code: string
          commission_rate: number | null
          commission_type: string
          created_at: string | null
          created_by: string | null
          flat_amount_usd: number | null
          id: string
          label: string
          notes: string | null
          partner_email: string
          partner_name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          commission_rate?: number | null
          commission_type?: string
          created_at?: string | null
          created_by?: string | null
          flat_amount_usd?: number | null
          id?: string
          label: string
          notes?: string | null
          partner_email: string
          partner_name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          commission_rate?: number | null
          commission_type?: string
          created_at?: string | null
          created_by?: string | null
          flat_amount_usd?: number | null
          id?: string
          label?: string
          notes?: string | null
          partner_email?: string
          partner_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_payouts: {
        Row: {
          amount_usd: number
          created_at: string | null
          created_by: string | null
          id: string
          method: string | null
          notes: string | null
          partner_email: string
          partner_name: string
          reference: string | null
        }
        Insert: {
          amount_usd: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          partner_email: string
          partner_name: string
          reference?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          partner_email?: string
          partner_name?: string
          reference?: string | null
        }
        Relationships: []
      }
      scheduled_executions: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          execution_type: string
          id: string
          idempotency_key: string | null
          last_error: string | null
          max_attempts: number
          parent_id: string | null
          parent_type: string | null
          payload: Json
          ran_at: string | null
          result: Json | null
          scheduled_for: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          execution_type: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          max_attempts?: number
          parent_id?: string | null
          parent_type?: string | null
          payload?: Json
          ran_at?: string | null
          result?: Json | null
          scheduled_for: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          execution_type?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          max_attempts?: number
          parent_id?: string | null
          parent_type?: string | null
          payload?: Json
          ran_at?: string | null
          result?: Json | null
          scheduled_for?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          asset_id: string
          channel: string
          created_at: string | null
          error_message: string | null
          external_post_id: string | null
          id: string
          posted_at: string | null
          project_id: string | null
          scheduled_for: string
          status: string | null
        }
        Insert: {
          asset_id: string
          channel: string
          created_at?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          posted_at?: string | null
          project_id?: string | null
          scheduled_for: string
          status?: string | null
        }
        Update: {
          asset_id?: string
          channel?: string
          created_at?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          posted_at?: string | null
          project_id?: string | null
          scheduled_for?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_connections: {
        Row: {
          base_url: string | null
          created_at: string
          id: string
          kind: string
          project_id: string
          secret_encrypted: string | null
          site_slug: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          id?: string
          kind: string
          project_id: string
          secret_encrypted?: string | null
          site_slug?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          base_url?: string | null
          created_at?: string
          id?: string
          kind?: string
          project_id?: string
          secret_encrypted?: string | null
          site_slug?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          id: string
          invite_email: string | null
          invited_by: string
          role: string | null
          status: string | null
          team_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_email?: string | null
          invited_by: string
          role?: string | null
          status?: string | null
          team_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_email?: string | null
          invited_by?: string
          role?: string | null
          status?: string | null
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_domains: {
        Row: {
          created_at: string
          dns_records: Json
          domain: string
          id: string
          resend_domain_id: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dns_records?: Json
          domain: string
          id?: string
          resend_domain_id: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dns_records?: Json
          domain?: string
          id?: string
          resend_domain_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      video_clips: {
        Row: {
          clip_url: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          project_id: string | null
          provider: string | null
          scene_type: string | null
          user_id: string | null
          visual_description: string | null
        }
        Insert: {
          clip_url: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          project_id?: string | null
          provider?: string | null
          scene_type?: string | null
          user_id?: string | null
          visual_description?: string | null
        }
        Update: {
          clip_url?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          project_id?: string | null
          provider?: string | null
          scene_type?: string | null
          user_id?: string | null
          visual_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_clips_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      video_jobs: {
        Row: {
          avatar_gender: string | null
          avatar_mode: string | null
          brief: string
          completed_at: string | null
          created_at: string | null
          credits_used: number | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          progress_message: string | null
          project_id: string | null
          provider: string | null
          provider_job_id: string | null
          script_data: Json | null
          selected_avatar_id: string | null
          source_asset_id: string | null
          status: string
          style: string
          thumbnail_url: string | null
          user_id: string | null
          video_type: string | null
          video_url: string | null
          voice_id: string | null
        }
        Insert: {
          avatar_gender?: string | null
          avatar_mode?: string | null
          brief: string
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          progress_message?: string | null
          project_id?: string | null
          provider?: string | null
          provider_job_id?: string | null
          script_data?: Json | null
          selected_avatar_id?: string | null
          source_asset_id?: string | null
          status?: string
          style?: string
          thumbnail_url?: string | null
          user_id?: string | null
          video_type?: string | null
          video_url?: string | null
          voice_id?: string | null
        }
        Update: {
          avatar_gender?: string | null
          avatar_mode?: string | null
          brief?: string
          completed_at?: string | null
          created_at?: string | null
          credits_used?: number | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          progress_message?: string | null
          project_id?: string | null
          provider?: string | null
          provider_job_id?: string | null
          script_data?: Json | null
          selected_avatar_id?: string | null
          source_asset_id?: string | null
          status?: string
          style?: string
          thumbnail_url?: string | null
          user_id?: string | null
          video_type?: string | null
          video_url?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          active: boolean | null
          auth_token: string | null
          config: Json | null
          created_at: string | null
          endpoint_url: string
          id: string
          name: string
          project_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          auth_token?: string | null
          config?: Json | null
          created_at?: string | null
          endpoint_url: string
          id?: string
          name: string
          project_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          auth_token?: string | null
          config?: Json | null
          created_at?: string | null
          endpoint_url?: string
          id?: string
          name?: string
          project_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_events: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string
          direction: string
          enrollment_id: string | null
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          phone: string | null
          project_id: string
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          direction: string
          enrollment_id?: string | null
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          phone?: string | null
          project_id: string
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string
          direction?: string
          enrollment_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          phone?: string | null
          project_id?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "audience_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      x_account_metrics_snapshots: {
        Row: {
          created_at: string
          followers_count: number
          following_count: number | null
          id: string
          listed_count: number | null
          platform_user_id: string
          snapshot_date: string
          tweet_count: number | null
        }
        Insert: {
          created_at?: string
          followers_count: number
          following_count?: number | null
          id?: string
          listed_count?: number | null
          platform_user_id: string
          snapshot_date: string
          tweet_count?: number | null
        }
        Update: {
          created_at?: string
          followers_count?: number
          following_count?: number | null
          id?: string
          listed_count?: number | null
          platform_user_id?: string
          snapshot_date?: string
          tweet_count?: number | null
        }
        Relationships: []
      }
      x_playbook_bracket_inputs: {
        Row: {
          created_at: string
          field_name: string
          id: string
          ref: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          ref: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          ref?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_manages_team_ids: { Args: never; Returns: string[] }
      auth_user_team_ids: { Args: never; Returns: string[] }
      increment_email_usage: {
        Args: { by_count: number; user_id_param: string }
        Returns: undefined
      }
      increment_form_submission: {
        Args: { form_id_param: string }
        Returns: undefined
      }
      increment_generation_count: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      is_paid_user: { Args: { uid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
