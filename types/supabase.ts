/**
 * types/supabase.ts
 * Tipos do banco de dados Supabase para uso com createClient<Database>().
 * Em produção, gere automaticamente: npx supabase gen types typescript --linked > types/supabase.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id:          string
          name:        string
          slug:        string
          logo_url:    string | null
          plan:        string
          plan_status: 'trial' | 'active' | 'expired' | 'suspended'
          trial_ends:  string | null
          owner_id:    string
          created_at:  string
          updated_at:  string
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      profiles: {
        Row: {
          id:         string   // mesmo que auth.users.id
          tenant_id:  string
          name:       string
          email:      string
          role:       'user' | 'admin' | 'superadmin'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      professionals: {
        Row: {
          id:         string
          tenant_id:  string
          name:       string
          email:      string | null
          phone:      string | null
          avatar_url: string | null
          bio:        string | null
          is_active:  boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['professionals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['professionals']['Insert']>
      }
      services: {
        Row: {
          id:              string
          tenant_id:       string
          name:            string
          description:     string | null
          duration_minutes: number
          price:           number
          is_active:       boolean
          created_at:      string
          updated_at:      string
        }
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['services']['Insert']>
      }
      clients: {
        Row: {
          id:         string
          tenant_id:  string
          name:       string
          email:      string | null
          phone:      string | null
          notes:      string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      bookings: {
        Row: {
          id:              string
          tenant_id:       string
          client_id:       string | null
          professional_id: string | null
          service_id:      string | null
          client_name:     string
          client_phone:    string | null
          client_email:    string | null
          start_at:        string
          end_at:          string
          status:          'pending' | 'confirmed' | 'cancelled'
          notes:           string | null
          created_at:      string
          updated_at:      string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      subscriptions: {
        Row: {
          id:               string
          tenant_id:        string
          plan:             'essencial' | 'cresce' | 'expande' | 'enterprise'
          status:           'trial' | 'active' | 'expired' | 'suspended'
          billing_cycle:    'monthly' | 'quarterly' | 'semiannual' | 'annual'
          current_period_start: string
          current_period_end:   string
          trial_ends:       string | null
          stripe_sub_id:    string | null
          created_at:       string
          updated_at:       string
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
      }
      billing_events: {
        Row: {
          id:          string
          tenant_id:   string
          event_type:  string
          plan_from:   string | null
          plan_to:     string | null
          amount:      number | null
          metadata:    Json | null
          created_at:  string
        }
        Insert: Omit<Database['public']['Tables']['billing_events']['Row'], 'id' | 'created_at'>
        Update: never
      }
      push_subscriptions: {
        Row: {
          id:           string
          tenant_id:    string
          user_id:      string
          endpoint:     string
          p256dh:       string
          auth:         string
          device_label: string | null
          created_at:   string
        }
        Insert: Omit<Database['public']['Tables']['push_subscriptions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
      }
      email_templates: {
        Row: {
          id:         string
          name:       string
          subject:    string
          body_html:  string
          variables:  string[]
          is_active:  boolean
          is_system:  boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['email_templates']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['email_templates']['Insert']>
      }
    }
    Views:    {}
    Functions: {}
    Enums: {
      booking_status: 'pending' | 'confirmed' | 'cancelled'
      plan_status:    'trial' | 'active' | 'expired' | 'suspended'
      user_role:      'user' | 'admin' | 'superadmin'
    }
  }
}
