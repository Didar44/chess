import { Chess, type Color, type Piece, type Square } from "chess.js";
import type { CapturedPiece, GameResult, PlayedMove } from "@/entities/game/model/types";

export const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
export const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

export function buildBoardSquares(flipped: boolean): Square[] {
  const nextFiles = flipped ? [...files].reverse() : files;
  const nextRanks = flipped ? [...ranks].reverse() : ranks;

  return nextRanks.flatMap((rank) =>
    nextFiles.map((file) => `${file}${rank}` as Square),
  );
}

export function isDarkSquare(square: Square) {
  const fileIndex = files.findIndex((file) => file === square.charAt(0));
  const rankIndex = Number(square[1]);
  return (fileIndex + rankIndex) % 2 === 0;
}

export function getPieceAt(chess: Chess, square: Square): Piece | null {
  return chess.get(square) ?? null;
}

export function getLegalTargets(chess: Chess, square: Square): Square[] {
  return chess.moves({ square, verbose: true }).map((move) => move.to);
}

export function collectCapturedPieces(history: PlayedMove[]): CapturedPiece[] {
  return history.flatMap((move, index) =>
    move.captured
      ? [
          {
            color: move.color === "w" ? "b" : "w",
            piece: move.captured,
            moveNumber: index + 1,
          },
        ]
      : [],
  );
}

export function describeResult(chess: Chess): GameResult {
  if (chess.isCheckmate()) {
    return "checkmate";
  }
  if (chess.isStalemate()) {
    return "stalemate";
  }
  if (chess.isInsufficientMaterial()) {
    return "insufficient-material";
  }
  if (chess.isThreefoldRepetition()) {
    return "threefold-repetition";
  }
  if (chess.isDrawByFiftyMoves()) {
    return "fifty-move-rule";
  }
  if (chess.isDraw()) {
    return "draw";
  }
  return null;
}

export function getKingSquare(chess: Chess, color: Color): Square | null {
  const targetKing = `${color}k`;
  const board = chess.board();

  for (let rankIndex = 0; rankIndex < board.length; rankIndex += 1) {
    const rank = board[rankIndex];

    for (let fileIndex = 0; fileIndex < rank.length; fileIndex += 1) {
      const piece = rank[fileIndex];

      if (piece && `${piece.color}${piece.type}` === targetKing) {
        const square = `${files[fileIndex]}${8 - rankIndex}` as Square;
        return square;
      }
    }
  }

  return null;
}
