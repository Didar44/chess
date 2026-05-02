import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/model/auth-context";
import type { CoachingResult, PersistedGame } from "@/features/auth/model/types";
import {
  analyzeGameWithGemini,
  FREE_ANALYSIS_LIMIT,
  isGeminiConfigured,
  listCoachingResults,
  loadCoachingResult,
  saveCoachingResult,
} from "@/features/coach/lib/coach";

export function useCoachAnalysis(game: PersistedGame | null) {
  const { profile, sessionUser } = useAuth();
  const [analysis, setAnalysis] = useState<CoachingResult | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCount, setLoadingCount] = useState(false);
  const isConfigured = isGeminiConfigured();

  const refreshCount = useCallback(async () => {
    if (!sessionUser) {
      setAnalysisCount(0);
      return;
    }

    setLoadingCount(true);

    try {
      const results = await listCoachingResults(sessionUser.id);
      setAnalysisCount(results.length);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not load coach credits.",
      );
    } finally {
      setLoadingCount(false);
    }
  }, [sessionUser]);

  const refreshAnalysis = useCallback(async () => {
    if (!sessionUser || !game) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const existing = await loadCoachingResult(game.id, sessionUser.id);
      setAnalysis(existing);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not load game analysis.",
      );
    } finally {
      setLoading(false);
    }
  }, [game, sessionUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAnalysis();
  }, [refreshAnalysis]);

  const remainingFreeCredits = Math.max(FREE_ANALYSIS_LIMIT - analysisCount, 0);
  const hasUnlimitedCredits = profile?.tier === "pro";
  const canAnalyze =
    Boolean(sessionUser && game) &&
    isConfigured &&
    (hasUnlimitedCredits || analysis !== null || analysisCount < FREE_ANALYSIS_LIMIT);

  const generate = useCallback(async () => {
    if (!sessionUser || !game) {
      throw new Error("Select a saved game first.");
    }

    if (!isConfigured) {
      throw new Error("Missing VITE_GEMINI_API_KEY.");
    }

    if (!hasUnlimitedCredits && !analysis && analysisCount >= FREE_ANALYSIS_LIMIT) {
      throw new Error("Free coach credits used up.");
    }

    setLoading(true);
    setError(null);

    try {
      const generated = await analyzeGameWithGemini(game);
      const saved = await saveCoachingResult({
        gameId: game.id,
        result: generated,
        userId: sessionUser.id,
      });
      setAnalysis(saved);
      await refreshCount();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Coach analysis failed.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    analysis,
    analysisCount,
    game,
    hasUnlimitedCredits,
    isConfigured,
    refreshCount,
    sessionUser,
  ]);

  return useMemo(
    () => ({
      analysis,
      canAnalyze,
      error,
      generate,
      hasUnlimitedCredits,
      isConfigured,
      loading: loading || loadingCount,
      remainingFreeCredits,
    }),
    [
      analysis,
      canAnalyze,
      error,
      generate,
      hasUnlimitedCredits,
      isConfigured,
      loading,
      loadingCount,
      remainingFreeCredits,
    ],
  );
}
