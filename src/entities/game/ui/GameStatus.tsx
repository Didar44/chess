import type { Color } from "chess.js";

type Props = {
  checkSquare?: string | null;
  turn: Color;
  isGameOver: boolean;
  result: string | null;
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

export function GameStatus({ checkSquare, isGameOver, result, turn }: Props) {
  return (
    <div aria-live="polite" className="grid gap-3">
      <div className="app-meta-strip">
        <div className="app-meta-card">
          <strong>{isGameOver ? "Closed" : formatTurn(turn)}</strong>
          <span>side to move</span>
        </div>
        <div className="app-meta-card">
          <strong>{describeResult(result)}</strong>
          <span>resolution</span>
        </div>
        <div className="app-meta-card">
          <strong>{checkSquare ?? "Safe"}</strong>
          <span>{checkSquare ? "king square under pressure" : "board status"}</span>
        </div>
      </div>

      <div className="app-pane-note">
        <p className="section-kicker">Match State</p>
        <div className="mt-2 grid gap-2 text-sm text-[var(--color-muted)]">
          <p>
            {isGameOver
              ? "This table is closed. Save the PGN or reset the room for the next round."
              : `${formatTurn(turn)} is up. Use the board as the primary surface and the ledger as confirmation.`}
          </p>
        </div>
      </div>

      {!isGameOver && checkSquare ? (
        <div className="app-pane-note border-[var(--color-danger)] bg-[var(--color-accent-soft)]">
          <p className="section-kicker">Check Alert</p>
          <p className="text-lg font-semibold uppercase leading-none">
            {formatTurn(turn)} king is under pressure
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Resolve the check before any other move. Current king square: {checkSquare}.
          </p>
        </div>
      ) : null}

    </div>
  );
}
