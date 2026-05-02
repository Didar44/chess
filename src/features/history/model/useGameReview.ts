import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { PersistedGame } from "@/features/auth/model/types";

export function useGameReview(game: PersistedGame | null) {
  const [ply, setPly] = useState(0);

  const review = useMemo(() => {
    if (!game) {
      return null;
    }

    const source = new Chess();
    source.loadPgn(game.pgn);
    const history = source.history({ verbose: true });
    const board = new Chess();

    history.slice(0, ply).forEach((move) => {
      board.move(move);
    });

    return {
      currentFen: board.fen(),
      history,
      isAtEnd: ply >= history.length,
      isAtStart: ply <= 0,
      pgn: game.pgn,
      ply,
      selectedMove: history[ply - 1] ?? null,
      totalPlies: history.length,
    };
  }, [game, ply]);

  return {
    reset: () => setPly(0),
    review,
    stepBackward: () => setPly((current) => Math.max(current - 1, 0)),
    stepForward: () =>
      setPly((current) =>
        review ? Math.min(current + 1, review.totalPlies) : current,
      ),
    jumpTo: (nextPly: number) => {
      if (!review) {
        return;
      }

      setPly(Math.max(0, Math.min(nextPly, review.totalPlies)));
    },
  };
}
