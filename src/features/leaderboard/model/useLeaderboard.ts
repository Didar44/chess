import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlayerProfile } from "@/features/auth/model/types";
import {
  listLeaderboardProfiles,
  listProfileCities,
} from "@/features/auth/lib/supabase";

const leaderboardCache = new Map<
  string,
  { cities: string[]; players: PlayerProfile[] }
>();

export function useLeaderboard(city: string, enabled = true) {
  const [cities, setCities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCities([]);
      setPlayers([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextCities, nextPlayers] = await Promise.all([
        listProfileCities(),
        listLeaderboardProfiles({ city: city || null }),
      ]);
      setCities(nextCities);
      setPlayers(nextPlayers);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Leaderboard load failed.",
      );
    } finally {
      setLoading(false);
    }
  }, [city, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const cacheKey = city || "__all__";
    const cached = leaderboardCache.get(cacheKey);

    if (cached) {
      queueMicrotask(() => {
        setCities(cached.cities);
        setPlayers(cached.players);
        setLoading(false);
        setError(null);
      });
      return;
    }

    queueMicrotask(() => {
      void refresh();
    });
  }, [city, enabled, refresh]);

  useEffect(() => {
    if (!enabled || loading || error) {
      return;
    }

    leaderboardCache.set(city || "__all__", { cities, players });
  }, [cities, city, enabled, error, loading, players]);

  return useMemo(
    () => ({
      cities,
      error,
      loading,
      players,
      refresh,
    }),
    [cities, error, loading, players, refresh],
  );
}
