import { Link, NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { cn } from "@/shared/lib/cn";

const navItems = [
  { to: "/play", label: "Play" },
  { to: "/live", label: "Live" },
  { to: "/review", label: "Review" },
  { to: "/leaderboard", label: "Ranks" },
  { to: "/profile", label: "Profile" },
  { to: "/upgrade", label: "Pro" },
];

function ShellFrame() {
  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--color-accent-fade),transparent_28%),linear-gradient(180deg,transparent,rgba(0,0,0,0.02))]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="border-2 border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-4 shadow-[8px_8px_0_var(--color-shadow)] sm:px-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <Link
                  className="inline-flex font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--color-muted)]"
                  to="/"
                >
                  Boardline Chess
                </Link>
                <div>
                  <h1 className="max-w-4xl text-4xl font-semibold uppercase leading-[0.9] sm:text-5xl lg:text-7xl">
                    Play live. Train hard. Review clearly.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-[var(--color-muted)] sm:text-base">
                    A focused chess room for local games, online matches, and
                    post-game improvement without dashboard clutter.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="border border-[var(--color-border)] px-3 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition-colors duration-[160ms] hover:bg-[var(--color-accent-soft)]"
                  to="/auth"
                >
                  Sign in
                </Link>
                <ThemeToggle />
              </div>
            </div>

            <nav className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4 lg:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    cn(
                      "border px-3 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition-colors duration-[160ms]",
                      isActive
                        ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                        : "border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent-soft)]",
                    )
                  }
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden border-2 border-[var(--color-border-strong)] bg-[var(--color-panel)] p-3 shadow-[6px_6px_0_var(--color-shadow)] lg:block">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">
                Play Areas
              </p>
            </div>
            <nav className="mt-3 grid gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    cn(
                      "border px-3 py-3 text-left transition-colors duration-[160ms]",
                      isActive
                        ? "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                        : "border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent-soft)]",
                    )
                  }
                  to={item.to}
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.12em]">
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="grid min-h-[60vh] gap-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  return <ShellFrame />;
}
