import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EngineDifficulty, PendingPromotion } from "@/entities/game/model/types";
import {
  StockfishClient,
  type EngineInfo,
} from "@/features/engine/lib/stockfish";

type UseChessAiOptions = {
  difficulty: EngineDifficulty;
  enabled: boolean;
  fen: string;
  isGameOver: boolean;
  onBestMove: (move: string) => void;
  pendingPromotion: PendingPromotion | null;
  turn: "w" | "b";
};

export function useChessAi({
  difficulty,
  enabled,
  fen,
  isGameOver,
  onBestMove,
  pendingPromotion,
  turn,
}: UseChessAiOptions) {
  const clientRef = useRef<StockfishClient | null>(null);
  const [engineInfo, setEngineInfo] = useState<EngineInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const onBestMoveRef = useRef(onBestMove);

  useEffect(() => {
    onBestMoveRef.current = onBestMove;
  }, [onBestMove]);

  useEffect(() => {
    clientRef.current = new StockfishClient();

    return () => {
      abortRef.current?.abort();
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  const stopThinking = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clientRef.current?.stop();
    setIsThinking(false);
    setEngineInfo(null);
  }, []);

  useEffect(() => {
    if (!enabled || turn !== "b" || isGameOver || pendingPromotion) {
      abortRef.current?.abort();
      abortRef.current = null;
      clientRef.current?.stop();
      return;
    }

    if (!clientRef.current) {
      return;
    }

    const abortController = new AbortController();
    abortRef.current = abortController;
    setError(null);
    setIsThinking(true);

    clientRef.current
      .search({
        difficulty,
        fen,
        onInfo: (info) => setEngineInfo(info),
        signal: abortController.signal,
      })
      .then(({ bestMove }) => {
        setIsThinking(false);
        setEngineInfo(null);
        onBestMoveRef.current(bestMove);
      })
      .catch((nextError: unknown) => {
        const isAbort =
          nextError instanceof DOMException && nextError.name === "AbortError";

        if (isAbort) {
          return;
        }

        setIsThinking(false);
        setError(nextError instanceof Error ? nextError.message : "Engine failed.");
      });

    return () => {
      abortController.abort();
    };
  }, [
    difficulty,
    enabled,
    fen,
    isGameOver,
    pendingPromotion,
    stopThinking,
    turn,
  ]);

  return useMemo(
    () => ({
      engineInfo,
      error,
      isThinking,
      stopThinking,
    }),
    [engineInfo, error, isThinking, stopThinking],
  );
}
