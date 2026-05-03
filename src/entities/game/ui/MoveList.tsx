import type { PlayedMove } from "@/entities/game/model/types";

type Props = {
  moves: PlayedMove[];
};

export function MoveList({ moves }: Props) {
  const pairedMoves = moves.reduce<Array<{ number: number; white?: string; black?: string }>>(
    (accumulator, move, index) => {
      if (index % 2 === 0) {
        accumulator.push({
          number: Math.floor(index / 2) + 1,
          white: move.san,
        });
      } else {
        const row = accumulator[accumulator.length - 1];
        row.black = move.san;
      }
      return accumulator;
    },
    [],
  );

  return (
    <div className="grid gap-3">
      <p className="section-kicker">Move Ledger</p>
      <div className="scroll-rail-md border-2 border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-surface)_96%,white)] shadow-[4px_4px_0_var(--color-shadow)]">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[var(--color-panel-strong)] font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
            <tr>
              <th className="border-b border-[var(--color-border)] px-3 py-2">No.</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">White</th>
              <th className="border-b border-[var(--color-border)] px-3 py-2">Black</th>
            </tr>
          </thead>
          <tbody>
            {pairedMoves.length > 0 ? (
              pairedMoves.map((row) => (
                <tr key={row.number} className="odd:bg-[var(--color-accent-soft)]/40">
                  <td className="border-b border-[var(--color-border)] px-3 py-2 font-mono text-xs">
                    {row.number}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">
                    {row.white}
                  </td>
                  <td className="border-b border-[var(--color-border)] px-3 py-2 font-semibold">
                    {row.black ?? "…"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="empty-state px-3 py-5 text-sm text-[var(--color-muted)]"
                  colSpan={3}
                >
                  No moves yet. Start with White or use keyboard focus on the board and press Enter to play.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
