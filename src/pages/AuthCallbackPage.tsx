import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/model/auth-context";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";

function readAuthHashError() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);

  return {
    code: params.get("error_code"),
    description: params.get("error_description"),
  };
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { error, sessionUser, status } = useAuth();
  const hashError = useMemo(
    () =>
      typeof window === "undefined"
        ? { code: null, description: null }
        : readAuthHashError(),
    [],
  );

  useEffect(() => {
    if (status === "authenticated" && sessionUser) {
      navigate("/profile", { replace: true });
    }
  }, [navigate, sessionUser, status]);

  const activeError = hashError.description ?? error;

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-4 py-4 text-[var(--color-text)] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[960px] gap-6">
        <PageIntro
          kicker="Account Confirmation"
          title={activeError ? "Email confirmation needs attention." : "Finishing your sign-in."}
          summary={
            activeError
              ? "Your confirmation link returned, but the browser hit a sign-in problem."
              : "If the link is valid, the browser session should appear here and continue into your account."
          }
        />
        <Panel heading="Sign-In Return" kicker="Confirmation Link">
          <div className="grid gap-4">
            {activeError ? (
              <div className="app-pane-note border-[var(--color-danger)] text-sm">
                <p className="font-semibold text-[var(--color-danger)]">
                  {hashError.code ?? "auth_callback_error"}
                </p>
                <p className="mt-2">{activeError}</p>
              </div>
            ) : (
              <div className="app-pane-note text-sm">
                <p>Waiting for your sign-in to finish.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Link to="/auth">
                <Button type="button">Back to auth</Button>
              </Link>
              <Link to="/">
                <Button type="button" variant="secondary">
                  Back to landing
                </Button>
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
