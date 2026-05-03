import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { getUnifiedGamePath } from "@/features/live/lib/live-game";

export function LiveGamePage() {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const lane = searchParams.get("lane") === "pro" ? "pro" : null;

  return (
    <Navigate
      replace
      to={getUnifiedGamePath({
        lane,
        roomId: gameId ?? null,
      })}
    />
  );
}
