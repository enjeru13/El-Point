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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          detail: Json
          id: string
          restaurant_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          restaurant_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      amenities: {
        Row: {
          icon: string
          id: number
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon: string
          id: number
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string
          id?: number
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: boolean
          owner_posts_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: boolean
          owner_posts_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: boolean
          owner_posts_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          icon: string
          id: number
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon: string
          id: number
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string
          id?: number
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      community_xp_log: {
        Row: {
          actor_id: string | null
          amount: number
          created_at: string
          day: string
          id: number
          post_id: string | null
          reason: string
          reverted: boolean
          source_key: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          amount: number
          created_at?: string
          day: string
          id?: never
          post_id?: string | null
          reason: string
          reverted?: boolean
          source_key: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          amount?: number
          created_at?: string
          day?: string
          id?: never
          post_id?: string | null
          reason?: string
          reverted?: boolean
          source_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_xp_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_accounts: {
        Row: {
          deleted_at: string
          id: string
          owned_restaurants: number
          reviews_count: number
          role: string | null
          signed_up_at: string | null
          strikes: number
          user_id: string
          username: string | null
          was_banned: boolean
        }
        Insert: {
          deleted_at?: string
          id?: string
          owned_restaurants?: number
          reviews_count?: number
          role?: string | null
          signed_up_at?: string | null
          strikes?: number
          user_id: string
          username?: string | null
          was_banned?: boolean
        }
        Update: {
          deleted_at?: string
          id?: string
          owned_restaurants?: number
          reviews_count?: number
          role?: string | null
          signed_up_at?: string | null
          strikes?: number
          user_id?: string
          username?: string | null
          was_banned?: boolean
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_suggestions: {
        Row: {
          normalized_name: string
          restaurant_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          normalized_name: string
          restaurant_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          normalized_name?: string
          restaurant_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_suggestions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          created_at: string
          description: string | null
          id: string
          is_daily_special: boolean
          name: string
          position: number
          price: number
          restaurant_id: string
          section: string
          special_date: string | null
          special_keep: boolean
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_daily_special?: boolean
          name: string
          position?: number
          price: number
          restaurant_id: string
          section?: string
          special_date?: string | null
          special_keep?: boolean
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_daily_special?: boolean
          name?: string
          position?: number
          price?: number
          restaurant_id?: string
          section?: string
          special_date?: string | null
          special_keep?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read: boolean
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          icon: string
          id: number
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon: string
          id: number
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string
          id?: number
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      plan_adjustments: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          new_boost_until: string | null
          new_paid_until: string | null
          old_boost_until: string | null
          old_paid_until: string | null
          reason: string | null
          restaurant_id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          new_boost_until?: string | null
          new_paid_until?: string | null
          old_boost_until?: string | null
          old_paid_until?: string | null
          reason?: string | null
          restaurant_id: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          new_boost_until?: string | null
          new_paid_until?: string | null
          old_boost_until?: string | null
          old_paid_until?: string | null
          reason?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_adjustments_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_adjustments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      post_categories: {
        Row: {
          category_id: number
          post_id: string
        }
        Insert: {
          category_id: number
          post_id: string
        }
        Update: {
          category_id?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_photos: {
        Row: {
          position: number
          post_id: string
          storage_path: string
        }
        Insert: {
          position: number
          post_id: string
          storage_path: string
        }
        Update: {
          position?: number
          post_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_photos_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_replies: {
        Row: {
          as_restaurant_id: string | null
          author_id: string
          body: string
          created_at: string
          id: string
          moderated_at: string | null
          moderation: string
          post_id: string
          restaurant_id: string | null
        }
        Insert: {
          as_restaurant_id?: string | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderation?: string
          post_id: string
          restaurant_id?: string | null
        }
        Update: {
          as_restaurant_id?: string | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderation?: string
          post_id?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_replies_as_restaurant_id_fkey"
            columns: ["as_restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_replies_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          post_id: string | null
          reason: string
          reply_id: string | null
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string | null
          reason: string
          reply_id?: string | null
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string | null
          reason?: string
          reply_id?: string | null
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "post_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          as_restaurant_id: string | null
          author_id: string
          body: string
          client_id: string
          created_at: string
          id: string
          like_count: number
          moderated_at: string | null
          moderation: string
          reply_count: number
          restaurant_id: string | null
          suggested_key: string | null
          suggested_name: string | null
          suggested_zone: string | null
          topic: string
        }
        Insert: {
          as_restaurant_id?: string | null
          author_id: string
          body: string
          client_id: string
          created_at?: string
          id?: string
          like_count?: number
          moderated_at?: string | null
          moderation?: string
          reply_count?: number
          restaurant_id?: string | null
          suggested_key?: string | null
          suggested_name?: string | null
          suggested_zone?: string | null
          topic: string
        }
        Update: {
          as_restaurant_id?: string | null
          author_id?: string
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          like_count?: number
          moderated_at?: string | null
          moderation?: string
          reply_count?: number
          restaurant_id?: string | null
          suggested_key?: string | null
          suggested_name?: string | null
          suggested_zone?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_as_restaurant_id_fkey"
            columns: ["as_restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          bio: string | null
          created_at: string
          favorite_categories: number[]
          full_name: string | null
          id: string
          is_admin: boolean
          level: number
          push_token: string | null
          referral_code: string | null
          referral_reward_claimed: boolean
          referred_by: string | null
          role: string
          search_radius_km: number
          settings: Json
          streak_best: number
          streak_week_start: string | null
          streak_weeks: number
          strikes: number
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          favorite_categories?: number[]
          full_name?: string | null
          id: string
          is_admin?: boolean
          level?: number
          push_token?: string | null
          referral_code?: string | null
          referral_reward_claimed?: boolean
          referred_by?: string | null
          role?: string
          search_radius_km?: number
          settings?: Json
          streak_best?: number
          streak_week_start?: string | null
          streak_weeks?: number
          strikes?: number
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          favorite_categories?: number[]
          full_name?: string | null
          id?: string
          is_admin?: boolean
          level?: number
          push_token?: string | null
          referral_code?: string | null
          referral_reward_claimed?: boolean
          referred_by?: string | null
          role?: string
          search_radius_km?: number
          settings?: Json
          streak_best?: number
          streak_week_start?: string | null
          streak_weeks?: number
          strikes?: number
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_amenities: {
        Row: {
          amenity_id: number
          restaurant_id: string
        }
        Insert: {
          amenity_id: number
          restaurant_id: string
        }
        Update: {
          amenity_id?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_amenities_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_categories: {
        Row: {
          category_id: number
          restaurant_id: string
        }
        Insert: {
          category_id: number
          restaurant_id: string
        }
        Update: {
          category_id?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_events: {
        Row: {
          created_at: string
          event_type: string
          hour_bucket: string
          id: number
          restaurant_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          hour_bucket?: string
          id?: never
          restaurant_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          hour_bucket?: string
          id?: never
          restaurant_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_events_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_payment_methods: {
        Row: {
          payment_method_id: number
          restaurant_id: string
        }
        Insert: {
          payment_method_id: number
          restaurant_id: string
        }
        Update: {
          payment_method_id?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payment_methods_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_payment_methods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_payments: {
        Row: {
          amount: number | null
          id: string
          method: string
          note: string | null
          owner_id: string
          plan: string | null
          proof_path: string | null
          reference: string
          restaurant_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount?: number | null
          id?: string
          method: string
          note?: string | null
          owner_id: string
          plan?: string | null
          proof_path?: string | null
          reference: string
          restaurant_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number | null
          id?: string
          method?: string
          note?: string | null
          owner_id?: string
          plan?: string | null
          proof_path?: string | null
          reference?: string
          restaurant_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_photos: {
        Row: {
          created_at: string
          id: string
          position: number
          restaurant_id: string
          storage_path: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          restaurant_id: string
          storage_path: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          restaurant_id?: string
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_photos_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: string
          reporter_id: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reporter_id: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reporter_id?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_reports_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accepts_orders: boolean
          address: string | null
          boost_profile_awarded: boolean
          boost_until: string | null
          closed_today_date: string | null
          community_banned_at: string | null
          community_removals: number
          cover_url: string | null
          created_at: string
          description: string | null
          founder_rank: number | null
          ghost_kitchen: boolean
          host_streak_weeks: number
          hours: Json | null
          id: string
          instagram: string | null
          is_active: boolean
          latitude: number | null
          location: unknown
          logo_url: string | null
          longitude: number | null
          menu_base_currency: string
          menu_bs_rate: number | null
          menu_cop_rate: number | null
          menu_currencies: string[]
          menu_pdf_url: string | null
          name: string
          order_greeting: string | null
          owner_id: string | null
          paid_until: string | null
          phone: string | null
          plan_kind: string | null
          plan_period_start: string | null
          price_level: number | null
          promo_ends_at: string | null
          promo_text: string | null
          rating_avg: number
          rating_count: number
          reviewed_at: string | null
          rif: string | null
          status: string
          status_reason: string | null
          submitted_at: string
          updated_at: string
          verification_photo_path: string | null
          whatsapp: string | null
          zone_label: string | null
        }
        Insert: {
          accepts_orders?: boolean
          address?: string | null
          boost_profile_awarded?: boolean
          boost_until?: string | null
          closed_today_date?: string | null
          community_banned_at?: string | null
          community_removals?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          founder_rank?: number | null
          ghost_kitchen?: boolean
          host_streak_weeks?: number
          hours?: Json | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          latitude?: number | null
          location?: unknown
          logo_url?: string | null
          longitude?: number | null
          menu_base_currency?: string
          menu_bs_rate?: number | null
          menu_cop_rate?: number | null
          menu_currencies?: string[]
          menu_pdf_url?: string | null
          name: string
          order_greeting?: string | null
          owner_id?: string | null
          paid_until?: string | null
          phone?: string | null
          plan_kind?: string | null
          plan_period_start?: string | null
          price_level?: number | null
          promo_ends_at?: string | null
          promo_text?: string | null
          rating_avg?: number
          rating_count?: number
          reviewed_at?: string | null
          rif?: string | null
          status?: string
          status_reason?: string | null
          submitted_at?: string
          updated_at?: string
          verification_photo_path?: string | null
          whatsapp?: string | null
          zone_label?: string | null
        }
        Update: {
          accepts_orders?: boolean
          address?: string | null
          boost_profile_awarded?: boolean
          boost_until?: string | null
          closed_today_date?: string | null
          community_banned_at?: string | null
          community_removals?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          founder_rank?: number | null
          ghost_kitchen?: boolean
          host_streak_weeks?: number
          hours?: Json | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          latitude?: number | null
          location?: unknown
          logo_url?: string | null
          longitude?: number | null
          menu_base_currency?: string
          menu_bs_rate?: number | null
          menu_cop_rate?: number | null
          menu_currencies?: string[]
          menu_pdf_url?: string | null
          name?: string
          order_greeting?: string | null
          owner_id?: string | null
          paid_until?: string | null
          phone?: string | null
          plan_kind?: string | null
          plan_period_start?: string | null
          price_level?: number | null
          promo_ends_at?: string | null
          promo_text?: string | null
          rating_avg?: number
          rating_count?: number
          reviewed_at?: string | null
          rif?: string | null
          status?: string
          status_reason?: string | null
          submitted_at?: string
          updated_at?: string
          verification_photo_path?: string | null
          whatsapp?: string | null
          zone_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful: {
        Row: {
          created_at: string
          review_author_id: string | null
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          review_author_id?: string | null
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          review_author_id?: string | null
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_review_author_id_fkey"
            columns: ["review_author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_helpful_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_photos: {
        Row: {
          created_at: string
          id: string
          position: number
          review_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          review_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          review_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photos_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          review_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          review_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reason: string
          reporter_id: string
          review_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reporter_id: string
          review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reason?: string
          reporter_id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          body: string
          created_at: string
          helpful_count: number
          id: string
          moderated_at: string | null
          moderation: string
          rating: number
          restaurant_id: string
          updated_at: string
          xp_reverted: boolean
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          helpful_count?: number
          id?: string
          moderated_at?: string | null
          moderation?: string
          rating: number
          restaurant_id: string
          updated_at?: string
          xp_reverted?: boolean
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          helpful_count?: number
          id?: string
          moderated_at?: string | null
          moderation?: string
          rating?: number
          restaurant_id?: string
          updated_at?: string
          xp_reverted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
      support_messages: {
        Row: {
          body: string
          created_at: string
          email: string | null
          id: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          email?: string | null
          id?: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          email?: string | null
          id?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_missions: {
        Row: {
          earned_at: string
          mission: string
          user_id: string
        }
        Insert: {
          earned_at?: string
          mission: string
          user_id: string
        }
        Update: {
          earned_at?: string
          mission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_deleted_accounts: {
        Args: { p_limit?: number }
        Returns: {
          deleted_at: string
          id: string
          last_30_days: number
          last_7_days: number
          owned_restaurants: number
          reviews_count: number
          role: string
          signed_up_at: string
          strikes: number
          total_count: number
          username: string
          was_banned: boolean
        }[]
      }
      admin_growth_stats: {
        Args: { p_weeks?: number }
        Returns: {
          new_restaurants: number
          new_reviews: number
          new_users: number
          week_start: string
        }[]
      }
      admin_local_suggestions: {
        Args: never
        Returns: {
          display_name: string
          last_post_at: string
          last_zone: string
          normalized_name: string
          post_count: number
          restaurant_id: string
          restaurant_name: string
          status: string
          updated_at: string
        }[]
      }
      admin_most_blocked: {
        Args: { p_limit?: number }
        Returns: {
          banned_at: string
          blocked_by_count: number
          full_name: string
          last_blocked_at: string
          strikes: number
          user_id: string
          username: string
        }[]
      }
      admin_recent_blocks: {
        Args: { p_limit?: number }
        Returns: {
          blocked_id: string
          blocked_username: string
          blocker_id: string
          blocker_username: string
          created_at: string
        }[]
      }
      admin_register_payment: {
        Args: {
          p_amount?: number
          p_method: string
          p_note?: string
          p_plan: string
          p_reference: string
          p_restaurant_id: string
        }
        Returns: string
      }
      admin_resolve_payment: {
        Args: { p_action: string; p_note?: string; p_payment_id: string }
        Returns: undefined
      }
      admin_restaurant_private: {
        Args: { p_ids: string[] }
        Returns: {
          instagram: string
          menu_pdf_url: string
          phone: string
          restaurant_id: string
          rif: string
          verification_photo_path: string
          whatsapp: string
        }[]
      }
      admin_restore_community: {
        Args: { p_restaurant: string }
        Returns: undefined
      }
      admin_set_plan: {
        Args: {
          p_action: string
          p_date?: string
          p_days?: number
          p_reason?: string
          p_restaurant_id: string
        }
        Returns: string
      }
      admin_set_restaurant_boost: {
        Args: { p_days: number; p_restaurant_id: string }
        Returns: string
      }
      admin_set_restaurant_status: {
        Args: { p_action: string; p_reason?: string; p_restaurant_id: string }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: { p_action: string; p_note?: string; p_user_id: string }
        Returns: undefined
      }
      admin_user_directory: {
        Args: {
          p_filter?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          banned_at: string
          blocked_by_count: number
          created_at: string
          email: string
          full_name: string
          id: string
          level: number
          restaurants_count: number
          reviews_count: number
          role: string
          strikes: number
          total_count: number
          username: string
          xp: number
        }[]
      }
      admin_void_payment: {
        Args: { p_payment_id: string; p_reason?: string }
        Returns: string
      }
      apply_payment_plan: {
        Args: { p_plan: string; p_restaurant_id: string }
        Returns: string
      }
      assert_can_act_as_restaurant: {
        Args: { p_restaurant: string; p_user: string }
        Returns: undefined
      }
      award_community_xp: {
        Args: {
          p_actor: string
          p_amount: number
          p_post: string
          p_reason: string
          p_source_key: string
          p_user: string
        }
        Returns: number
      }
      award_xp: {
        Args: { p_amount: number; p_user: string }
        Returns: undefined
      }
      clear_expired_promos: { Args: never; Returns: undefined }
      community_feed: {
        Args: {
          p_before_at?: string
          p_before_id?: string
          p_category?: number
          p_limit?: number
          p_post?: string
          p_query?: string
          p_restaurant?: string
          p_topic?: string
        }
        Returns: {
          as_restaurant_id: string
          as_restaurant_logo: string
          as_restaurant_name: string
          author_avatar: string
          author_id: string
          author_level: number
          author_name: string
          body: string
          category_ids: number[]
          created_at: string
          id: string
          kind: string
          like_count: number
          photo_paths: string[]
          rating: number
          reply_count: number
          restaurant_category: string
          restaurant_id: string
          restaurant_name: string
          restaurant_zone: string
          suggested_name: string
          suggested_zone: string
          topic: string
          viewer_liked: boolean
        }[]
      }
      community_snippet: { Args: { p_text: string }; Returns: string }
      community_strike: {
        Args: { p_as_restaurant: string; p_author: string }
        Returns: undefined
      }
      community_taggable_restaurant: {
        Args: { p_restaurant: string }
        Returns: boolean
      }
      community_today: { Args: never; Returns: string }
      create_owner_restaurant:
        | {
            Args: {
              p_address: string
              p_amenity_ids?: number[]
              p_category_ids: number[]
              p_description: string
              p_instagram: string
              p_lat: number
              p_lng: number
              p_name: string
              p_rif?: string
              p_verification_photo_path?: string
              p_whatsapp: string
            }
            Returns: string
          }
        | {
            Args: {
              p_address: string
              p_amenity_ids?: number[]
              p_category_ids: number[]
              p_description: string
              p_ghost_kitchen?: boolean
              p_instagram: string
              p_lat: number
              p_lng: number
              p_name: string
              p_rif?: string
              p_verification_photo_path?: string
              p_whatsapp: string
              p_zone_label?: string
            }
            Returns: string
          }
      create_post: {
        Args: {
          p_as_restaurant_id?: string
          p_body: string
          p_category_ids?: number[]
          p_client_id: string
          p_restaurant_id?: string
          p_suggested_name?: string
          p_suggested_zone?: string
          p_topic: string
        }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      evaluate_host_streaks: { Args: never; Returns: undefined }
      evaluate_post_moderation: {
        Args: { p_post: string; p_reply: string }
        Returns: undefined
      }
      evaluate_restaurant_reports: {
        Args: { target: string }
        Returns: undefined
      }
      evaluate_review_moderation: {
        Args: { target: string }
        Returns: undefined
      }
      evaluate_review_streaks: { Args: never; Returns: undefined }
      evaluate_user_missions: { Args: { p_user: string }; Returns: undefined }
      extend_boost: {
        Args: { p_days: number; p_restaurant_id: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_category_benchmark: {
        Args: { p_days?: number; p_restaurant_id: string }
        Returns: {
          median_contacts: number
          median_views: number
          my_contacts: number
          my_views: number
          pct_below_views: number
          peer_count: number
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          banned_at: string | null
          bio: string | null
          created_at: string
          favorite_categories: number[]
          full_name: string | null
          id: string
          is_admin: boolean
          level: number
          push_token: string | null
          referral_code: string | null
          referral_reward_claimed: boolean
          referred_by: string | null
          role: string
          search_radius_km: number
          settings: Json
          streak_best: number
          streak_week_start: string | null
          streak_weeks: number
          strikes: number
          updated_at: string
          username: string | null
          xp: number
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_restaurant_private: {
        Args: never
        Returns: {
          instagram: string
          menu_pdf_url: string
          phone: string
          restaurant_id: string
          rif: string
          verification_photo_path: string
          whatsapp: string
        }[]
      }
      get_restaurant_contact: {
        Args: { p_restaurant_id: string }
        Returns: {
          has_plan: boolean
          instagram: string
          menu_pdf_url: string
          phone: string
          whatsapp: string
        }[]
      }
      get_restaurant_stats: {
        Args: { p_days?: number; p_restaurant_id: string }
        Returns: {
          day: string
          event_type: string
          total: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      grant_mission: {
        Args: { p_mission: string; p_user: string }
        Returns: undefined
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_not_banned: { Args: never; Returns: boolean }
      is_trusted_writer: { Args: never; Returns: boolean }
      level_for_xp: { Args: { p_xp: number }; Returns: number }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mission_title: { Args: { p_mission: string }; Returns: string }
      mission_xp: { Args: { p_mission: string }; Returns: number }
      my_referral_count: { Args: never; Returns: number }
      nearby_restaurants: {
        Args: {
          filter_category?: string
          radius_km?: number
          user_lat: number
          user_lng: number
        }
        Returns: {
          address: string
          boost_until: string
          cover_url: string
          distance_m: number
          founder_rank: number
          has_plan: boolean
          id: string
          lat: number
          lng: number
          logo_url: string
          name: string
          price_level: number
          rating_avg: number
          rating_count: number
        }[]
      }
      normalize_place_name: { Args: { p_name: string }; Returns: string }
      owns_post_path: { Args: { object_name: string }; Returns: boolean }
      owns_restaurant_path: { Args: { object_name: string }; Returns: boolean }
      owns_review_path: { Args: { object_name: string }; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      push_setting_key: { Args: { p_type: string }; Returns: string }
      rank_for_level: { Args: { p_level: number }; Returns: string }
      restaurant_has_plan: { Args: { p_id: string }; Returns: boolean }
      restaurant_profile_complete: { Args: { p_id: string }; Returns: boolean }
      resubmit_restaurant: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      revert_community_xp: {
        Args: { p_source_key: string }
        Returns: undefined
      }
      revert_community_xp_for_post: {
        Args: { p_post: string; p_user: string }
        Returns: undefined
      }
      send_subscription_reminders: { Args: never; Returns: undefined }
      send_weekly_owner_reports: { Args: never; Returns: undefined }
      set_local_suggestion_status: {
        Args: { p_name: string; p_restaurant?: string; p_status: string }
        Returns: undefined
      }
      set_restaurant_amenities: {
        Args: { p_amenity_ids: number[]; p_restaurant_id: string }
        Returns: undefined
      }
      set_restaurant_categories: {
        Args: { p_category_ids: number[]; p_restaurant_id: string }
        Returns: undefined
      }
      set_restaurant_payment_methods: {
        Args: { p_method_ids: number[]; p_restaurant_id: string }
        Returns: undefined
      }
      set_restaurant_zone_location: {
        Args: { p_lat: number; p_lng: number; p_restaurant_id: string }
        Returns: undefined
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      track_restaurant_event: {
        Args: { p_restaurant_id: string; p_type: string }
        Returns: undefined
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      xp_for_level: { Args: { p_level: number }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
