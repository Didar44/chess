import { getSupabaseBrowserClient, toPersistedGame } from "@/features/auth/lib/supabase";
import type { PersistedGame } from "@/features/auth/model/types";
import type { GameResult } from "@/entities/game/model/types";

type DatabaseGameRow = {
  created_at: string | null;
  fen: string;
  id: string;
  mode: "local" | "ai" | "live";
  move_count: number | null;
  pgn: string;
  result: PersistedGame["result"];
  summary: string | null;
  user_id: string;
};

export async function listPersistedGames(userId: string, limit = 24) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { count, data, error } = await supabase
    .from("games")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<DatabaseGameRow[]>();

  if (error) {
    throw error;
  }

  return {
    games: data.map(toPersistedGame),
    totalCount: count ?? data.length,
  };
}

export async function savePersistedGame(input: {
  fen: string;
  mode: PersistedGame["mode"];
  moveCount: number;
  pgn: string;
  result: Exclude<GameResult, null> | "in-progress";
  summary: string;
  userId: string;
}) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const payload = {
    fen: input.fen,
    mode: input.mode,
    move_count: input.moveCount,
    pgn: input.pgn,
    result: input.result,
    summary: input.summary,
    user_id: input.userId,
  };

  const { data, error } = await supabase
    .from("games")
    .insert(payload)
    .select("*")
    .single<DatabaseGameRow>();

  if (error) {
    throw error;
  }

  return toPersistedGame(data);
}
