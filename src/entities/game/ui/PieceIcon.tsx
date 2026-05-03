import type { Color, PieceSymbol } from "chess.js";
import { cn } from "@/shared/lib/cn";
import whiteKing from "@/assets/chess-pieces/wk.svg";
import whiteQueen from "@/assets/chess-pieces/wq.svg";
import whiteRook from "@/assets/chess-pieces/wr.svg";
import whiteBishop from "@/assets/chess-pieces/wb.svg";
import whiteKnight from "@/assets/chess-pieces/wn.svg";
import whitePawn from "@/assets/chess-pieces/wp.svg";
import blackKing from "@/assets/chess-pieces/bk.svg";
import blackQueen from "@/assets/chess-pieces/bq.svg";
import blackRook from "@/assets/chess-pieces/br.svg";
import blackBishop from "@/assets/chess-pieces/bb.svg";
import blackKnight from "@/assets/chess-pieces/bn.svg";
import blackPawn from "@/assets/chess-pieces/bp.svg";

type Props = {
  color: Color;
  piece: PieceSymbol;
};

const whitePieces: Record<PieceSymbol, string> = {
  k: whiteKing,
  q: whiteQueen,
  r: whiteRook,
  b: whiteBishop,
  n: whiteKnight,
  p: whitePawn,
};

const blackPieces: Record<PieceSymbol, string> = {
  k: blackKing,
  q: blackQueen,
  r: blackRook,
  b: blackBishop,
  n: blackKnight,
  p: blackPawn,
};

export function PieceIcon({ color, piece }: Props) {
  const source = color === "w" ? whitePieces[piece] : blackPieces[piece];

  return (
    <img
      alt=""
      aria-hidden="true"
      className={cn(
        "h-[86%] w-[86%] select-none object-contain drop-shadow-[0_6px_4px_rgba(0,0,0,0.22)]",
        color === "b" && "brightness-[0.92] contrast-[1.02]",
      )}
      draggable={false}
      src={source}
    />
  );
}
