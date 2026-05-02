import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { readEnv } from "@/app/env";
import type {
  PersistedGame,
  PlayerProfile,
  SubscriptionTier,
} from "@/features/auth/model/types";
import { DEFAULT_PLAYER_RATING } from "@/features/ratings/lib/ratings";

type DatabaseProfileRow = {
  city: string | null;
  created_at: string | null;
  display_name: string | null;
  email: string | null;
  id: string;
  rating: number | null;
  tier: "free" | "pro" | null;
  updated_at: string | null;
};

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

let client: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  const { supabasePublishableKey, supabaseUrl } = readEnv();
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    const { supabasePublishableKey, supabaseUrl } = readEnv();
    client = createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return client;
}

function toProfile(row: DatabaseProfileRow, fallbackUser?: User): PlayerProfile {
  return {
    city: row.city ?? "",
    createdAt: row.created_at ?? undefined,
    displayName:
      row.display_name ??
      fallbackUser?.user_metadata.display_name ??
      fallbackUser?.email?.split("@")[0] ??
      "Boardline Player",
    email: row.email ?? fallbackUser?.email ?? "",
    id: row.id,
    rating: row.rating ?? DEFAULT_PLAYER_RATING,
    tier: row.tier ?? "free",
    updatedAt: row.updated_at ?? undefined,
  };
}

export function toPersistedGame(row: DatabaseGameRow): PersistedGame {
  return {
    createdAt: row.created_at ?? new Date().toISOString(),
    fen: row.fen,
    id: row.id,
    mode: row.mode,
    moveCount: row.move_count ?? 0,
    pgn: row.pgn,
    result: row.result,
    summary: row.summary ?? "Saved match",
    userId: row.user_id,
  };
}

export async function getInitialSession() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function onSessionChange(
  callback: (session: Session | null) => void,
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return () => undefined;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}

export async function loadProfile(user: User) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<DatabaseProfileRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toProfile(data, user);
}

export async function upsertProfile(input: {
  city: string;
  displayName: string;
  email: string;
  userId: string;
}) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const payload = {
    city: input.city,
    display_name: input.displayName,
    email: input.email,
    id: input.userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select("*")
    .single<DatabaseProfileRow>();

  if (error) {
    throw error;
  }

  return toProfile(data);
}

export async function ensureProfile(
  user: User,
  defaults?: { city?: string; displayName?: string },
) {
  const existingProfile = await loadProfile(user);

  if (existingProfile) {
    return existingProfile;
  }

  return await upsertProfile({
    city: defaults?.city ?? "",
    displayName:
      defaults?.displayName ??
      user.user_metadata.display_name ??
      user.email?.split("@")[0] ??
      "Boardline Player",
    email: user.email ?? "",
    userId: user.id,
  });
}

export async function listLeaderboardProfiles(input?: {
  city?: string | null;
  limit?: number;
}) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  let query = supabase
    .from("profiles")
    .select("*")
    .order("rating", { ascending: false })
    .order("updated_at", { ascending: false });

  if (input?.city) {
    query = query.eq("city", input.city);
  }

  if (input?.limit) {
    query = query.limit(input.limit);
  }

  const { data, error } = await query.returns<DatabaseProfileRow[]>();

  if (error) {
    throw error;
  }

  return data.map((row) => toProfile(row));
}

export async function listProfileCities() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("city")
    .returns<Array<Pick<DatabaseProfileRow, "city">>>();

  if (error) {
    throw error;
  }

  return [...new Set(data.map((row) => row.city?.trim() ?? "").filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  );
}

export async function loadProfilesByIds(userIds: string[]) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds)
    .returns<DatabaseProfileRow[]>();

  if (error) {
    throw error;
  }

  return data.map((row) => toProfile(row));
}

export async function updateProfileRating(input: {
  rating: number;
  userId: string;
}) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      rating: input.rating,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId)
    .select("*")
    .single<DatabaseProfileRow>();

  if (error) {
    throw error;
  }

  return toProfile(data);
}

export async function updateProfileTier(input: {
  tier: SubscriptionTier;
  userId: string;
}) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      tier: input.tier,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId)
    .select("*")
    .single<DatabaseProfileRow>();

  if (error) {
    throw error;
  }

  return toProfile(data);
}
