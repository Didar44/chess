import { useState } from "react";
import { useAuth } from "@/features/auth/model/auth-context";
import { useLeaderboard } from "@/features/leaderboard/model/useLeaderboard";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";

export function LeaderboardPage() {
  const { isConfigured, profile } = useAuth();
  const [cityFilter, setCityFilter] = useState("");
  const leaderboard = useLeaderboard(cityFilter, isConfigured);

  if (!isConfigured) {
    return (
      <div className="grid gap-4">
        <PageIntro
          kicker="Leaderboard"
          title="Standings need Supabase configuration."
          summary="Add the Supabase environment variables first, then ratings and city standings can load from real player profiles."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PageIntro
        kicker="Leaderboard"
        title="Club standings, globally or by city."
        summary="Rated live games update these numbers. Filter the table by city to compare your local field against the wider board."
      />
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Panel heading="Filters" kicker="Standings View">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="section-kicker">City Filter</span>
              <select
                className="min-h-12 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 outline-none transition-colors focus:border-[var(--color-accent)]"
                onChange={(event) => setCityFilter(event.target.value)}
                value={cityFilter}
              >
                <option value="">Global standings</option>
                {leaderboard.cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            {profile?.city ? (
              <div className="flex flex-wrap gap-3">
                <Button compact onClick={() => setCityFilter(profile.city)} type="button">
                  Use my city
                </Button>
                {cityFilter ? (
                  <Button
                    compact
                    onClick={() => setCityFilter("")}
                    type="button"
                    variant="secondary"
                  >
                    Clear filter
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-muted)]">
              <p>
                {cityFilter
                  ? `Showing players from ${cityFilter}.`
                  : "Showing all rated players across every city."}
              </p>
              {profile ? (
                <p className="mt-2">
                  Your current rating is{" "}
                  <span className="font-semibold text-[var(--color-text)]">
                    {profile.rating}
                  </span>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel heading="Standings" kicker={cityFilter ? "City Board" : "Global Board"}>
          {leaderboard.loading ? (
            <p className="text-sm text-[var(--color-muted)]">Loading standings…</p>
          ) : null}
          {leaderboard.error ? (
            <p className="text-sm text-[var(--color-danger)]">{leaderboard.error}</p>
          ) : null}
          {!leaderboard.loading && leaderboard.players.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              No rated players found for this filter yet.
            </p>
          ) : null}
          <div className="overflow-auto border border-[var(--color-border)]">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[var(--color-panel-strong)]">
                <tr className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Rank</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Player</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">City</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Rating</th>
                  <th className="border-b border-[var(--color-border)] px-3 py-2">Tier</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.players.map((row, index) => (
                  <tr
                    key={row.id}
                    className={
                      profile?.id === row.id
                        ? "bg-[var(--color-accent-soft)]"
                        : "odd:bg-[var(--color-accent-soft)]/40"
                    }
                  >
                    <td className="border-b border-[var(--color-border)] px-3 py-3 font-mono">
                      {index + 1}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 font-semibold uppercase">
                      {row.displayName}
                      {profile?.id === row.id ? (
                        <span className="ml-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3">
                      {row.city || "Unknown"}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 font-mono">
                      {row.rating}
                    </td>
                    <td className="border-b border-[var(--color-border)] px-3 py-3 uppercase">
                      {row.tier}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
