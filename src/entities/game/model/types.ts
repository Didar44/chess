import type {
  Color,
  Move,
  PieceSymbol,
  Square,
} from "chess.js";

export type GameResult =
  | "checkmate"
  | "stalemate"
  | "draw"
  | "insufficient-material"
  | "threefold-repetition"
  | "fifty-move-rule"
  | "resigned"
  | null;

export type CapturedPiece = {
  color: Color;
  piece: PieceSymbol;
  moveNumber: number;
};

export type PendingPromotion = {
  from: Square;
  to: Square;
  color: Color;
};

export type PlayedMove = Move;

export type EngineDifficulty = "easy" | "medium" | "hard";
