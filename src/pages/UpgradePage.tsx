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
      setError("Accept the mock checkout terms to continue.");
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
        summary="This is a prototype checkout, but the entitlement is real inside the app: Pro changes history, coaching, and live-room behavior immediately on your profile."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel heading="Upgrade Flow" kicker="Mock Checkout">
          <div className="grid gap-4">
            {status !== "authenticated" || !sessionUser ? (
              <div className="grid gap-3">
                <p className="text-sm text-[var(--color-muted)]">
                  Sign in first so the prototype can attach Pro to a real player profile.
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
                <div className="border border-[var(--color-success)] bg-[var(--color-panel)] p-4">
                  <p className="section-kicker text-[var(--color-success)]">Pro Active</p>
                  <p className="mt-2 text-2xl font-semibold uppercase">Boardline Pro is live.</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Your account now gets the deeper prototype archive, unlimited coach analysis, and the priority live-room lane.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/review">
                    <Button type="button">Open review</Button>
                  </Link>
                  <Link to="/live">
                    <Button type="button" variant="secondary">Enter live rooms</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            {profile?.tier !== "pro" && step === "offer" ? (
              <div className="grid gap-4">
                <div className="border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 shadow-[6px_6px_0_var(--color-shadow)]">
                  <p className="section-kicker">Annual Club Pass</p>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-semibold uppercase leading-none">$24</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">Prototype price · charged nowhere</p>
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
                <div className="border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                  <p className="section-kicker">Payment Method</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Mock Visa ending in 6408 · instant prototype activation.
                  </p>
                </div>
                <label className="flex items-start gap-3 border border-[var(--color-border)] bg-[var(--color-panel)] p-4 text-sm text-[var(--color-muted)]">
                  <input
                    checked={acceptedTerms}
                    className="mt-1"
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    I understand this is a prototype checkout and only my local app entitlement changes.
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

        <Panel heading="What Changes" kicker="Entitlements">
          <div className="grid gap-3 text-sm text-[var(--color-muted)]">
            <p>Free archive: latest {FREE_HISTORY_LIMIT} games.</p>
            <p>Free coaching: {FREE_ANALYSIS_LIMIT} saved-game analyses.</p>
            <p>Pro archive: deeper review history and no coach credit cap.</p>
            <p>Live rooms: Pro unlocks the {PREMIUM_LIVE_LABEL.toLowerCase()}.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
