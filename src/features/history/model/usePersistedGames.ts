import { useCallback, useEffect, useState } from "react";
import type { PersistedGame } from "@/features/auth/model/types";
import { listPersistedGames } from "@/features/history/lib/games";

export function usePersistedGames(userId: string | null, limit = 24) {
  const [games, setGames] = useState<PersistedGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setGames([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextGames = await listPersistedGames(userId, limit);
      setGames(nextGames.games);
      setTotalCount(nextGames.totalCount);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "History load failed.",
      );
    } finally {
      setLoading(false);
    }
  }, [limit, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return {
    error,
    games,
    loading,
    refresh,
    totalCount,
  };
}
