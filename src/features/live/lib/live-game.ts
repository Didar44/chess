import { getSupabaseBrowserClient } from "@/features/auth/lib/supabase";
import type { LiveMatchRecord, LiveMatchStatus } from "@/features/live/model/types";

const GUEST_KEY_STORAGE = "boardline-live-guest-key";
const GUEST_NAME_STORAGE = "boardline-live-guest-name";

type DatabaseLiveGameRow = {
  black_name: string | null;
  black_player_key: string | null;
  created_at: string | null;
  created_by: string;
  fen: string;
  game_id: string;
  id: string;
  last_move_uci: string | null;
  mode: "live";
  move_count: number | null;
  pgn: string;
  result: LiveMatchRecord["result"];
  status: LiveMatchStatus;
  updated_at: string | null;
  white_name: string | null;
  white_player_key: string | null;
};

function generateId() {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}

export function createLiveGameId() {
  return generateId().split("-")[0];
}

export function getUnifiedGamePath(input?: {
  lane?: "pro" | null;
  mode?: "live";
  roomId?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("mode", input?.mode ?? "live");

  if (input?.roomId) {
    params.set("room", input.roomId);
  }

  if (input?.lane === "pro") {
    params.set("lane", "pro");
  }

  return `/play?${params.toString()}`;
}

export function getLiveChannelName(gameId: string) {
  return `live:match:${gameId}`;
}

export function getLiveShareUrl(gameId: string) {
  return `${window.location.origin}${getUnifiedGamePath({ roomId: gameId })}`;
}

export function getOrCreateGuestIdentity() {
  const existingKey = window.localStorage.getItem(GUEST_KEY_STORAGE);
  const existingName = window.localStorage.getItem(GUEST_NAME_STORAGE);

  if (existingKey && existingName) {
    return { key: existingKey, name: existingName };
  }

  const key = generateId();
  const name = `Guest ${key.slice(0, 4).toUpperCase()}`;
  window.localStorage.setItem(GUEST_KEY_STORAGE, key);
  window.localStorage.setItem(GUEST_NAME_STORAGE, name);

  return { key, name };
}

function toLiveMatchRecord(row: DatabaseLiveGameRow): LiveMatchRecord {
  return {
    blackName: row.black_name,
    blackPlayerKey: row.black_player_key,
    createdAt: row.created_at ?? new Date().toISOString(),
    createdBy: row.created_by,
    fen: row.fen,
    gameId: row.game_id,
    id: row.id,
    lastMoveUci: row.last_move_uci,
    mode: "live",
    moveCount: row.move_count ?? 0,
    pgn: row.pgn,
    result: row.result,
    status: row.status,
    updatedAt: row.updated_at ?? new Date().toISOString(),
    whiteName: row.white_name,
    whitePlayerKey: row.white_player_key,
  };
}

export async function loadLiveGameRecord(gameId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("live_games")
    .select("*")
    .eq("game_id", gameId)
    .maybeSingle<DatabaseLiveGameRow>();

  if (error) {
    throw error;
  }

  return data ? toLiveMatchRecord(data) : null;
}

export async function upsertLiveGameRecord(input: {
  blackName: string | null;
  blackPlayerKey: string | null;
  createdBy: string;
  fen: string;
  gameId: string;
  lastMoveUci: string | null;
  moveCount: number;
  pgn: string;
  result: LiveMatchRecord["result"];
  status: LiveMatchStatus;
  whiteName: string | null;
  whitePlayerKey: string | null;
}) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const payload = {
    black_name: input.blackName,
    black_player_key: input.blackPlayerKey,
    created_by: input.createdBy,
    fen: input.fen,
    game_id: input.gameId,
    last_move_uci: input.lastMoveUci,
    mode: "live" as const,
    move_count: input.moveCount,
    pgn: input.pgn,
    result: input.result,
    status: input.status,
    updated_at: new Date().toISOString(),
    white_name: input.whiteName,
    white_player_key: input.whitePlayerKey,
  };

  const { data, error } = await supabase
    .from("live_games")
    .upsert(payload, { onConflict: "game_id" })
    .select("*")
    .single<DatabaseLiveGameRow>();

  if (error) {
    throw error;
  }

  return toLiveMatchRecord(data);
}
