import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/features/auth/model/auth-context";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";

export function AuthPage() {
  const navigate = useNavigate();
  const { error, isConfigured, sessionUser, signIn, signUp, status } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (status === "authenticated" && sessionUser) {
      navigate("/play", { replace: true });
    }
  }, [navigate, sessionUser, status]);

  const handleSubmit = async (mode: "sign-in" | "sign-up") => {
    setFormError(null);
    setSignupMessage(null);
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
        setSignupMessage(
          "Account created! You can now sign in.",
        );
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
    <div className="auth-stage min-h-screen px-4 py-5 text-[var(--color-text)] sm:px-6 lg:px-8">
      <div className="auth-layout mx-auto justify-center">
        <header className="auth-brand panel-rise">
          <Link className="auth-brand__link" to="/">
            <img alt="Boardline logo" className="auth-brand__mark" src={logo} />
            <span className="auth-brand__copy">
              <strong>Boardline</strong>
              <span>Chess club access</span>
            </span>
          </Link>
        </header>

        <section className="auth-card auth-card--single panel-rise min-w-[475px] max-[520px]:min-w-0">
          <div className="auth-card__header">
            <h1>{mode === "sign-in" ? "Return to your board." : "Join the club room."}</h1>
            <p>
              {mode === "sign-in"
                ? "Sign in with your email and password, or switch to create a player account."
                : "Create your player account with email, password, display name, and city."}
            </p>
          </div>

          <div className="auth-card__body">
            <div className="auth-form-wrap">
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit(mode);
                }}
              >
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
                    placeholder="Enter or create password"
                    type="password"
                    value={password}
                  />
                </label>

                {mode === "sign-up" ? (
                  <>
                    <label className="grid gap-2">
                      <span className="section-kicker">Display Name</span>
                      <TextField
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Used when you create an account"
                        value={displayName}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="section-kicker">City</span>
                      <TextField
                        onChange={(event) => setCity(event.target.value)}
                        placeholder="Required for account creation"
                        value={city}
                      />
                    </label>
                  </>
                ) : null}

                {formError || error ? (
                  <p className="text-sm text-[var(--color-danger)]">
                    {formError ?? error}
                  </p>
                ) : null}
                {signupMessage ? (
                  <p className="text-sm text-[var(--color-success)]">{signupMessage}</p>
                ) : null}
              </form>

              <div className="auth-actions">
                <Button
                  className="w-full"
                  disabled={!isConfigured || isSubmitting}
                  onClick={() => void handleSubmit(mode)}
                  type="button"
                >
                  {isSubmitting ? "Submitting" : mode === "sign-in" ? "Sign in" : "Create account"}
                </Button>
                <div className="auth-guest-group">
                  <Link to="/play">
                    <Button className="w-full" type="button" variant="ghost">
                      Continue as guest
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
          <div className="text-center text-[16px] tracking-[0.24em] text-[var(--color-muted)]">
            {mode === "sign-in" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              className="font-semibold text-[var(--color-text)] underline-offset-4 underline hover:no-underline"
              onClick={() => {
                setFormError(null);
                setSignupMessage(null);
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              }}
              type="button"
            >
              {mode === "sign-in" ? "Sign up" : "Sign in"}
            </button>
          </div>
      </div>
    </div>
  );
}
