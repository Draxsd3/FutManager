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
      clubs: {
        Row: {
          common_name: string
          country_id: string | null
          created_at: string
          founded_year: number | null
          id: string
          legal_name: string
          short_name: string | null
        }
        Insert: {
          common_name: string
          country_id?: string | null
          created_at?: string
          founded_year?: number | null
          id?: string
          legal_name: string
          short_name?: string | null
        }
        Update: {
          common_name?: string
          country_id?: string | null
          created_at?: string
          founded_year?: number | null
          id?: string
          legal_name?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          country_id: string | null
          created_at: string
          id: string
          level: number | null
          name: string
          short_name: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          id?: string
          level?: number | null
          name: string
          short_name?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          id?: string
          level?: number | null
          name?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          club_id: string
          ends_on: string | null
          id: string
          player_id: string
          salary_monthly_brl: number | null
          starts_on: string | null
        }
        Insert: {
          club_id: string
          ends_on?: string | null
          id?: string
          player_id: string
          salary_monthly_brl?: number | null
          starts_on?: string | null
        }
        Update: {
          club_id?: string
          ends_on?: string | null
          id?: string
          player_id?: string
          salary_monthly_brl?: number | null
          starts_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          base_url: string | null
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          base_url?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          base_url?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      external_entities: {
        Row: {
          confidence: number
          entity_id: string
          entity_type: string
          external_id: string
          id: string
          last_confirmed_at: string | null
          source_id: string
          source_url: string | null
        }
        Insert: {
          confidence?: number
          entity_id: string
          entity_type: string
          external_id: string
          id?: string
          last_confirmed_at?: string | null
          source_id: string
          source_url?: string | null
        }
        Update: {
          confidence?: number
          entity_id?: string
          entity_type?: string
          external_id?: string
          id?: string
          last_confirmed_at?: string | null
          source_id?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_entities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          created_at: string
          details: Json
          id: string
          import_run_id: string
          message: string
          snapshot_id: string | null
          stage: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          import_run_id: string
          message: string
          snapshot_id?: string | null
          stage: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          import_run_id?: string
          message?: string
          snapshot_id?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_errors_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "source_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          collector_version: string
          completed_at: string | null
          id: string
          source_id: string
          started_at: string
          status: string
          summary: Json
        }
        Insert: {
          collector_version: string
          completed_at?: string | null
          id?: string
          source_id: string
          started_at?: string
          status: string
          summary?: Json
        }
        Update: {
          collector_version?: string
          completed_at?: string | null
          id?: string
          source_id?: string
          started_at?: string
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_overrides: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          field_name: string
          id: string
          reason: string
          value: Json
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          field_name: string
          id?: string
          reason: string
          value: Json
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          field_name?: string
          id?: string
          reason?: string
          value?: Json
        }
        Relationships: []
      }
      player_positions: {
        Row: {
          is_primary: boolean
          player_id: string
          position_code: string
        }
        Insert: {
          is_primary?: boolean
          player_id: string
          position_code: string
        }
        Update: {
          is_primary?: boolean
          player_id?: string
          position_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_positions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_positions_position_code_fkey"
            columns: ["position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["code"]
          },
        ]
      }
      players: {
        Row: {
          birth_date: string | null
          created_at: string
          full_name: string
          height_cm: number | null
          id: string
          known_as: string | null
          nationality_country_id: string | null
          preferred_foot: string | null
          weight_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          full_name: string
          height_cm?: number | null
          id?: string
          known_as?: string | null
          nationality_country_id?: string | null
          preferred_foot?: string | null
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          full_name?: string
          height_cm?: number | null
          id?: string
          known_as?: string | null
          nationality_country_id?: string | null
          preferred_foot?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_nationality_country_id_fkey"
            columns: ["nationality_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          category: string
          code: string
          name: string
        }
        Insert: {
          category: string
          code: string
          name: string
        }
        Update: {
          category?: string
          code?: string
          name?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          label: string
          starts_on: string | null
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          label: string
          starts_on?: string | null
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          label?: string
          starts_on?: string | null
        }
        Relationships: []
      }
      source_snapshots: {
        Row: {
          collected_at: string
          content_hash: string
          id: string
          import_run_id: string
          raw_data: Json
          source_url: string
        }
        Insert: {
          collected_at?: string
          content_hash: string
          id?: string
          import_run_id: string
          raw_data: Json
          source_url: string
        }
        Update: {
          collected_at?: string
          content_hash?: string
          id?: string
          import_run_id?: string
          raw_data?: Json
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_snapshots_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          club_id: string
          id: string
          joined_on: string | null
          left_on: string | null
          player_id: string
          season_id: string
          shirt_number: number | null
        }
        Insert: {
          club_id: string
          id?: string
          joined_on?: string | null
          left_on?: string | null
          player_id: string
          season_id: string
          shirt_number?: number | null
        }
        Update: {
          club_id?: string
          id?: string
          joined_on?: string | null
          left_on?: string | null
          player_id?: string
          season_id?: string
          shirt_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "squads_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
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

