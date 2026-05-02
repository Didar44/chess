import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlayerProfile } from "@/features/auth/model/types";
import {
  listLeaderboardProfiles,
  listProfileCities,
} from "@/features/auth/lib/supabase";

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

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
