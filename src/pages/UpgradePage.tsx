import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/model/auth-context";
import { updateProfileTier } from "@/features/auth/lib/supabase";
import { FREE_ANALYSIS_LIMIT } from "@/features/coach/lib/coach";
import {
  FREE_HISTORY_LIMIT,
  PREMIUM_LIVE_LABEL,
} from "@/features/entitlements/lib/limits";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";

export function UpgradePage() {
  const { isConfigured, profile, refreshProfile, sessionUser, status } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"offer" | "checkout" | "success">("offer");
  const [submitting, setSubmitting] = useState(false);

  const activatePro = async () => {
    if (!sessionUser) {
      setError("Sign in before activating Pro.");
      return;
    }

    if (!acceptedTerms) {
      setError("Accept the checkout terms to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await updateProfileTier({ tier: "pro", userId: sessionUser.id });
      await refreshProfile();
      setStep("success");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Upgrade failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <PageIntro
        kicker="Boardline Pro"
        title="Unlock the full training and live-play pass."
        summary="Boardline Pro expands review history, coaching access, and live-room perks on your account."
      />
      <div className="app-section-grid">
        <Panel heading="Upgrade Flow" kicker="Checkout">
          <div className="grid gap-4">
            {status !== "authenticated" || !sessionUser ? (
              <div className="grid gap-3">
                <p className="text-sm text-[var(--color-muted)]">
                  Sign in first so Pro can be added to your player profile.
                </p>
                <div>
                  <Link to="/auth">
                    <Button type="button">Open auth</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            {profile?.tier === "pro" || step === "success" ? (
              <div className="grid gap-4">
                <div className="app-pane-note border-[var(--color-success)]">
                  <p className="section-kicker text-[var(--color-success)]">Pro Active</p>
                  <p className="mt-2 text-2xl font-semibold uppercase">Boardline Pro is live.</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Your account now gets deeper review history, unlimited coach analysis, and the priority live-room lane.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/review">
                    <Button type="button">Open review</Button>
                  </Link>
                  <Link to="/play?mode=live">
                    <Button type="button" variant="secondary">Open game room</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            {profile?.tier !== "pro" && step === "offer" ? (
              <div className="grid gap-4">
                <div className="app-toolbar items-end justify-between">
                  <p className="section-kicker">Annual Club Pass</p>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-semibold uppercase leading-none">$24</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">Preview access price</p>
                    </div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                      Instant unlock
                    </p>
                  </div>
                </div>
                <Button
                  disabled={!isConfigured || status !== "authenticated"}
                  onClick={() => setStep("checkout")}
                  type="button"
                >
                  Continue to checkout
                </Button>
              </div>
            ) : null}

            {profile?.tier !== "pro" && step === "checkout" ? (
              <div className="grid gap-4">
                <div className="app-pane-note">
                  <p className="section-kicker">Payment Method</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Card ending in 6408 · instant activation.
                  </p>
                </div>
                <label className="app-pane-note flex items-start gap-3 text-sm text-[var(--color-muted)]">
                  <input
                    checked={acceptedTerms}
                    className="mt-1"
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    I understand this checkout is for preview access in this environment.
                  </span>
                </label>
                {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <Button disabled={submitting} onClick={() => void activatePro()} type="button">
                    {submitting ? "Activating" : "Activate Pro"}
                  </Button>
                  <Button onClick={() => setStep("offer")} type="button" variant="ghost">
                    Back
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel heading="What Changes" kicker="Membership">
          <div className="grid gap-4">
            <div className="app-meta-strip">
              <div className="app-meta-card">
                <strong>{FREE_HISTORY_LIMIT}</strong>
                <span>free archive depth</span>
              </div>
              <div className="app-meta-card">
                <strong>{FREE_ANALYSIS_LIMIT}</strong>
                <span>free coach runs</span>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-[var(--color-muted)]">
              <p>Pro archive: deeper review history and no coach credit cap.</p>
              <p>Live rooms: Pro unlocks the {PREMIUM_LIVE_LABEL.toLowerCase()}.</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
