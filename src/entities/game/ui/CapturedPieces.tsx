import type { Color } from "chess.js";
import type { CapturedPiece } from "@/entities/game/model/types";
import { PieceIcon } from "@/entities/game/ui/PieceIcon";

type Props = {
  capturedPieces: CapturedPiece[];
};

function Row({ color, pieces }: { color: Color; pieces: CapturedPiece[] }) {
  return (
    <div className="grid gap-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
        Captured from {color === "w" ? "White" : "Black"}
      </p>
      <div className="flex min-h-16 flex-wrap gap-2 border-2 border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-panel)_96%,white)] p-2 shadow-[4px_4px_0_var(--color-shadow)]">
        {pieces.length > 0 ? (
          pieces.map((piece) => (
            <div
              key={`${piece.color}-${piece.piece}-${piece.moveNumber}`}
              className="flex h-12 w-12 items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-surface)]"
            >
              <PieceIcon color={piece.color} piece={piece.piece} />
            </div>
          ))
        ) : (
          <p className="empty-state flex min-h-12 w-full items-center px-3 text-sm text-[var(--color-muted)]">
            No material lost yet.
          </p>
        )}
      </div>
    </div>
  );
}

export function CapturedPieces({ capturedPieces }: Props) {
  const whitePieces = capturedPieces.filter((piece) => piece.color === "w");
  const blackPieces = capturedPieces.filter((piece) => piece.color === "b");

  return (
    <div className="grid gap-3">
      <Row color="w" pieces={whitePieces} />
      <Row color="b" pieces={blackPieces} />
    </div>
  );
}
