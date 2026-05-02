import { useMemo, useRef, useState } from "react";
import type { Square } from "chess.js";
import { buildBoardSquares, getPieceAt, isDarkSquare } from "@/entities/game/lib/chess";
import { PieceIcon } from "@/entities/game/ui/PieceIcon";
import { cn } from "@/shared/lib/cn";
import type { useLocalChessGame } from "@/entities/game/model/useLocalChessGame";

type GameState = ReturnType<typeof useLocalChessGame>;

type Props = {
  disabled?: boolean;
  gameState: GameState;
};

export function ChessBoard({ disabled = false, gameState }: Props) {
  const {
    actions,
    checkSquare,
    flipped,
    game,
    legalTargets,
    lastMove,
    pendingPromotion,
    selectedSquare,
  } = gameState;

  const boardSquares = useMemo(() => buildBoardSquares(flipped), [flipped]);
  const [focusedSquare, setFocusedSquare] = useState<Square>(boardSquares[0]);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastMoveSquares = new Set<Square>(lastMove ? [lastMove.from, lastMove.to] : []);
  const activeFocusSquare = boardSquares.includes(focusedSquare)
    ? focusedSquare
    : boardSquares[0];

  const moveKeyboardFocus = (square: Square, offset: number) => {
    const index = boardSquares.indexOf(square);

    if (index === -1) {
      return;
    }

    const nextIndex = index + offset;

    if (nextIndex < 0 || nextIndex >= boardSquares.length) {
      return;
    }

    const nextSquare = boardSquares[nextIndex];
    setFocusedSquare(nextSquare);
    buttonRefs.current[nextSquare]?.focus();
  };

  const describeSquare = (square: Square) => {
    const piece = getPieceAt(game, square);
    const tokens: string[] = [square];

    if (piece) {
      tokens.push(`${piece.color === "w" ? "White" : "Black"} ${piece.type}`);
    } else {
      tokens.push("empty");
    }

    if (selectedSquare === square) {
      tokens.push("selected");
    }
    if (legalTargets.includes(square)) {
      tokens.push("legal target");
    }
    if (checkSquare === square) {
      tokens.push("king in check");
    }
    if (lastMoveSquares.has(square)) {
      tokens.push("last move");
    }

    return tokens.join(", ");
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="section-kicker">Board</p>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
          {flipped ? "Black perspective" : "White perspective"}
        </p>
      </div>
      <div className="board-frame overflow-hidden border-2 border-[var(--color-border-strong)] bg-[var(--color-panel-strong)] p-2 shadow-[8px_8px_0_var(--color-shadow)]">
        <p className="sr-only" id="boardline-board-help">
          Use arrow keys to move across the board. Press Enter or Space to select or move a piece.
        </p>
        <div
          aria-describedby="boardline-board-help"
          aria-label="Chess board"
          className="grid grid-cols-8 overflow-hidden border border-[var(--color-border-strong)]"
          role="grid"
        >
          {boardSquares.map((square) => {
            const piece = getPieceAt(game, square);
            const isSelected = selectedSquare === square;
            const isTarget = legalTargets.includes(square);
            const isLastMove = lastMoveSquares.has(square);
            const isCheck = checkSquare === square;

            return (
              <button
                aria-label={describeSquare(square)}
                aria-pressed={isSelected}
                key={square}
                className={cn(
                  "relative aspect-square min-w-0 border border-black/5 transition-transform duration-[120ms] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--color-accent)]",
                  disabled && "cursor-not-allowed opacity-90",
                  isDarkSquare(square)
                    ? "bg-[var(--board-dark)] text-[var(--color-accent-foreground)]"
                    : "bg-[var(--board-light)] text-[var(--color-text)]",
                  isSelected && "shadow-[inset_0_0_0_999px_var(--square-highlight)]",
                  isTarget && "shadow-[inset_0_0_0_999px_var(--square-target)]",
                  isCheck && "check-beacon shadow-[inset_0_0_0_999px_var(--square-check)]",
                  isLastMove && "outline outline-2 outline-offset-[-3px] outline-[var(--color-accent)]",
                  pendingPromotion && pendingPromotion.to === square && "capture-flash",
                )}
                disabled={disabled}
                onFocus={() => setFocusedSquare(square)}
                onKeyDown={(event) => {
                  switch (event.key) {
                    case "ArrowRight":
                      event.preventDefault();
                      moveKeyboardFocus(square, 1);
                      break;
                    case "ArrowLeft":
                      event.preventDefault();
                      moveKeyboardFocus(square, -1);
                      break;
                    case "ArrowDown":
                      event.preventDefault();
                      moveKeyboardFocus(square, 8);
                      break;
                    case "ArrowUp":
                      event.preventDefault();
                      moveKeyboardFocus(square, -8);
                      break;
                    case "Enter":
                    case " ":
                      event.preventDefault();
                      actions.resolveSquare(square);
                      break;
                    default:
                      break;
                  }
                }}
                onClick={() => actions.resolveSquare(square)}
                ref={(node) => {
                  buttonRefs.current[square] = node;
                }}
                tabIndex={activeFocusSquare === square ? 0 : -1}
                type="button"
              >
                <span className="absolute left-1.5 top-1 font-mono text-[10px] uppercase opacity-70">
                  {square}
                </span>
                <span className="flex h-full items-center justify-center">
                  {piece ? (
                    <span className={cn("flex h-full w-full items-center justify-center", gameState.lastMoveKey && "piece-pulse")}>
                      <PieceIcon color={piece.color} piece={piece.type} />
                    </span>
                  ) : isTarget ? (
                    <span className="h-3 w-3 rounded-none border border-[var(--color-border-strong)] bg-[var(--color-secondary)]/80" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
