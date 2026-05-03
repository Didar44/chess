import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { PageIntro } from "@/shared/ui/PageIntro";
import { Panel } from "@/shared/ui/Panel";

export function RouteErrorPage() {
  const error = useRouteError();

  let title = "Something broke on this route.";
  let summary = "The app hit an unexpected error while trying to render this page.";
  let detail = "Try going back to the landing page or reopening the last action.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    summary = "The route responded, but not with a usable page.";
    detail =
      typeof error.data === "string"
        ? error.data
        : "The requested page could not be completed.";
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] px-4 py-4 text-[var(--color-text)] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[960px] gap-6">
        <PageIntro
          kicker="Route Error"
          title={title}
          summary={summary}
        />
        <Panel heading="What Happened" kicker="Recovery">
          <div className="grid gap-4">
            <div className="app-pane-note border-[var(--color-danger)] text-sm">
              <p>{detail}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/">
                <Button type="button">Back to landing</Button>
              </Link>
              <Link to="/play">
                <Button type="button" variant="secondary">
                  Open play room
                </Button>
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
