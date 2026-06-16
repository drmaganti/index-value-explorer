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
  public: {
    Tables: {
      bootstrap_ticker_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          index_symbols: string[]
          last_error: string | null
          next_retry_at: string | null
          status: string
          ticker: string
          trade_date: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          index_symbols?: string[]
          last_error?: string | null
          next_retry_at?: string | null
          status?: string
          ticker: string
          trade_date?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          index_symbols?: string[]
          last_error?: string | null
          next_retry_at?: string | null
          status?: string
          ticker?: string
          trade_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      index_constituents: {
        Row: {
          as_of_date: string
          company_name: string | null
          created_at: string
          id: string
          index_symbol: string
          is_active: boolean
          provider: string | null
          sector: string | null
          ticker: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          as_of_date: string
          company_name?: string | null
          created_at?: string
          id?: string
          index_symbol: string
          is_active?: boolean
          provider?: string | null
          sector?: string | null
          ticker: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          as_of_date?: string
          company_name?: string | null
          created_at?: string
          id?: string
          index_symbol?: string
          is_active?: boolean
          provider?: string | null
          sector?: string | null
          ticker?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      refresh_job_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_name: string
          metadata_json: Json | null
          records_failed: number | null
          records_processed: number | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_name: string
          metadata_json?: Json | null
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string
          status: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_name?: string
          metadata_json?: Json | null
          records_failed?: number | null
          records_processed?: number | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_daily_snapshots: {
        Row: {
          beta: number | null
          close_price: number | null
          created_at: string
          data_completeness_pct: number | null
          debt_to_equity: number | null
          earnings_growth: number | null
          ev_to_ebitda: number | null
          fifty_two_week_high: number | null
          fifty_two_week_low: number | null
          forward_pe: number | null
          free_cash_flow_b: number | null
          gross_margin: number | null
          id: string
          industry: string | null
          market_cap_b: number | null
          missing_data_count: number | null
          operating_margin: number | null
          previous_close: number | null
          price_to_book: number | null
          provider_primary: string | null
          provider_secondary: string | null
          return_on_equity: number | null
          revenue_growth: number | null
          sector: string | null
          ticker: string
          trade_date: string
          trailing_pe: number | null
          two_hundred_day_moving_average: number | null
          updated_at: string
        }
        Insert: {
          beta?: number | null
          close_price?: number | null
          created_at?: string
          data_completeness_pct?: number | null
          debt_to_equity?: number | null
          earnings_growth?: number | null
          ev_to_ebitda?: number | null
          fifty_two_week_high?: number | null
          fifty_two_week_low?: number | null
          forward_pe?: number | null
          free_cash_flow_b?: number | null
          gross_margin?: number | null
          id?: string
          industry?: string | null
          market_cap_b?: number | null
          missing_data_count?: number | null
          operating_margin?: number | null
          previous_close?: number | null
          price_to_book?: number | null
          provider_primary?: string | null
          provider_secondary?: string | null
          return_on_equity?: number | null
          revenue_growth?: number | null
          sector?: string | null
          ticker: string
          trade_date: string
          trailing_pe?: number | null
          two_hundred_day_moving_average?: number | null
          updated_at?: string
        }
        Update: {
          beta?: number | null
          close_price?: number | null
          created_at?: string
          data_completeness_pct?: number | null
          debt_to_equity?: number | null
          earnings_growth?: number | null
          ev_to_ebitda?: number | null
          fifty_two_week_high?: number | null
          fifty_two_week_low?: number | null
          forward_pe?: number | null
          free_cash_flow_b?: number | null
          gross_margin?: number | null
          id?: string
          industry?: string | null
          market_cap_b?: number | null
          missing_data_count?: number | null
          operating_margin?: number | null
          previous_close?: number | null
          price_to_book?: number | null
          provider_primary?: string | null
          provider_secondary?: string | null
          return_on_equity?: number | null
          revenue_growth?: number | null
          sector?: string | null
          ticker?: string
          trade_date?: string
          trailing_pe?: number | null
          two_hundred_day_moving_average?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
