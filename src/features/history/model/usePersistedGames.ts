import { useCallback, useEffect, useState } from "react";
import type { PersistedGame } from "@/features/auth/model/types";
import { listPersistedGames } from "@/features/history/lib/games";

const gamesCache = new Map<
  string,
  { games: PersistedGame[]; totalCount: number }
>();

export function usePersistedGames(userId: string | null, limit = 24) {
  const [games, setGames] = useState<PersistedGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!userId) {
      setGames([]);
      setTotalCount(0);
      setError(null);
      gamesCache.delete(`guest:${limit}`);
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
    if (!userId) {
      return;
    }

    const cacheKey = `${userId}:${limit}`;
    const cached = gamesCache.get(cacheKey);

    if (cached) {
      queueMicrotask(() => {
        setGames(cached.games);
        setTotalCount(cached.totalCount);
        setLoading(false);
      });
      return;
    }

    queueMicrotask(() => {
      void refresh();
    });
  }, [limit, refresh, userId]);

  useEffect(() => {
    if (!userId || loading || error) {
      return;
    }

    gamesCache.set(`${userId}:${limit}`, { games, totalCount });
  }, [error, games, limit, loading, totalCount, userId]);

  return {
    error,
    games,
    loading,
    refresh,
    totalCount,
  };
}
