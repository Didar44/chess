import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChessBoard } from "@/entities/game/ui/ChessBoard";
import { CapturedPieces } from "@/entities/game/ui/CapturedPieces";
import { GameStatus } from "@/entities/game/ui/GameStatus";
import { MoveList } from "@/entities/game/ui/MoveList";
import { PromotionDialog } from "@/entities/game/ui/PromotionDialog";
import type { EngineDifficulty } from "@/entities/game/model/types";
import { useLocalChessGame } from "@/entities/game/model/useLocalChessGame";
import { PREMIUM_LIVE_LABEL } from "@/features/entitlements/lib/limits";
import { useAuth } from "@/features/auth/model/auth-context";
import { useChessAi } from "@/features/engine/model/useChessAi";
import { savePersistedGame } from "@/features/history/lib/games";
import {
  createLiveGameId,
} from "@/features/live/lib/live-game";
import { useLiveGame } from "@/features/live/model/useLiveGame";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";
import { TextField } from "@/shared/ui/TextField";

type GameMode = "local" | "ai" | "live";

const difficultyOptions: EngineDifficulty[] = ["easy", "medium", "hard"];

const modeCards: Array<{
  description: string;
  label: string;
  mode: GameMode;
}> = [
  {
    mode: "local",
    label: "Local",
    description: "Pass the board locally and start instantly.",
  },
  {
    mode: "ai",
    label: "Vs AI",
    description: "Pick a strength and spar with the engine.",
  },
  {
    mode: "live",
    label: "Real Player",
    description: "Create or join a room and play a human opponent.",
  },
];

function normalizeMode(value: string | null): GameMode | null {
  if (value === "local" || value === "ai" || value === "live") {
    return value;
  }

  return null;
}

