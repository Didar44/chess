import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChessBoard } from "@/entities/game/ui/ChessBoard";
import { CapturedPieces } from "@/entities/game/ui/CapturedPieces";
import { GameStatus } from "@/entities/game/ui/GameStatus";
import { MoveList } from "@/entities/game/ui/MoveList";
import { PromotionDialog } from "@/entities/game/ui/PromotionDialog";
import { useLocalChessGame } from "@/entities/game/model/useLocalChessGame";
import { useAuth } from "@/features/auth/model/auth-context";
import { PREMIUM_LIVE_LABEL } from "@/features/entitlements/lib/limits";
import { createLiveGameId } from "@/features/live/lib/live-game";
import { useLiveGame } from "@/features/live/model/useLiveGame";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";
import { TextField } from "@/shared/ui/TextField";

export function LiveGamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConfigured, profile, sessionUser } = useAuth();
  const [joinId, setJoinId] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const gameState = useLocalChessGame();
  const live = useLiveGame(gameId ?? null, gameState);
  const isPriorityLane = searchParams.get("lane") === "pro";

  if (!gameId) {
    return (
      <div className="page-enter grid gap-4">
        <PageIntro
          kicker="Live Lobby"
          title="Create a room or join one from a shared link."
          summary="Live play uses a room URL, Supabase Realtime presence for seat assignment, and broadcast sync for move delivery and reconnect recovery."
        />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Panel className="panel-rise" heading="Create Match" kicker="New Room">
            <div className="grid gap-4">
              <p className="text-sm text-[var(--color-muted)]">
                Start a live room, copy the link, and send it to the second player.
                The first two connected players are seated White and Black.
              </p>
              {profile?.tier === "pro" ? (
                <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-muted)]">
                  <p className="font-semibold uppercase text-[var(--color-text)]">
                    {PREMIUM_LIVE_LABEL}
                  </p>
                  <p className="mt-2">
                    Pro rooms carry a premium marker so your invite and room state both reflect priority entry.
                  </p>
                </div>
              ) : (
                <div className="border border-[var(--color-warning)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-muted)]">
                  <p>Free accounts can play live, but Pro unlocks the priority invite lane.</p>
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
                  onClick={() => {
                    navigate(`/live/${createLiveGameId()}`);
                  }}
                  type="button"
                >
                  Create live room
                </Button>
                {profile?.tier === "pro" ? (
                  <Button
                    disabled={!isConfigured}
                    onClick={() => {
                      navigate(`/live/${createLiveGameId()}?lane=pro`);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Create priority room
                  </Button>
                ) : null}
                {!isConfigured ? (
                  <p className="text-sm text-[var(--color-warning)]">
                    Add Supabase env vars to activate live play.
                  </p>
                ) : null}
              </div>
            </div>
          </Panel>

          <Panel className="panel-rise" heading="Join Match" kicker="Existing Room">
            <div className="grid gap-4">
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
                  onClick={() => navigate(`/live/${joinId.trim()}`)}
                  type="button"
                  variant="secondary"
                >
                  Join room
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-enter grid gap-4">
        <PageIntro
          kicker="Live Match"
          title="Shared board, live seats, and reconnect-safe snapshots."
          summary="The room URL is the join surface. Presence assigns colors, broadcasts deliver moves, and a shared record keeps the latest snapshot recoverable."
        />

        <div className="page-grid">
          <Panel className="panel-rise" heading="Live Board" kicker="Shared Surface">
            <div className="grid gap-4">
              <div className="grid gap-3 border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                <p className="section-kicker">Room</p>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-mono text-sm text-[var(--color-muted)]">
                    {gameId}
                  </p>
                  <Button
                    compact
                    onClick={() => {
                      const inviteUrl = window.location.href;

                      if (!inviteUrl) {
                        return;
                      }

                      void navigator.clipboard.writeText(inviteUrl).then(() => {
                        setCopyState("copied");
                        window.setTimeout(() => setCopyState("idle"), 1500);
                      });
                    }}
                    type="button"
                    variant="secondary"
                  >
                    {copyState === "copied" ? "Copied" : "Copy invite"}
                  </Button>
                  <Link to="/live">
                    <Button compact type="button" variant="ghost">
                      New room
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-[var(--color-muted)]">
                  You are <span className="font-semibold text-[var(--color-text)]">{live.userLabel}</span>
                  {live.assignedColor
                    ? `, playing ${live.assignedColor === "w" ? "White" : "Black"}`
                    : ", waiting for a seat"}.
                </p>
                {isPriorityLane ? (
                  <p className="text-sm text-[var(--color-muted)]">
                    {PREMIUM_LIVE_LABEL} is active for this room.
                  </p>
                ) : null}
              </div>

              {!live.canMove && live.status === "ready" && !gameState.isGameOver ? (
                <div className="empty-state p-3 text-sm text-[var(--color-muted)]">
                  {live.assignedColor
                    ? "Wait for your turn. The board locks while the other side moves."
                    : "Seat assignment is still in progress. Share the link and wait for both players to connect."}
                </div>
              ) : null}

              <ChessBoard
                disabled={live.status !== "ready" || !live.canMove}
                gameState={gameState}
              />
            </div>
          </Panel>

          <div className="grid gap-4">
            <Panel className="panel-rise" heading="Room Status" kicker="Realtime">
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
            </Panel>

            <Panel className="panel-rise" heading="Seats" kicker="Presence">
              <div className="grid gap-3">
                {live.presence.length === 0 ? (
                  <p className="empty-state p-3 text-sm text-[var(--color-muted)]">Waiting for players to connect.</p>
                ) : (
                  live.presence.map((seat) => (
                    <div
                      key={seat.presenceKey}
                      className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3"
                    >
                      <p className="text-lg font-semibold uppercase">
                        {seat.color === "w" ? "White" : "Black"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{seat.name}</p>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel className="panel-rise" heading="Move Ledger" kicker="Synced Sequence">
            <MoveList moves={gameState.history} />
          </Panel>
          <div className="grid gap-4">
            <Panel className="panel-rise" heading="Match Status" kicker="Shared State">
              <GameStatus
                checkSquare={gameState.checkSquare}
                isGameOver={gameState.isGameOver}
                pgn={gameState.pgn}
                result={gameState.result}
                turn={gameState.turn}
              />
            </Panel>
            <Panel className="panel-rise" heading="Material Ledger" kicker="Captured Pieces">
              <CapturedPieces capturedPieces={gameState.capturedPieces} />
            </Panel>
          </div>
        </div>
      </div>

      <PromotionDialog
        pendingPromotion={gameState.pendingPromotion}
        onCancel={gameState.actions.cancelPromotion}
        onConfirm={gameState.actions.confirmPromotion}
      />
    </>
  );
}
