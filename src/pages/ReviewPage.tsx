import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/model/auth-context";
import { FREE_ANALYSIS_LIMIT } from "@/features/coach/lib/coach";
import { useCoachAnalysis } from "@/features/coach/model/useCoachAnalysis";
import { getHistoryLimitForTier } from "@/features/entitlements/lib/limits";
import { useGameReview } from "@/features/history/model/useGameReview";
import { usePersistedGames } from "@/features/history/model/usePersistedGames";
import { ReviewBoard } from "@/features/history/ui/ReviewBoard";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";

export function ReviewPage() {
  const { isConfigured, profile, sessionUser, status } = useAuth();
  const historyLimit = getHistoryLimitForTier(profile?.tier);
  const { error, games, loading, refresh, totalCount } = usePersistedGames(
    sessionUser?.id ?? null,
    historyLimit,
  );
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) ?? games[0] ?? null,
    [games, selectedGameId],
  );
  const review = useGameReview(selectedGame);
  const coach = useCoachAnalysis(selectedGame);
  const hiddenGameCount = Math.max(totalCount - games.length, 0);

  if (!isConfigured) {
    return (
      <div className="grid gap-4">
        <PageIntro
          kicker="Review"
          title="Saved review is not available yet."
          summary="Finish account and storage setup for this environment, then completed matches will appear here automatically."
        />
      </div>
    );
  }

  if (status !== "authenticated" || !sessionUser) {
    return (
      <div className="grid gap-4">
        <PageIntro
          kicker="Review"
          title="Sign in to review saved match history."
          summary="Guests can play immediately, but saved history and move-by-move review are tied to your account."
        />
        <Panel heading="Account Required" kicker="Saved History">
          <div className="flex flex-wrap gap-3">
            <Link to="/auth">
              <Button>Sign in</Button>
            </Link>
            <Link to="/play">
              <Button variant="secondary">Back to play</Button>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PageIntro
        kicker="Review"
        title="Saved games, replayed move by move."
        summary="Choose a stored match, step through the move list, and inspect the board state at any point."
      />
      <div className="app-section-grid">
        <Panel heading="Saved Games" kicker="History">
          <div className="grid gap-3">
            {profile?.tier !== "pro" ? (
              <div className="app-pane-note text-sm">
                <p>
                  Free accounts can open the latest {historyLimit} saved games and use{" "}
                  {FREE_ANALYSIS_LIMIT} coach runs.
                </p>
                <div className="mt-3">
                  <Link to="/upgrade">
                    <Button compact type="button">Upgrade to Pro</Button>
                  </Link>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button compact onClick={() => void refresh()} type="button" variant="secondary">
                Refresh
              </Button>
            </div>
            {loading ? (
              <p className="text-sm text-[var(--color-muted)]">Loading saved matches…</p>
            ) : null}
            {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
            {games.length === 0 && !loading ? (
              <p className="text-sm text-[var(--color-muted)]">
                No saved games yet. Finish a match in the play room and save it to history.
              </p>
            ) : null}
            {hiddenGameCount > 0 && profile?.tier !== "pro" ? (
              <div className="app-pane-note border-[var(--color-warning)] text-sm">
                <p>
                  {hiddenGameCount} older game{hiddenGameCount === 1 ? "" : "s"} are outside the free archive.
                </p>
                <div className="mt-3">
                  <Link to="/upgrade">
                    <Button compact type="button" variant="secondary">
                      Unlock deeper archive
                    </Button>
                  </Link>
                </div>
              </div>
            ) : null}
            <div className="scroll-rail-lg grid gap-3 pr-1">
              {games.map((game) => (
                <button
                  key={game.id}
                  className="border-2 border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-panel)_96%,white)] p-3 text-left shadow-[4px_4px_0_var(--color-shadow)] transition-colors hover:bg-[var(--color-accent-soft)]"
                  onClick={() => {
                    setCopyState("idle");
                    setSelectedGameId(game.id);
                    review.reset();
                  }}
                  type="button"
                >
                  <p className="text-lg font-semibold uppercase">{game.summary}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {new Date(game.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {game.mode.toUpperCase()} · {game.moveCount} plies · {game.result}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel className="order-2" heading="Coach Analysis" kicker="Gemini Review">
            {selectedGame ? (
              <div className="grid gap-4">
                {!coach.isConfigured ? (
                  <p className="text-sm text-[var(--color-warning)]">
                    Coach analysis is not available in this environment yet.
                  </p>
                ) : null}
                <div className="app-pane-note text-sm">
                  {coach.hasUnlimitedCredits ? (
                    <p>Pro account: unlimited analysis credits.</p>
                  ) : (
                    <p>
                      Free coach credits remaining: {coach.remainingFreeCredits} / {FREE_ANALYSIS_LIMIT}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={!coach.canAnalyze || coach.loading}
                    onClick={() => void coach.generate()}
                    type="button"
                  >
                    {coach.loading
                      ? "Analyzing"
                      : coach.analysis
                        ? "Refresh analysis"
                        : "Analyze game"}
                  </Button>
                  {!coach.hasUnlimitedCredits && coach.remainingFreeCredits === 0 ? (
                    <Link to="/upgrade">
                      <Button type="button" variant="secondary">
                        Upgrade for more
                      </Button>
                    </Link>
                  ) : null}
                </div>
                {coach.error ? (
                  <p className="text-sm text-[var(--color-danger)]">{coach.error}</p>
                ) : null}
                {coach.analysis ? (
                  <div className="grid gap-4">
                    <div className="app-pane-note">
                      <p className="section-kicker">Summary</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        {coach.analysis.summary}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="app-pane-note">
                        <p className="section-kicker">Strongest Idea</p>
                        <p className="mt-2 text-sm text-[var(--color-muted)]">
                          {coach.analysis.strongestIdea}
                        </p>
                      </div>
                      <div className="app-pane-note">
                        <p className="section-kicker">Weakest Pattern</p>
                        <p className="mt-2 text-sm text-[var(--color-muted)]">
                          {coach.analysis.weakestPattern}
                        </p>
                      </div>
                    </div>
                    <div className="scroll-rail-lg grid gap-3 pr-1">
                      {coach.analysis.keyMoments.map((moment) => (
                        <div
                          key={`${moment.ply}-${moment.move}-${moment.title}`}
                          className="app-pane-note"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-lg font-semibold uppercase">{moment.title}</p>
                            <button
                              className="font-mono text-xs text-[var(--color-muted)] underline-offset-4 hover:underline"
                              onClick={() => review.jumpTo(moment.ply)}
                              type="button"
                            >
                              Ply {moment.ply} · {moment.move}
                            </button>
                          </div>
                          <p className="mt-2 text-sm text-[var(--color-muted)]">
                            {moment.whyItMatters}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">
                            {moment.advice}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-muted)]">
                    Run coach analysis on the selected saved game to get 3 to 5 practical key moments.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Choose a saved game first, then run coach analysis.
              </p>
            )}
          </Panel>

          <Panel className="order-1" heading="Board Review" kicker="Move Playback">
            {selectedGame && review.review ? (
              <div className="grid gap-4">
                <ReviewBoard fen={review.review.currentFen} />
                <div className="flex flex-wrap gap-3">
                  <Button
                    compact
                    disabled={review.review.isAtStart}
                    onClick={review.stepBackward}
                    type="button"
                    variant="secondary"
                  >
                    Previous
                  </Button>
                  <Button
                    compact
                    disabled={review.review.isAtEnd}
                    onClick={review.stepForward}
                    type="button"
                  >
                    Next
                  </Button>
                  <span className="flex items-center text-sm text-[var(--color-muted)]">
                    Ply {review.review.ply} / {review.review.totalPlies}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Select a saved game from the history rail to start replaying moves.
              </p>
            )}
          </Panel>

          <Panel className="order-3" heading="Move Ledger" kicker="Selected Sequence">
            {selectedGame && review.review ? (
              <div className="grid gap-3">
                <div className="app-toolbar items-center justify-between text-sm text-[var(--color-muted)]">
                  <p>
                    Move list is the main review surface. PGN stays available as an export format for sharing or external analysis.
                  </p>
                  <Button
                    compact
                    onClick={() => {
                      void navigator.clipboard.writeText(selectedGame.pgn).then(() => {
                        setCopyState("copied");
                        window.setTimeout(() => setCopyState("idle"), 1500);
                      });
                    }}
                    type="button"
                    variant="secondary"
                  >
                    {copyState === "copied" ? "PGN copied" : "Copy PGN"}
                  </Button>
                </div>
                <div className="scroll-rail-md border-2 border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-surface)_96%,white)] shadow-[4px_4px_0_var(--color-shadow)]">
                  <ol className="grid">
                    {review.review.history.map((move, index) => (
                      <li key={`${move.from}-${move.to}-${index}`}>
                        <button
                          className="flex w-full items-center justify-between border-b border-[var(--color-border)] px-3 py-2 text-left hover:bg-[var(--color-accent-soft)]"
                          onClick={() => review.jumpTo(index + 1)}
                          type="button"
                        >
                          <span className="font-semibold">{index + 1}. {move.san}</span>
                          <span className="font-mono text-xs text-[var(--color-muted)]">
                            {move.from} → {move.to}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
