import type { Color } from "chess.js";
import type { GameResult } from "@/entities/game/model/types";
import type { MatchPreference } from "@/features/auth/model/types";

export type LiveMatchStatus = "waiting" | "active" | "finished";

export type LiveSeat = {
  color: Color;
  isGuest: boolean;
  joinedAt: string;
  name: string;
  presenceKey: string;
};

export type LivePresence = {
  isGuest: boolean;
  joinedAt: string;
  name: string;
  presenceKey: string;
};

export type LiveRatingStatus =
  | "idle"
  | "processing"
  | "applied"
  | "skipped"
  | "error";

export type LiveMatchPreference = MatchPreference;

export type LiveMatchRecord = {
  blackName: string | null;
  blackPlayerKey: string | null;
  createdAt: string;
  createdBy: string;
  fen: string;
  gameId: string;
  id: string;
  lastMoveUci: string | null;
  mode: "live";
  moveCount: number;
  pgn: string;
  result: Exclude<GameResult, null> | "in-progress";
  status: LiveMatchStatus;
  updatedAt: string;
  whiteName: string | null;
  whitePlayerKey: string | null;
};
