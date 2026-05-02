import type { PieceSymbol } from "chess.js";
import { Button } from "@/shared/ui/Button";
import { PieceIcon } from "@/entities/game/ui/PieceIcon";
import type { PendingPromotion } from "@/entities/game/model/types";

type Props = {
  pendingPromotion: PendingPromotion | null;
  onConfirm: (piece: PieceSymbol) => void;
  onCancel: () => void;
};

const promotionOptions: PieceSymbol[] = ["q", "r", "b", "n"];

export function PromotionDialog({ pendingPromotion, onCancel, onConfirm }: Props) {
  if (!pendingPromotion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
      <div className="section-card w-full max-w-md p-5">
        <p className="section-kicker">Promotion Required</p>
        <h3 className="mt-2 text-3xl font-semibold uppercase leading-none">
          Choose the finishing piece.
        </h3>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          {pendingPromotion.from} to {pendingPromotion.to}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {promotionOptions.map((piece) => (
            <button
              key={piece}
              className="flex aspect-square items-center justify-center border border-[var(--color-border-strong)] bg-[var(--color-panel)] transition-colors hover:bg-[var(--color-accent-soft)]"
              onClick={() => onConfirm(piece)}
              type="button"
            >
              <PieceIcon color={pendingPromotion.color} piece={piece} />
            </button>
          ))}
        </div>
        <div className="mt-5">
          <Button compact variant="ghost" onClick={onCancel} type="button">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
