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
          title="Saved review needs Supabase configuration."
          summary="Set the Supabase environment variables first, then the app can store completed matches and reload them here."
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
          summary="Guests can play immediately, but history and move-by-move review are tied to a real account."
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
      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Panel heading="Saved Games" kicker="History">
          <div className="grid gap-3">
            {profile?.tier !== "pro" ? (
              <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-muted)]">
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
              <div className="border border-[var(--color-warning)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-muted)]">
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
            {games.map((game) => (
              <button
                key={game.id}
                className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-left transition-colors hover:bg-[var(--color-accent-soft)]"
                onClick={() => {
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
        </Panel>

        <div className="grid gap-4">
          <Panel heading="Coach Analysis" kicker="Gemini Review">
            {selectedGame ? (
              <div className="grid gap-4">
                {!coach.isConfigured ? (
                  <p className="text-sm text-[var(--color-warning)]">
                    Add `VITE_GEMINI_API_KEY` to activate post-game coaching.
                  </p>
                ) : null}
                <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-muted)]">
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
                    <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                      <p className="section-kicker">Summary</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        {coach.analysis.summary}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                        <p className="section-kicker">Strongest Idea</p>
                        <p className="mt-2 text-sm text-[var(--color-muted)]">
                          {coach.analysis.strongestIdea}
                        </p>
                      </div>
                      <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
                        <p className="section-kicker">Weakest Pattern</p>
                        <p className="mt-2 text-sm text-[var(--color-muted)]">
                          {coach.analysis.weakestPattern}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {coach.analysis.keyMoments.map((moment) => (
                        <div
                          key={`${moment.ply}-${moment.move}-${moment.title}`}
                          className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3"
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

          <Panel heading="Board Review" kicker="Move Playback">
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

          <Panel heading="Move Ledger" kicker="Selected Sequence">
            {selectedGame && review.review ? (
              <div className="grid gap-3">
                <div className="max-h-[360px] overflow-auto border border-[var(--color-border)]">
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
                <pre className="overflow-auto whitespace-pre-wrap border border-[var(--color-border)] bg-[var(--color-panel)] p-3 font-mono text-xs text-[var(--color-muted)]">
                  {selectedGame.pgn}
                </pre>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
