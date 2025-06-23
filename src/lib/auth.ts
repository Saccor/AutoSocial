import { createBrowserClient } from '@supabase/ssr'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      social_accounts: {
        Row: {
          id: number
          user_id: string
          platform: string
          account_identifier: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          scope: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          platform: string
          account_identifier: string
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          platform?: string
          account_identifier?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Client-side Supabase client
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 