import { createClient } from "@supabase/supabase-js";
import type { ManualPosition, PlayerCareerRecord } from "@/lib/game/career";

type ClubRow = {
  id: string; owner_id: string; name: string; short_name: string; division: string; state: string | null;
  founded_year: number | null; primary_color: string; secondary_color: string;
  stadium_name: string; stadium_capacity: number; created_at: string; updated_at: string;
  country: string; level: number; coach_name: string; kit_style: string;
};

type PlayerRow = {
  id: string; owner_id: string; club_id: string; name: string; shirt_number: number;
  primary_position: string; secondary_position: string | null; overall: number; age: number;
  preferred_foot: string; created_at: string; updated_at: string;
  star_rating: number; quality_primary: string; quality_secondary: string;
  energy: number; salary_monthly_brl: number; market_value_brl: number;
  goals: number; assists: number; own_goals: number; average_rating: number | null;
  contract_ends_on: string;
  market_status: "normal" | "sale" | "loan";
};

export type CareerPlayerRow = {
  id: string; owner_id: string; save_id: string; source_player_id: string | null;
  name: string; position_code: string; preferred_foot: string; overall: number;
  secondary_position_code: string | null;
  energy: number; salary_monthly_brl: number; market_value_brl: number;
  goals: number; assists: number; own_goals: number; average_rating: number | null;
  traits: string; age: number; contract_ends_on: string;
  market_status: "normal" | "sale" | "loan" | "retiring";
  retirement_year: number | null; is_starter: boolean; lineup_order: number | null;
  pitch_left: number | null; pitch_top: number | null; created_at: string; updated_at: string;
};

export type CareerSeasonRow = {
  id: string; owner_id: string; career_player_id: string; season: number; club_name: string;
  games: number; goals: number; assists: number; average_rating: number | null;
};

type SaveRow = {
  id: string; owner_id: string; name: string; manager_name: string; club_name: string | null;
  division: string | null; round: number; budget_brl: number; in_game_date: string;
  state: {
    clubId?: string;
    progress?: import("@/lib/game/progress").CareerProgress;
    playerCareers?: Record<number, PlayerCareerRecord>;
    manualPositions?: Record<number, ManualPosition>;
  }; created_at: string; updated_at: string;
};

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type FutManagerDatabase = {
  public: {
    Tables: {
      editor_clubs: TableDefinition<ClubRow, Partial<ClubRow> & Pick<ClubRow, "name" | "short_name" | "division">>;
      editor_players: TableDefinition<PlayerRow, Partial<PlayerRow> & Pick<PlayerRow, "club_id" | "name" | "shirt_number" | "primary_position">>;
      game_saves: TableDefinition<SaveRow, Partial<SaveRow> & Pick<SaveRow, "name" | "manager_name" | "in_game_date">>;
      career_players: TableDefinition<CareerPlayerRow, Partial<CareerPlayerRow> & Pick<CareerPlayerRow, "save_id" | "name" | "position_code" | "preferred_foot" | "overall" | "age" | "contract_ends_on">>;
      career_player_seasons: TableDefinition<CareerSeasonRow, Partial<CareerSeasonRow> & Pick<CareerSeasonRow, "career_player_id" | "season" | "club_name">>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let browserClient: ReturnType<typeof createClient<FutManagerDatabase>> | null = null;

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Defina as variáveis públicas do Supabase.");
  if (!browserClient) browserClient = createClient<FutManagerDatabase>(url, key);
  return browserClient;
}