function ModeCard({
  description,
  isActive,
  label,
  onClick,
}: {
  description: string;
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isActive}
      className={cn(
        "app-mode-card",
        isActive && "is-active",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="app-mode-card__eyebrow">Mode</span>
      <strong>{label}</strong>
      <span>{description}</span>
    </button>
  );
}

export function PlayPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedMode = normalizeMode(searchParams.get("mode"));
  const roomId = searchParams.get("room")?.trim() || null;
  const isPriorityLane = searchParams.get("lane") === "pro";
  const [difficulty, setDifficulty] = useState<EngineDifficulty>("medium");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [joinId, setJoinId] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [startedMode, setStartedMode] = useState<"local" | "ai" | null>(null);
  const { isConfigured, profile, sessionUser, status } = useAuth();
  const gameState = useLocalChessGame();
  const live = useLiveGame(selectedMode === "live" ? roomId : null, gameState);
  const ai = useChessAi({
    difficulty,
    enabled: selectedMode === "ai" && startedMode === "ai",
    fen: gameState.fen,
    isGameOver: gameState.isGameOver,
    onBestMove: gameState.actions.applyUciMove,
    pendingPromotion: gameState.pendingPromotion,
    turn: gameState.turn,
  });
  const previousRoomIdRef = useRef<string | null>(roomId);
  const autoSavedGameKeyRef = useRef<string | null>(null);

  const isLocalActive = selectedMode === "local" && startedMode === "local";
  const isAiActive = selectedMode === "ai" && startedMode === "ai";
  const isLiveActive = selectedMode === "live" && Boolean(roomId);
  const activeMode: GameMode | null = isLiveActive
    ? "live"
    : isAiActive
      ? "ai"
      : isLocalActive
        ? "local"
        : null;
  const boardDisabled = activeMode === null
    ? true
    : activeMode === "ai"
      ? ai.isThinking || gameState.turn === "b"
      : activeMode === "live"
        ? live.status !== "ready" || !live.canMove
        : false;

  const summary = useMemo(() => {
    const modeLabel = activeMode === "ai"
      ? "AI match"
      : activeMode === "live"
        ? "Live match"
        : "Local match";

    if (gameState.result === "checkmate") {
      const winner = gameState.turn === "w" ? "Black" : "White";
      return `${modeLabel} · ${winner} won by checkmate`;
    }

    return `${modeLabel} · ${gameState.result ?? "In progress"}`;
  }, [activeMode, gameState.result, gameState.turn]);

  useEffect(() => {
    if (roomId === previousRoomIdRef.current) {
      return;
    }

    ai.stopThinking();
    setStartedMode(null);
    setSaveState("idle");
    setSaveError(null);
    setCopyState("idle");
    gameState.actions.resetGame();
    previousRoomIdRef.current = roomId;
  }, [ai, gameState.actions, roomId]);

  const setModeSearch = (
    mode: GameMode,
    options?: { lane?: "pro" | null; roomId?: string | null },
  ) => {
    const next = new URLSearchParams();
    next.set("mode", mode);

    if (options?.roomId) {
      next.set("room", options.roomId);
    }

    if (options?.lane === "pro") {
      next.set("lane", "pro");
    }

    setSearchParams(next);
  };

  const resetTableState = () => {
    ai.stopThinking();
    setSaveState("idle");
    setSaveError(null);
    setCopyState("idle");
    autoSavedGameKeyRef.current = null;
    gameState.actions.resetGame();
  };

  const handleModeSelect = (mode: GameMode) => {
    if (mode === selectedMode) {
      return;
    }

    resetTableState();
    setStartedMode(null);
    if (mode === "live") {
      setModeSearch("live");
      return;
    }

    setModeSearch(mode);
  };

  const handleStartLocal = () => {
    if (selectedMode !== "local") {
      setModeSearch("local");
    }

    resetTableState();
    setStartedMode("local");
  };

  const handleStartAi = () => {
    if (selectedMode !== "ai") {
      setModeSearch("ai");
    }

    resetTableState();
    setStartedMode("ai");
  };

  const handleReset = () => {
    resetTableState();
    if (activeMode === "ai") {
      setStartedMode("ai");
      return;
    }

    if (activeMode === "local") {
      setStartedMode("local");
    }
  };

  const handleUndo = () => {
    ai.stopThinking();
    setSaveState("idle");
    setSaveError(null);
    gameState.actions.undoMoves(activeMode === "ai" ? 2 : 1);
  };

  const handleSaveGame = async () => {
    if (!sessionUser || !gameState.result || !activeMode || activeMode === "live") {
      return;
    }

    setSaveError(null);
    setSaveState("saving");

    try {
      await savePersistedGame({
        fen: gameState.fen,
        mode: activeMode,
        moveCount: gameState.history.length,
        pgn: gameState.pgn,
        result: gameState.result,
        summary,
        userId: sessionUser.id,
      });
      autoSavedGameKeyRef.current = `${activeMode}:${gameState.pgn}:${gameState.result}:${sessionUser.id}`;
      setSaveState("saved");
    } catch (nextError) {
      setSaveState("idle");
      setSaveError(
        nextError instanceof Error ? nextError.message : "Game save failed.",
      );
    }
  };

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !sessionUser ||
      !gameState.isGameOver ||
      !gameState.result ||
      !activeMode ||
      activeMode === "live"
    ) {
      return;
    }

    const gameKey = `${activeMode}:${gameState.pgn}:${gameState.result}:${sessionUser.id}`;

    if (autoSavedGameKeyRef.current === gameKey || saveState === "saving" || saveState === "saved") {
      return;
    }

    autoSavedGameKeyRef.current = gameKey;
    setSaveError(null);
    setSaveState("saving");

    void savePersistedGame({
      fen: gameState.fen,
      mode: activeMode,
      moveCount: gameState.history.length,
      pgn: gameState.pgn,
      result: gameState.result,
      summary,
      userId: sessionUser.id,
    })
      .then(() => {
        setSaveState("saved");
      })
      .catch((nextError) => {
        autoSavedGameKeyRef.current = null;
        setSaveState("idle");
        setSaveError(
          nextError instanceof Error ? nextError.message : "Game save failed.",
        );
      });
  }, [
    activeMode,
    gameState.fen,
    gameState.history.length,
    gameState.isGameOver,
    gameState.pgn,
    gameState.result,
    saveState,
    sessionUser,
    status,
    summary,
  ]);

  const handleCreateRoom = (lane?: "pro") => {
    resetTableState();
    setStartedMode(null);
    setModeSearch("live", {
      lane: lane ?? null,
      roomId: createLiveGameId(),
    });
  };

  const handleJoinRoom = () => {
    const nextRoomId = joinId.trim();

    if (!nextRoomId) {
      return;
    }

    resetTableState();
    setStartedMode(null);
    setModeSearch("live", { roomId: nextRoomId });
  };

  const handleCopyInvite = () => {
    if (!live.shareUrl) {
      return;
    }

    void navigator.clipboard.writeText(live.shareUrl).then(() => {
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    });
  };

  const handleLeaveLiveRoom = () => {
    resetTableState();
    setStartedMode(null);
    setModeSearch("live");
  };

  const currentSetupTitle = selectedMode === "local"
    ? "Local setup"
    : selectedMode === "ai"
      ? "Engine setup"
      : selectedMode === "live"
        ? roomId
          ? "Room context"
          : "Real-player setup"
        : "Choose a mode";

  const currentSetupSummary = selectedMode === "local"
    ? "Start a hot-seat game when you are ready. Until then, the table stays locked."
    : selectedMode === "ai"
      ? "Pick a difficulty, then start the engine match. The board unlocks once the setup is valid."
      : selectedMode === "live"
        ? roomId
          ? "This room is active. The board unlocks when the connection and seat state allow play."
          : "Create or join a room first. The board stays visible, but multiplayer controls determine when it becomes playable."
        : "Pick how you want to play. The table is visible immediately, but disabled until the needed setup is complete.";

  return (
    <>
      <div className="grid gap-4">
        <PageIntro
          kicker="Game Room"
          title="One board room for local, engine, and real-player matches."
          summary="Choose how you want to play, complete the required setup, and then unlock the board. The table stays visible from the first screen, but it does not accept moves until the selected mode is ready."
        />

        <div className="app-page-grid page-enter">
          <Panel className="panel-rise" heading="Board Room" kicker={activeMode ? "Active Match" : "Ready Table"}>
            <div className="grid gap-4">
              <div className="app-mode-grid">
                {modeCards.map((card) => (
                  <ModeCard
                    key={card.mode}
                    description={card.description}
                    isActive={selectedMode === card.mode}
                    label={card.label}
                    onClick={() => handleModeSelect(card.mode)}
                  />
                ))}
              </div>

              <ChessBoard disabled={boardDisabled} gameState={gameState} />

              {activeMode === null ? (
                <div className="app-pane-note border-[var(--color-warning)]">
                  <p className="text-sm">
                    {currentSetupSummary}
                  </p>
                </div>
              ) : null}

              {isLocalActive || isAiActive ? (
                <>
                  <div className="app-toolbar">
                    <Button onClick={handleReset} type="button">
                      New game
                    </Button>
                    <Button onClick={handleUndo} type="button" variant="secondary">
                      {activeMode === "ai" ? "Take back turn" : "Undo move"}
                    </Button>
                    <Button
                      onClick={gameState.actions.flipBoard}
                      type="button"
                      variant="ghost"
                    >
                      Flip board
                    </Button>
                  </div>

                  <div className="app-pane-note empty-state p-3 text-sm text-[var(--color-muted)]">
                    Drag pieces, or tap and click to move. For keyboard play, focus a
                    square, move with the arrow keys, and press Enter or Space to
                    confirm a move.
                  </div>

                  <div className="app-meta-strip">
                    <div className="app-meta-card">
                      <strong>{activeMode === "ai" ? "Engine" : "Local"}</strong>
                      <span>{activeMode === "ai" ? "Worker-backed opponent" : "Hot-seat table"}</span>
                    </div>
                    <div className="app-meta-card">
                      <strong>{gameState.turn === "w" ? "White" : "Black"}</strong>
                      <span>side to move</span>
                    </div>
                    <div className="app-meta-card">
                      <strong>{gameState.history.length}</strong>
                      <span>plies recorded</span>
                    </div>
                  </div>
                </>
              ) : null}

              {isLiveActive ? (
                <>
                  <div className="app-toolbar">
                    <div className="min-w-0">
                      <p className="section-kicker">Room</p>
                      <p className="mt-2 font-mono text-sm text-[var(--color-muted)]">
                        {roomId}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button compact onClick={handleCopyInvite} type="button" variant="secondary">
                        {copyState === "copied" ? "Copied" : "Copy invite"}
                      </Button>
                      <Button compact onClick={handleLeaveLiveRoom} type="button" variant="ghost">
                        Leave room
                      </Button>
                      <Button
                        compact
                        onClick={gameState.actions.flipBoard}
                        type="button"
                        variant="ghost"
                      >
                        Flip board
                      </Button>
                    </div>
                  </div>

                  <div className="app-meta-strip">
                    <div className="app-meta-card">
                      <strong>{live.assignedColor ? (live.assignedColor === "w" ? "White" : "Black") : "Seat"}</strong>
                      <span>{live.assignedColor ? "your current color" : "awaiting assignment"}</span>
                    </div>
                    <div className="app-meta-card">
                      <strong>{live.status}</strong>
                      <span>realtime connection</span>
                    </div>
                    <div className="app-meta-card">
                      <strong>{live.presence.length}</strong>
                      <span>players connected</span>
                    </div>
                  </div>

                  <div className="app-pane-note">
                    <p>
                      You are <span className="font-semibold text-[var(--color-text)]">{live.userLabel}</span>
                      {live.assignedColor
                        ? `, playing ${live.assignedColor === "w" ? "White" : "Black"}`
                        : ", waiting for a seat"}.
                    </p>
                    {isPriorityLane ? (
                      <p className="mt-2 text-sm">{PREMIUM_LIVE_LABEL} is active for this room.</p>
                    ) : null}
                    {!live.canMove && live.status === "ready" && !gameState.isGameOver ? (
                      <p className="mt-2 text-sm">
                        {live.assignedColor
                          ? "Wait for your turn. The board remains locked while the other side moves."
                          : "Seat assignment is still in progress. Share the room and wait for both players to connect."}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </Panel>

          <div className="grid gap-4">
            <Panel className="panel-rise" heading={currentSetupTitle} kicker="Mode Setup">
              <div className="grid gap-4">
                <div className="app-pane-note">
                  <p>{currentSetupSummary}</p>
                </div>

                {selectedMode === null ? (
                  <div className="grid gap-3 text-sm text-[var(--color-muted)]">
                    <p>Local unlocks immediately after you start the table.</p>
                    <p>Engine mode requires a difficulty before the board opens.</p>
                    <p>Real-player mode requires a room to be created or joined before moves are allowed.</p>
                  </div>
                ) : null}

                {selectedMode === "local" ? (
                  <div className="grid gap-3">
                    <p className="text-sm text-[var(--color-muted)]">
                      Hot-seat play uses the same authoritative chess state as every other mode, but no network or engine session is required.
                    </p>
                    <div>
                      <Button onClick={handleStartLocal} type="button">
                        {isLocalActive ? "Restart local match" : "Start local match"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {selectedMode === "ai" ? (
                  <div className="grid gap-4">
                    <div>
                      <p className="section-kicker">Engine Difficulty</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {difficultyOptions.map((option) => (
                          <Button
                            key={option}
                            compact
                            onClick={() => setDifficulty(option)}
                            type="button"
                            variant={difficulty === option ? "primary" : "ghost"}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="app-pane-note">
                      <p>You play White. Stockfish takes Black and the board unlocks after the match starts.</p>
                    </div>
                    <div>
                      <Button onClick={handleStartAi} type="button">
                        {isAiActive ? "Restart engine match" : "Start engine match"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {selectedMode === "live" && !roomId ? (
                  <div className="grid gap-4">
                    {profile?.tier === "pro" ? (
                      <div className="app-pane-note">
                        <p className="font-semibold uppercase text-[var(--color-text)]">
                          {PREMIUM_LIVE_LABEL}
                        </p>
                        <p className="mt-2 text-sm">
                          Pro rooms keep the priority lane marker attached to the invite and room state.
                        </p>
                      </div>
                    ) : (
                      <div className="app-pane-note border-[var(--color-warning)]">
                        <p className="text-sm">
                          Free accounts can play with real people too. Pro only adds the priority invite lane.
                        </p>
                        <div className="mt-3">
                          <Link to="/upgrade">
                            <Button compact type="button" variant="secondary">
                              See Pro
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={!isConfigured}
                        onClick={() => handleCreateRoom()}
                        type="button"
                      >
                        Create room
                      </Button>
                      {profile?.tier === "pro" ? (
                        <Button
                          disabled={!isConfigured}
                          onClick={() => handleCreateRoom("pro")}
                          type="button"
                          variant="secondary"
                        >
                          Create priority room
                        </Button>
                      ) : null}
                    </div>

                    <label className="grid gap-2">
                      <span className="section-kicker">Room Code</span>
                      <TextField
                        onChange={(event) => setJoinId(event.target.value)}
                        placeholder="Paste room id"
                        value={joinId}
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={!joinId.trim()}
                        onClick={handleJoinRoom}
                        type="button"
                        variant="secondary"
                      >
                        Join room
                      </Button>
                    </div>

                    {!isConfigured ? (
                      <p className="text-sm text-[var(--color-warning)]">
                        Live rooms are not available in this environment yet.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {selectedMode === "live" && roomId ? (
                  <div className="grid gap-3 text-sm text-[var(--color-muted)]">
                    <p>
                      Connection:{" "}
                      <span className="font-semibold uppercase text-[var(--color-text)]">
                        {live.status}
                      </span>
                    </p>
                    <p>
                      Snapshot record:{" "}
                      <span className="font-semibold text-[var(--color-text)]">
                        {live.liveRecord ? live.liveRecord.status : "not persisted yet"}
                      </span>
                    </p>
                    <p>
                      Rated status:{" "}
                      <span className="font-semibold text-[var(--color-text)]">
                        {live.isRatedMatch ? live.ratingStatus : "unrated"}
                      </span>
                    </p>
                    {live.error ? (
                      <p className="text-[var(--color-danger)]">{live.error}</p>
                    ) : null}
                    {!sessionUser ? (
                      <p>Guests can join and play. Signed-in users also get final live games saved to history.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Panel>

            {activeMode === "ai" ? (
              <Panel className="panel-rise" heading="Engine Rail" kicker="Stockfish 17.1">
                <div className="grid gap-3">
                  <div className="app-pane-note">
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
                  <div className="app-pane-note">
                    <p className="section-kicker">Engine Read</p>
                    <div className="mt-2 grid gap-2 text-sm text-[var(--color-muted)]">
                      <p>
                        This is the engine's current evaluation while it searches. Stronger players may use it as a signal, but it remains optional context.
                      </p>
                      <p>
                        Depth:{" "}
                        <span className="font-semibold text-[var(--color-text)]">
                          {ai.engineInfo?.depth ?? "Waiting"}
                        </span>
                      </p>
                      <p>
                        Position:{" "}
                        <span className="font-semibold text-[var(--color-text)]">
                          {typeof ai.engineInfo?.mateIn === "number"
                            ? `Mate ${ai.engineInfo.mateIn}`
                            : typeof ai.engineInfo?.scoreCp === "number"
                              ? `${(ai.engineInfo.scoreCp / 100).toFixed(2)}`
                              : "No read yet"}
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

            {activeMode === "live" ? (
              <Panel className="panel-rise" heading="Seats" kicker="Room Presence">
                <div className="grid gap-3">
                  {live.presence.length === 0 ? (
                    <p className="empty-state p-3 text-sm text-[var(--color-muted)]">
                      Waiting for players to connect.
                    </p>
                  ) : (
                    live.presence.map((seat) => (
                      <div key={seat.presenceKey} className="app-pane-note">
                        <p className="text-lg font-semibold uppercase">
                          {seat.color === "w" ? "White" : "Black"}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">{seat.name}</p>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            ) : null}

            {activeMode !== null ? (
              <>
                <Panel className="panel-rise" heading="Status Rail" kicker="Shared Utilities">
                  <GameStatus
                    checkSquare={gameState.checkSquare}
                    isGameOver={gameState.isGameOver}
                    result={gameState.result}
                    turn={gameState.turn}
                  />
                </Panel>
                <Panel className="panel-rise" heading="Material Ledger" kicker="Capture Tracking">
                  <CapturedPieces capturedPieces={gameState.capturedPieces} />
                </Panel>
              </>
            ) : null}
          </div>
        </div>

        <Panel className="panel-rise" heading="Move Review" kicker={activeMode ? "Match Ledger" : "Ledger Idle"}>
          <div className="grid gap-4">
            {activeMode === null ? (
              <div className="app-pane-note">
                <p>
                  The move ledger, save actions, and post-game notes appear once you start a local match, engine match, or real-player room.
                </p>
              </div>
            ) : null}

            {gameState.isGameOver && activeMode !== "live" ? (
              <div className="app-pane-note">
                {status === "authenticated" ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      disabled={saveState === "saving" || saveState === "saved"}
                      onClick={() => void handleSaveGame()}
                      type="button"
                      variant={saveState === "saved" ? "secondary" : "primary"}
                    >
                      {saveState === "saving"
                        ? "Saving"
                        : saveState === "saved"
                          ? "Saved"
                          : "Save again"}
                    </Button>
                    <p className="text-sm text-[var(--color-muted)]">
                      Finished local and AI games save to your review history automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2 text-sm text-[var(--color-muted)]">
                    <p>Sign in to save finished games to your review history.</p>
                    {isConfigured ? null : (
                      <p>Saved history is not available in this environment yet.</p>
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

            {activeMode !== null ? <MoveList moves={gameState.history} /> : null}
          </div>
        </Panel>
      </div>

      {activeMode !== null && gameState.isGameOver ? (
        <div className="result-rail fixed inset-x-4 bottom-4 max-[1024px]:!bottom-20 z-10 mx-auto max-w-2xl border-2 border-[var(--color-border-strong)] bg-[var(--color-accent)] p-4 text-[var(--color-accent-foreground)] shadow-[8px_8px_0_rgba(0,0,0,0.2)] max-[1024px]:!sm:bottom-4">
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
                {activeMode === "live"
                  ? "Leave the room or share another invite for the next round."
                  : "Reset for another round or head into review once that flow is connected."}
              </p>
            </div>
            <div className="flex gap-3">
              {activeMode === "live" ? (
                <Button
                  variant="secondary"
                  onClick={handleLeaveLiveRoom}
                  type="button"
                >
                  Exit room
                </Button>
              ) : (
                <Button
                  onClick={handleReset}
                  variant="secondary"
                  type="button"
                >
                  Run it back
                </Button>
              )}
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
