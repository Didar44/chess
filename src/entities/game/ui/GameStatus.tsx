import type { Color } from "chess.js";

type Props = {
  checkSquare?: string | null;
  turn: Color;
  isGameOver: boolean;
  result: string | null;
  pgn: string;
};

function formatTurn(turn: Color) {
  return turn === "w" ? "White" : "Black";
}

function describeResult(result: string | null) {
  switch (result) {
    case "checkmate":
      return "Checkmate";
    case "stalemate":
      return "Stalemate";
    case "insufficient-material":
      return "Insufficient material";
    case "threefold-repetition":
      return "Threefold repetition";
    case "fifty-move-rule":
      return "Fifty-move rule";
    case "draw":
      return "Draw";
    default:
      return "In play";
  }
}

export function GameStatus({ checkSquare, isGameOver, pgn, result, turn }: Props) {
  return (
    <div aria-live="polite" className="grid gap-3">
      <div className="grid gap-2 border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
        <p className="section-kicker">Match State</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--color-muted)]">Side to move</p>
            <p className="text-3xl font-semibold uppercase leading-none">
              {isGameOver ? "Closed" : formatTurn(turn)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--color-muted)]">Resolution</p>
            <p className="text-2xl font-semibold uppercase leading-none">
              {describeResult(result)}
            </p>
          </div>
        </div>
      </div>

      {!isGameOver && checkSquare ? (
        <div className="grid gap-2 border border-[var(--color-danger)] bg-[var(--color-accent-soft)] p-3">
          <p className="section-kicker">Check Alert</p>
          <p className="text-lg font-semibold uppercase leading-none">
            {formatTurn(turn)} king is under pressure
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Resolve the check before any other move. Current king square: {checkSquare}.
          </p>
        </div>
      ) : null}

      <div className="grid gap-2 border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
        <p className="section-kicker">PGN Snapshot</p>
        <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs text-[var(--color-muted)]">
          {pgn || "Moves will stream here as soon as the game begins."}
        </pre>
      </div>
    </div>
  );
}
