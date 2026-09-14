/**
 * types/supabase.ts
 * Tipo permissivo do banco Supabase.
 * Substitua futuramente pelos tipos gerados via:
 *   npx supabase gen types typescript --project-id <id> > types/supabase.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      [tableName: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
        Relationships: any[]
      }
    }
    Views: {
      [viewName: string]: {
        Row: Record<string, any>
        Relationships: any[]
      }
    }
    Functions: {
      [fnName: string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
    Enums: Record<string, string>
    CompositeTypes: Record<string, any>
  }
}
