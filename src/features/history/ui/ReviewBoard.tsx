import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { buildBoardSquares, getPieceAt, isDarkSquare } from "@/entities/game/lib/chess";
import { PieceIcon } from "@/entities/game/ui/PieceIcon";
import { cn } from "@/shared/lib/cn";

type Props = {
  fen: string;
};

export function ReviewBoard({ fen }: Props) {
  const game = new Chess(fen);

  return (
    <div className="overflow-hidden border-2 border-[var(--color-border-strong)] bg-[var(--color-panel-strong)] p-2 shadow-[8px_8px_0_var(--color-shadow)]">
      <div className="grid grid-cols-8 overflow-hidden border border-[var(--color-border-strong)]">
        {buildBoardSquares(false).map((square) => {
          const piece = getPieceAt(game, square as Square);

          return (
            <div
              key={square}
              className={cn(
                "relative aspect-square min-w-0 border border-black/5",
                isDarkSquare(square as Square)
                  ? "bg-[var(--board-dark)] text-[var(--color-accent-foreground)]"
                  : "bg-[var(--board-light)] text-[var(--color-text)]",
              )}
            >
              <span className="absolute left-1.5 top-1 font-mono text-[10px] uppercase opacity-70">
                {square}
              </span>
              <span className="flex h-full items-center justify-center">
                {piece ? <PieceIcon color={piece.color} piece={piece.type} /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
