import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/model/auth-context";
import { Button } from "@/shared/ui/Button";
import { Panel } from "@/shared/ui/Panel";
import { TextField } from "@/shared/ui/TextField";

type FormMode = "sign-in" | "sign-up";

export function AuthPage() {
  const { error, isConfigured, signIn, signUp, status } = useAuth();
  const [mode, setMode] = useState<FormMode>("sign-in");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");

  const handleSubmit = async () => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (mode === "sign-in") {
        await signIn({ email, password });
      } else {
        if (!city.trim()) {
          throw new Error("City is required to create an account.");
        }

        await signUp({
          city: city.trim(),
          displayName: displayName.trim() || email.split("@")[0] || "Boardline Player",
          email,
          password,
        });
      }
    } catch (nextError) {
      setFormError(
        nextError instanceof Error ? nextError.message : "Auth request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-4 py-4 text-[var(--color-text)] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)]">
        <section className="section-card panel-rise p-5 sm:p-6">
          <p className="section-kicker">Account Access</p>
          <h1 className="mt-3 text-5xl font-semibold uppercase leading-[0.9] sm:text-6xl">
            Sign in for saved games, live rooms, and rankings.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--color-muted)]">
            Use the public auth route to create an account or sign back in before
            entering the full app shell.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/play">
              <Button>Continue as guest</Button>
            </Link>
            <Link to="/">
              <Button variant="secondary">Back to landing</Button>
            </Link>
          </div>
          {!isConfigured ? (
            <div className="mt-6 border border-[var(--color-warning)] bg-[var(--color-panel)] p-4 text-sm text-[var(--color-muted)]">
              Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to activate email auth.
            </div>
          ) : null}
          {status === "authenticated" ? (
            <div className="mt-6 border border-[var(--color-success)] bg-[var(--color-panel)] p-4 text-sm text-[var(--color-muted)]">
              Signed in. Open your profile or review saved games from the app shell.
            </div>
          ) : null}
        </section>

        <Panel
          className="panel-rise"
          heading={mode === "sign-in" ? "Email Sign In" : "Create Account"}
          kicker="Supabase Auth"
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                compact
                onClick={() => setMode("sign-in")}
                type="button"
                variant={mode === "sign-in" ? "primary" : "ghost"}
              >
                Sign in
              </Button>
              <Button
                compact
                onClick={() => setMode("sign-up")}
                type="button"
                variant={mode === "sign-up" ? "primary" : "ghost"}
              >
                Create account
              </Button>
            </div>

            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              {mode === "sign-up" ? (
                <label className="grid gap-2">
                  <span className="section-kicker">Display Name</span>
                  <TextField
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="How your name appears"
                    value={displayName}
                  />
                </label>
              ) : null}

              <label className="grid gap-2">
                <span className="section-kicker">Email</span>
                <TextField
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                />
              </label>

              <label className="grid gap-2">
                <span className="section-kicker">Password</span>
                <TextField
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  type="password"
                  value={password}
                />
              </label>

              {mode === "sign-up" ? (
                <label className="grid gap-2">
                  <span className="section-kicker">City</span>
                  <TextField
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Required for city standings"
                    value={city}
                  />
                </label>
              ) : null}

              <p className="text-sm text-[var(--color-muted)]">
                {mode === "sign-in"
                  ? "Sign in with your email and password."
                  : "City is required when creating an account so leaderboard filters work later."}
              </p>

              {formError || error ? (
                <p className="text-sm text-[var(--color-danger)]">
                  {formError ?? error}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button disabled={!isConfigured || isSubmitting} type="submit">
                  {isSubmitting
                    ? "Submitting"
                    : mode === "sign-in"
                      ? "Continue with email"
                      : "Create account"}
                </Button>
                <Link to="/play">
                  <Button type="button" variant="ghost">
                    Skip for now
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </Panel>
      </div>
    </div>
  );
}
