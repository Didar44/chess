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

function cloneGame(source: Chess) {
  const pgn = source.pgn();

  if (pgn.trim()) {
    const nextGame = new Chess();
    nextGame.loadPgn(pgn);
    return nextGame;
  }

  return new Chess(source.fen());
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
    const nextGame = cloneGame(game);

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

  const movePiece = (from: Square, to: Square) => {
    if (pendingPromotion) {
      return false;
    }

    const piece = game.get(from);

    if (!piece || piece.color !== game.turn()) {
      return false;
    }

    const candidateMove = game
      .moves({ square: from, verbose: true })
      .find((move) => move.to === to);

    if (!candidateMove) {
      return false;
    }

    if (candidateMove.flags.includes("p")) {
      setSelectedSquare(from);
      setPendingPromotion({
        from,
        to,
        color: game.turn(),
      });
      return true;
    }

    return tryMove(from, to);
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

    const nextGame = cloneGame(game);

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
    if (!pgn.trim()) {
      setGame(createGame());
      setSelectedSquare(null);
      setPendingPromotion(null);
      setLastMoveKey("load-0");
      return;
    }

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
      movePiece,
      applyUciMove,
      loadPgn,
      setSelectedSquare,
      undoMove,
      undoMoves,
    },
    game,
  };
}
