import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { useAuth } from "@/features/auth/model/auth-context";
import { cn } from "@/shared/lib/cn";
import logo from "@/assets/logo.svg";

const navItems = [
  { to: "/play", label: "Play", short: "Play" },
  { to: "/review", label: "Review", short: "Review" },
  { to: "/leaderboard", label: "Ranks", short: "Ranks" },
  { to: "/profile", label: "Profile", short: "Profile" },
  { to: "/upgrade", label: "Pro", short: "Pro" },
] as const;

const utilityCopy: Record<string, { title: string; hint: string }> = {
  "/play": {
    title: "Game Room",
    hint: "Local, engine, and live matches in one board-first workspace.",
  },
  "/review": {
    title: "Review Archive",
    hint: "Saved games, replay controls, and coach notes.",
  },
  "/leaderboard": {
    title: "Club Standings",
    hint: "Global and city-based ranking filters for club play.",
  },
  "/profile": {
    title: "Profile",
    hint: "Display name, city, and membership status.",
  },
  "/upgrade": {
    title: "Club Pass",
    hint: "Upgrade access for deeper archive and coaching features.",
  },
};

function RailIcon({ label }: { label: string }) {
  const commonProps = {
    "aria-hidden": true,
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (label) {
    case "Play":
      return (
        <svg {...commonProps}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M8.5 12h7M12 8.5v7" />
        </svg>
      );
    case "Review":
      return (
        <svg {...commonProps}>
          <path d="M6 5h12v14H6z" />
          <path d="M9 9h6M9 13h4" />
        </svg>
      );
    case "Ranks":
      return (
        <svg {...commonProps}>
          <path d="M7 18h10M8 18V9l4-3 4 3v9M12 6V4" />
        </svg>
      );
    case "Profile":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3" />
          <path d="M6 19c1.2-2.7 3.2-4 6-4s4.8 1.3 6 4" />
        </svg>
      );
    case "Pro":
      return (
        <svg {...commonProps}>
          <path d="M7 17 5 7l5 4 2-5 2 5 5-4-2 10Z" />
        </svg>
      );
    default:
      return null;
  }
}

function ShellFrame() {
  const location = useLocation();
  const { profile, sessionUser, status } = useAuth();
  const utility =
    utilityCopy[location.pathname]
    || (location.pathname.startsWith("/live/")
      ? utilityCopy["/play"]
      : {
          title: "Boardline",
          hint: "Serious chess surfaces with a board-first working rhythm.",
        });
  const accountLabel =
    profile?.displayName
    || sessionUser?.email?.split("@")[0]
    || (status === "loading" ? "Loading" : status === "authenticated" ? "Member" : "Guest");
  const accountMeta = profile?.city
    ? `${profile.city} · ${profile.tier.toUpperCase()}`
    : status === "loading"
      ? "Restoring account"
    : status === "authenticated"
      ? "Boardline member"
      : "Guest access";

  return (
    <div className="app-shell min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]">
      <div className="app-shell__texture" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-[1600px] gap-4 px-3 pb-24 pt-3 sm:px-5 lg:grid-cols-[124px_minmax(0,1fr)] lg:px-6 lg:pb-8">
        <aside className="app-shell__rail hidden lg:grid">
          <div className="grid gap-4">
            <Link className="app-shell__brand" to="/">
              <img alt="" aria-hidden="true" className="app-shell__brand-logo" src={logo} />
              <span className="app-shell__brand-copy">
                <strong>Boardline</strong>
              </span>
            </Link>
            <nav className="grid justify-items-center gap-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    cn("app-rail-link", isActive && "is-active")
                  }
                  to={item.to}
                >
                  <RailIcon label={item.label} />
                  <span>{item.short}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <div className="grid min-h-screen grid-rows-[auto_1fr] gap-4">
          <header className="app-shell__utility">
            <div className="app-shell__mobile-head lg:hidden">
              <Link className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--color-muted)]" to="/">
                Boardline Chess
              </Link>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_auto] lg:items-center">
              <div className="app-utility-search">
                <p className="app-utility-search__label">{utility.title}</p>
                <p>{utility.hint}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="app-account-chip">
                  <div className="app-account-chip__avatar" aria-hidden="true">
                    {accountLabel.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <strong>{accountLabel}</strong>
                    <span>{accountMeta}</span>
                  </div>
                </div>
                  <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="app-shell__main">
            <Outlet />
          </main>
        </div>

        <nav className="app-shell__bottom-nav lg:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => cn("app-bottom-link", isActive && "is-active")}
              to={item.to}
            >
              <RailIcon label={item.label} />
              <span>{item.short}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function AppShell() {
  return <ShellFrame />;
}
