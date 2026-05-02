import { useMemo, useState } from "react";
import { Chess, type PieceSymbol, type Square } from "chess.js";
import {
  collectCapturedPieces,
  describeResult,
  getKingSquare,
  getLegalTargets,
} from "@/entities/game/lib/chess";
import type { PendingPromotion } from "@/entities/game/model/types";

function createGame() {
  return new Chess();
}

export function useLocalChessGame() {
  const [game, setGame] = useState(() => createGame());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [lastMoveKey, setLastMoveKey] = useState<string | null>(null);

  const history = game.history({ verbose: true });
  const lastMove = history.at(-1) ?? null;
  const checkSquare = game.inCheck() ? getKingSquare(game, game.turn()) : null;
  const result = describeResult(game);

  const state = useMemo(
    () => ({
      fen: game.fen(),
      turn: game.turn(),
      history,
      selectedSquare,
      legalTargets: selectedSquare ? getLegalTargets(game, selectedSquare) : [],
      pendingPromotion,
      flipped,
      capturedPieces: collectCapturedPieces(history),
      checkSquare,
      lastMove,
      isGameOver: game.isGameOver(),
      result,
      pgn: game.pgn({ maxWidth: 18, newline: "\n" }),
      lastMoveKey,
    }),
    [
      checkSquare,
      flipped,
      game,
      history,
      lastMove,
      lastMoveKey,
      pendingPromotion,
      result,
      selectedSquare,
    ],
  );

  const resetGame = () => {
    setGame(createGame());
    setSelectedSquare(null);
    setPendingPromotion(null);
    setLastMoveKey(null);
  };

  const flipBoard = () => setFlipped((current) => !current);

  const tryMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    const nextGame = new Chess(game.fen());

    try {
      const move = nextGame.move({ from, to, promotion });
      if (!move) {
        return false;
      }

      setGame(nextGame);
      setSelectedSquare(null);
      setPendingPromotion(null);
      setLastMoveKey(`${move.from}-${move.to}-${nextGame.history().length}`);
      return true;
    } catch {
      return false;
    }
  };

  const resolveSquare = (square: Square) => {
    if (pendingPromotion) {
      return;
    }

    const piece = game.get(square);

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      return;
    }

    if (!selectedSquare) {
      return;
    }

    const candidateMove = game
      .moves({ square: selectedSquare, verbose: true })
      .find((move) => move.to === square);

    if (!candidateMove) {
      setSelectedSquare(piece?.color === game.turn() ? square : null);
      return;
    }

    if (candidateMove.flags.includes("p")) {
      setPendingPromotion({
        from: selectedSquare,
        to: square,
        color: game.turn(),
      });
      return;
    }

    tryMove(selectedSquare, square);
  };

  const confirmPromotion = (piece: PieceSymbol) => {
    if (!pendingPromotion) {
      return;
    }

    tryMove(pendingPromotion.from, pendingPromotion.to, piece);
  };

  const cancelPromotion = () => {
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  const undoMove = () => {
    undoMoves(1);
  };

  const undoMoves = (count: number) => {
    if (history.length === 0 || count < 1) {
      return;
    }

    const nextGame = new Chess(game.fen());

    for (let index = 0; index < count; index += 1) {
      if (!nextGame.undo()) {
        break;
      }
    }

    setGame(nextGame);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setLastMoveKey(`undo-${nextGame.history().length}`);
  };

  const applyUciMove = (uciMove: string) => {
    const from = uciMove.slice(0, 2) as Square;
    const to = uciMove.slice(2, 4) as Square;
    const promotion = uciMove.slice(4, 5) as PieceSymbol | "";

    tryMove(from, to, promotion || undefined);
  };

  const loadPgn = (pgn: string) => {
    const nextGame = new Chess();
    nextGame.loadPgn(pgn);
    setGame(nextGame);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setLastMoveKey(`load-${nextGame.history().length}`);
  };

  return {
    ...state,
    actions: {
      cancelPromotion,
      confirmPromotion,
      flipBoard,
      resetGame,
      resolveSquare,
      applyUciMove,
      loadPgn,
      setSelectedSquare,
      undoMove,
      undoMoves,
    },
    game,
  };
}
