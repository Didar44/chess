import { readEnv } from "@/app/env";
import type { CoachingResult, PersistedGame } from "@/features/auth/model/types";
import { getSupabaseBrowserClient } from "@/features/auth/lib/supabase";

const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
export const FREE_ANALYSIS_LIMIT = 3;

type DatabaseCoachingRow = {
  created_at: string | null;
  game_id: string;
  id: string;
  key_moments: CoachingResult["keyMoments"] | null;
  model: string | null;
  strongest_idea: string | null;
  summary: string | null;
  user_id: string;
  weakest_pattern: string | null;
};

const coachingSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    strongestIdea: { type: "string" },
    weakestPattern: { type: "string" },
    keyMoments: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          ply: { type: "number" },
          move: { type: "string" },
          title: { type: "string" },
          whyItMatters: { type: "string" },
          advice: { type: "string" },
        },
        required: ["ply", "move", "title", "whyItMatters", "advice"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "strongestIdea", "weakestPattern", "keyMoments"],
  additionalProperties: false,
} as const;

function getGeminiApiKey() {
  return readEnv().geminiApiKey;
}

export function getGeminiModel() {
  return DEFAULT_GEMINI_MODEL;
}

export function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}

function toCoachingResult(row: DatabaseCoachingRow): CoachingResult {
  return {
    createdAt: row.created_at ?? new Date().toISOString(),
    gameId: row.game_id,
    id: row.id,
    keyMoments: row.key_moments ?? [],
    model: row.model ?? DEFAULT_GEMINI_MODEL,
    strongestIdea: row.strongest_idea ?? "",
    summary: row.summary ?? "",
    userId: row.user_id,
    weakestPattern: row.weakest_pattern ?? "",
  };
}

export async function listCoachingResults(userId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("coaching_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<DatabaseCoachingRow[]>();

  if (error) {
    throw error;
  }

  return data.map(toCoachingResult);
}

export async function loadCoachingResult(gameId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("coaching_results")
    .select("*")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle<DatabaseCoachingRow>();

  if (error) {
    throw error;
  }

  return data ? toCoachingResult(data) : null;
}

export async function saveCoachingResult(input: {
  gameId: string;
  result: Omit<CoachingResult, "createdAt" | "gameId" | "id" | "userId">;
  userId: string;
}) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const payload = {
    game_id: input.gameId,
    key_moments: input.result.keyMoments,
    model: input.result.model,
    strongest_idea: input.result.strongestIdea,
    summary: input.result.summary,
    user_id: input.userId,
    weakest_pattern: input.result.weakestPattern,
  };

  const { data, error } = await supabase
    .from("coaching_results")
    .upsert(payload, { onConflict: "game_id,user_id" })
    .select("*")
    .single<DatabaseCoachingRow>();

  if (error) {
    throw error;
  }

  return toCoachingResult(data);
}

export async function analyzeGameWithGemini(game: PersistedGame) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY.");
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are a sharp but concise chess coach.
Analyze the following completed game and return JSON only.
Focus on practical mistakes and useful improvements, not engine spam.

Game summary: ${game.summary}
Mode: ${game.mode}
Result: ${game.result}
Move count: ${game.moveCount}

PGN:
${game.pgn}

Requirements:
- return 3 to 5 key moments
- each key moment must reference the ply number and SAN move if inferable from the PGN
- keep advice actionable for a club player
- keep the summary short
`;

  const response = await ai.models.generateContent({
    model: DEFAULT_GEMINI_MODEL,
    contents: prompt,
    config: {
      responseJsonSchema: coachingSchema,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini returned an empty analysis response.");
  }

  const parsed = JSON.parse(text) as Omit<
    CoachingResult,
    "createdAt" | "gameId" | "id" | "userId" | "model"
  >;

  return {
    keyMoments: parsed.keyMoments,
    model: DEFAULT_GEMINI_MODEL,
    strongestIdea: parsed.strongestIdea,
    summary: parsed.summary,
    weakestPattern: parsed.weakestPattern,
  };
}
