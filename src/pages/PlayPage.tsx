import { useMemo, useState } from "react";
import { ChessBoard } from "@/entities/game/ui/ChessBoard";
import { CapturedPieces } from "@/entities/game/ui/CapturedPieces";
import { GameStatus } from "@/entities/game/ui/GameStatus";
import { MoveList } from "@/entities/game/ui/MoveList";
import { PromotionDialog } from "@/entities/game/ui/PromotionDialog";
import type { EngineDifficulty } from "@/entities/game/model/types";
import { useLocalChessGame } from "@/entities/game/model/useLocalChessGame";
import { useAuth } from "@/features/auth/model/auth-context";
import { useChessAi } from "@/features/engine/model/useChessAi";
import { savePersistedGame } from "@/features/history/lib/games";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";

const difficultyOptions: EngineDifficulty[] = ["easy", "medium", "hard"];

export function PlayPage() {
  const [mode, setMode] = useState<"local" | "ai">("local");
  const [difficulty, setDifficulty] = useState<EngineDifficulty>("medium");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const { isConfigured, sessionUser, status } = useAuth();
  const gameState = useLocalChessGame();
  const ai = useChessAi({
    difficulty,
    enabled: mode === "ai",
    fen: gameState.fen,
    isGameOver: gameState.isGameOver,
    onBestMove: gameState.actions.applyUciMove,
    pendingPromotion: gameState.pendingPromotion,
    turn: gameState.turn,
  });
  const boardDisabled = ai.isThinking || (mode === "ai" && gameState.turn === "b");
  const summary = useMemo(() => {
    const modeLabel = mode === "ai" ? "AI match" : "Local match";

    if (gameState.result === "checkmate") {
      const winner = gameState.turn === "w" ? "Black" : "White";
      return `${modeLabel} · ${winner} won by checkmate`;
    }

    return `${modeLabel} · ${gameState.result ?? "In progress"}`;
  }, [gameState.result, gameState.turn, mode]);

  const handleReset = () => {
    ai.stopThinking();
    setSaveState("idle");
    setSaveError(null);
    gameState.actions.resetGame();
  };

  const handleUndo = () => {
    ai.stopThinking();
    setSaveState("idle");
    setSaveError(null);
    gameState.actions.undoMoves(mode === "ai" ? 2 : 1);
  };

  const selectMode = (nextMode: "local" | "ai") => {
    ai.stopThinking();
    setMode(nextMode);
    setSaveState("idle");
    setSaveError(null);
    gameState.actions.resetGame();
  };

  const handleSaveGame = async () => {
    if (!sessionUser || !gameState.result) {
      return;
    }

    setSaveError(null);
    setSaveState("saving");

    try {
      await savePersistedGame({
        fen: gameState.fen,
        mode,
        moveCount: gameState.history.length,
        pgn: gameState.pgn,
        result: gameState.result,
        summary,
        userId: sessionUser.id,
      });
      setSaveState("saved");
    } catch (nextError) {
      setSaveState("idle");
      setSaveError(
        nextError instanceof Error ? nextError.message : "Game save failed.",
      );
    }
  };

  return (
    <>
      <div className="grid gap-4">
        <PageIntro
          kicker={mode === "ai" ? "AI Match" : "Local Match"}
          title={
            mode === "ai"
              ? "Play the engine without leaving the board room."
              : "Local play with a strict, reviewable match rail."
          }
          summary={
            mode === "ai"
              ? "Stockfish runs in a worker, replies on Black's turn, and supports easy, medium, and hard presets."
              : "Pointer and touch-friendly board controls run through a single authoritative chess engine for reliable hot-seat play."
          }
        />

        <div className="page-enter page-grid">
          <Panel className="panel-rise" heading="Board Room" kicker="Primary Surface">
            <div className="grid gap-4">
              <div className="grid gap-3 border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    compact
                    onClick={() => selectMode("local")}
                    type="button"
                    variant={mode === "local" ? "primary" : "ghost"}
                  >
                    Local
                  </Button>
                  <Button
                    compact
                    onClick={() => selectMode("ai")}
                    type="button"
                    variant={mode === "ai" ? "primary" : "ghost"}
                  >
                    Vs AI
                  </Button>
                </div>
                {mode === "ai" ? (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <p className="section-kicker">Engine Setup</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        You play White. Stockfish controls Black.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {difficultyOptions.map((option) => (
                        <Button
                          key={option}
                          compact
                          onClick={() => setDifficulty(option)}
                          type="button"
                          variant={difficulty === option ? "secondary" : "ghost"}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="empty-state p-3 text-sm text-[var(--color-muted)]">
                Tap or click to move. For keyboard play, focus a square, move with the arrow keys, and press Enter or Space to select and confirm moves.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleReset} type="button">
                  New game
                </Button>
                <Button onClick={handleUndo} type="button" variant="secondary">
                  {mode === "ai" ? "Take back turn" : "Undo move"}
                </Button>
                <Button
                  onClick={gameState.actions.flipBoard}
                  type="button"
                  variant="ghost"
                >
                  Flip board
                </Button>
                {ai.isThinking ? (
                  <Button onClick={ai.stopThinking} type="button" variant="danger">
                    Stop engine
                  </Button>
                ) : null}
              </div>

              <ChessBoard disabled={boardDisabled} gameState={gameState} />
            </div>
          </Panel>

          <div className="grid gap-4">
            {mode === "ai" ? (
              <Panel className="panel-rise" heading="Engine Rail" kicker="Stockfish 17.1">
                <div className="grid gap-3">
                  <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                    <p className="section-kicker">Current State</p>
                    <p className="mt-2 text-2xl font-semibold uppercase leading-none">
                      {ai.isThinking ? "Thinking" : "Waiting"}
                    </p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      {ai.isThinking
                        ? "The engine is calculating Black's reply."
                        : "Make a move to continue the game."}
                    </p>
                  </div>
                  <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                    <p className="section-kicker">Search Info</p>
                    <div className="mt-2 grid gap-2 text-sm text-[var(--color-muted)]">
                      <p>
                        Depth:{" "}
                        <span className="font-semibold text-[var(--color-text)]">
                          {ai.engineInfo?.depth ?? "—"}
                        </span>
                      </p>
                      <p>
                        Eval:{" "}
                        <span className="font-semibold text-[var(--color-text)]">
                          {typeof ai.engineInfo?.mateIn === "number"
                            ? `Mate ${ai.engineInfo.mateIn}`
                            : typeof ai.engineInfo?.scoreCp === "number"
                              ? `${(ai.engineInfo.scoreCp / 100).toFixed(2)}`
                              : "—"}
                        </span>
                      </p>
                      {ai.error ? (
                        <p className="text-[var(--color-danger)]">{ai.error}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Panel>
            ) : null}

            <Panel className="panel-rise" heading="Status Rail" kicker="Shared Utilities">
              <GameStatus
                checkSquare={gameState.checkSquare}
                isGameOver={gameState.isGameOver}
                pgn={gameState.pgn}
                result={gameState.result}
                turn={gameState.turn}
              />
            </Panel>
            <Panel className="panel-rise" heading="Material Ledger" kicker="Capture Tracking">
              <CapturedPieces capturedPieces={gameState.capturedPieces} />
            </Panel>
          </div>
        </div>

        <Panel className="panel-rise" heading="Move Review" kicker="Post-Game Handoff">
          <div className="grid gap-4">
            {gameState.isGameOver ? (
              <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                {status === "authenticated" ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      disabled={saveState === "saving" || saveState === "saved"}
                      onClick={() => void handleSaveGame()}
                      type="button"
                    >
                      {saveState === "saving"
                        ? "Saving"
                        : saveState === "saved"
                          ? "Saved"
                          : "Save to history"}
                    </Button>
                    <p className="text-sm text-[var(--color-muted)]">
                      Save this finished game so it appears in the review route.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 text-sm text-[var(--color-muted)]">
                    <p>Sign in to save finished games to your review history.</p>
                    {isConfigured ? null : (
                      <p>Supabase environment variables are still required for saved history.</p>
                    )}
                  </div>
                )}
                {saveError ? (
                  <p className="mt-3 text-sm text-[var(--color-danger)]">{saveError}</p>
                ) : null}
                {saveState === "saved" ? (
                  <p className="mt-3 text-sm text-[var(--color-success)]">
                    Saved to review history.
                  </p>
                ) : null}
              </div>
            ) : null}
            <MoveList moves={gameState.history} />
          </div>
        </Panel>
      </div>

      {gameState.isGameOver ? (
        <div className="result-rail fixed inset-x-4 bottom-4 z-10 mx-auto max-w-2xl border-2 border-[var(--color-border-strong)] bg-[var(--color-accent)] p-4 text-[var(--color-accent-foreground)] shadow-[8px_8px_0_rgba(0,0,0,0.2)]">
          <p className="section-kicker text-[var(--color-accent-foreground)]/80">
            Match Closed
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-3xl font-semibold uppercase leading-none">
                {gameState.result === "checkmate"
                  ? `${gameState.turn === "w" ? "Black" : "White"} wins`
                  : "Board settled"}
              </p>
              <p className="mt-2 text-sm text-[var(--color-accent-foreground)]/88">
                Reset for another round or head into review once that flow is connected.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                className="border-white/80 bg-white text-[var(--color-text)]"
                onClick={handleReset}
                type="button"
              >
                Run it back
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <PromotionDialog
        pendingPromotion={gameState.pendingPromotion}
        onCancel={gameState.actions.cancelPromotion}
        onConfirm={gameState.actions.confirmPromotion}
      />
    </>
  );
}
