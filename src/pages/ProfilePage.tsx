import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/model/auth-context";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";
import { TextField } from "@/shared/ui/TextField";

export function ProfilePage() {
  const { isConfigured, profile, sessionUser, signOut, status, updateProfile } =
    useAuth();
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isConfigured) {
    return (
      <div className="grid gap-4">
        <PageIntro
          kicker="Profile"
          title="Profile tools are not available yet."
          summary="Finish account setup for this environment, then profile changes and saved history will be available here."
        />
      </div>
    );
  }

  if (status !== "authenticated" || !sessionUser) {
    return (
      <div className="grid gap-4">
        <PageIntro
          kicker="Profile"
          title="Sign in to edit your player identity."
          summary="Your profile stores your display name, required city, and account access across standings and saved review."
        />
        <Panel heading="Account Required" kicker="Guest State">
          <div className="flex flex-wrap gap-3">
            <Link to="/auth">
              <Button>Open auth</Button>
            </Link>
            <Link to="/play">
              <Button variant="secondary">Keep playing as guest</Button>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PageIntro
        kicker="Profile"
        title="Keep your chess identity clean and consistent."
        summary="Display name and city are editable here. City is required for leaderboard filters and local standings."
      />
      <div className="app-section-grid">
        <Panel heading="Player Details" kicker="Editable Profile">
          <form
            key={`${profile?.id ?? "guest"}:${profile?.updatedAt ?? ""}:${profile?.city ?? ""}`}
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setSavedMessage(null);
              setError(null);
              setIsSubmitting(true);
              const formData = new FormData(event.currentTarget);
              const nextDisplayName = String(formData.get("display_name") ?? "");
              const nextCity = String(formData.get("city") ?? "");

              if (!nextCity.trim()) {
                setError("City is required.");
                setIsSubmitting(false);
                return;
              }

              updateProfile({
                city: nextCity.trim(),
                displayName: nextDisplayName.trim() || "Boardline Player",
              })
                .then(() => {
                  setSavedMessage("Profile updated.");
                })
                .catch((nextError: unknown) => {
                  setError(
                    nextError instanceof Error
                      ? nextError.message
                      : "Profile update failed.",
                  );
                })
                .finally(() => {
                  setIsSubmitting(false);
                });
            }}
          >
            <label className="grid gap-2">
              <span className="section-kicker">Email</span>
              <TextField disabled value={sessionUser.email ?? ""} />
            </label>
            <label className="grid gap-2">
              <span className="section-kicker">Display Name</span>
              <TextField defaultValue={profile?.displayName ?? ""} name="display_name" />
            </label>
            <label className="grid gap-2">
              <span className="section-kicker">City</span>
              <TextField defaultValue={profile?.city ?? ""} name="city" placeholder="Required" />
            </label>
            {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
            {savedMessage ? (
              <p className="text-sm text-[var(--color-success)]">{savedMessage}</p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving" : "Save profile"}
              </Button>
              <Button
                onClick={() => {
                  void signOut();
                }}
                type="button"
                variant="ghost"
              >
                Sign out
              </Button>
            </div>
          </form>
        </Panel>

        <Panel heading="Account Status" kicker="Current Profile">
          <div className="grid gap-4">
            <div className="app-meta-strip">
              <div className="app-meta-card">
                <strong>{profile?.rating ?? 1200}</strong>
                <span>current rating</span>
              </div>
              <div className="app-meta-card">
                <strong>{profile?.tier ?? "free"}</strong>
                <span>membership tier</span>
              </div>
              <div className="app-meta-card">
                <strong>{profile?.city || "Missing"}</strong>
                <span>city card</span>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-[var(--color-muted)]">
              <p>Your profile connects local standings, saved review, and account access.</p>
              <p>Keep city accurate so leaderboard filters and regional comparisons stay useful.</p>
            </div>
          </div>
          {profile?.tier !== "pro" ? (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <p className="text-sm text-[var(--color-muted)]">
                Upgrade to unlock a deeper archive, unlimited coach runs, and priority live-room entry.
              </p>
              <div className="mt-3">
                <Link to="/upgrade">
                  <Button type="button">Upgrade to Pro</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-muted)]">
              <p>Pro is active on this account.</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
