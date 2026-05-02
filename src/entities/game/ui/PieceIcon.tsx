import type { PieceSymbol, Color } from "chess.js";

const labels: Record<PieceSymbol, string> = {
  k: "K",
  q: "Q",
  r: "R",
  b: "B",
  n: "N",
  p: "P",
};

type Props = {
  color: Color;
  piece: PieceSymbol;
};

export function PieceIcon({ color, piece }: Props) {
  const isWhite = color === "w";

  return (
    <svg
      aria-hidden="true"
      className="h-[80%] w-[80%] drop-shadow-[0_4px_3px_rgba(0,0,0,0.18)]"
      viewBox="0 0 100 100"
    >
      <rect
        x="14"
        y="18"
        width="72"
        height="64"
        rx="12"
        fill={isWhite ? "#f8f1e3" : "#2d2118"}
        stroke={isWhite ? "#3f2d1f" : "#f0e6d2"}
        strokeWidth="5"
      />
      <circle
        cx="50"
        cy="34"
        r="12"
        fill={isWhite ? "#d7b16b" : "#df775d"}
        stroke={isWhite ? "#3f2d1f" : "#f0e6d2"}
        strokeWidth="4"
      />
      <text
        fill={isWhite ? "#201710" : "#f8f1e3"}
        fontFamily="JetBrains Mono, monospace"
        fontSize="34"
        fontWeight="700"
        textAnchor="middle"
        x="50"
        y="66"
      >
        {labels[piece]}
      </text>
    </svg>
  );
}
