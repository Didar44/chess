import type { Color } from "chess.js";
import type { GameResult } from "@/entities/game/model/types";

export const DEFAULT_PLAYER_RATING = 1200;
export const RATING_K_FACTOR = 24;
const MIN_PLAYER_RATING = 100;

type RatingOutcome = {
  blackScore: number;
  whiteScore: number;
  winnerColor: Color | null;
};

export function getRatingOutcome(
  result: Exclude<GameResult, null>,
  turn: Color,
): RatingOutcome {
  if (result === "checkmate" || result === "resigned") {
    const winnerColor = turn === "w" ? "b" : "w";
    return {
      blackScore: winnerColor === "b" ? 1 : 0,
      whiteScore: winnerColor === "w" ? 1 : 0,
      winnerColor,
    };
  }

  return {
    blackScore: 0.5,
    whiteScore: 0.5,
    winnerColor: null,
  };
}

function getExpectedScore(playerRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

function getNextRating(
  currentRating: number,
  expectedScore: number,
  actualScore: number,
) {
  return Math.max(
    MIN_PLAYER_RATING,
    Math.round(currentRating + RATING_K_FACTOR * (actualScore - expectedScore)),
  );
}

export function calculateNextRatings(input: {
  blackRating: number;
  blackScore: number;
  whiteRating: number;
  whiteScore: number;
}) {
  const whiteExpected = getExpectedScore(input.whiteRating, input.blackRating);
  const blackExpected = getExpectedScore(input.blackRating, input.whiteRating);

  return {
    blackRating: getNextRating(
      input.blackRating,
      blackExpected,
      input.blackScore,
    ),
    whiteRating: getNextRating(
      input.whiteRating,
      whiteExpected,
      input.whiteScore,
    ),
  };
}
