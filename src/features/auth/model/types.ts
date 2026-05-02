import type { User } from "@supabase/supabase-js";
import type { GameResult } from "@/entities/game/model/types";

export type AuthStatus = "disabled" | "loading" | "guest" | "authenticated";

export type SubscriptionTier = "free" | "pro";

export type MatchPreference = "standard" | "priority";

export type PlayerProfile = {
  city: string;
  createdAt?: string;
  displayName: string;
  email: string;
  id: string;
  rating: number;
  tier: SubscriptionTier;
  updatedAt?: string;
};

export type PersistedGame = {
  analysisId?: string;
  createdAt: string;
  fen: string;
  id: string;
  mode: "local" | "ai" | "live";
  moveCount: number;
  pgn: string;
  result: Exclude<GameResult, null> | "in-progress";
  summary: string;
  userId: string;
};

export type CoachingMoment = {
  advice: string;
  move: string;
  ply: number;
  title: string;
  whyItMatters: string;
};

export type CoachingResult = {
  createdAt: string;
  gameId: string;
  id: string;
  keyMoments: CoachingMoment[];
  model: string;
  strongestIdea: string;
  summary: string;
  userId: string;
  weakestPattern: string;
};

export type AuthContextValue = {
  error: string | null;
  isConfigured: boolean;
  profile: PlayerProfile | null;
  refreshProfile: () => Promise<void>;
  sessionUser: User | null;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: {
    city: string;
    displayName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  status: AuthStatus;
  updateProfile: (input: {
    city: string;
    displayName: string;
  }) => Promise<void>;
};
