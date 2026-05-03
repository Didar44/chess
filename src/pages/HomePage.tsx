import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import logo from "@/assets/logo.svg";
import heroImage from "@/assets/landing/hero.png";
import boardRoomImage from "@/assets/landing/Board_Room_Section.png";
import analysisImage from "@/assets/landing/Analysis.png";


const specCards = [
  {
    title: "Board-first play",
    text: "Local games open immediately with legal moves, promotion flow, capture tracking, and match status kept in one calm surface.",
    tone: "accent",
  },
  {
    title: "Clear review",
    text: "Move history, captured pieces, and post-game analysis stay readable instead of getting buried behind dashboard noise.",
    tone: "neutral",
  },
  {
    title: "Built for clubs",
    text: "Accounts extend the room into saved history, ratings, live tables, and player identity without changing the board-first rhythm.",
    tone: "secondary",
  },
] as const;

const modeCards = [
  {
    name: "Guest",
    detail: "Fast local board for over-the-board sessions, teaching positions, and instant rematches.",
    cta: "Open board",
    link: "/play",
    featured: false,
  },
  {
    name: "Member",
    detail: "Saved history, profile identity, review continuity, and a cleaner path into live rooms and rating progress.",
    cta: "Create account",
    link: "/auth",
    featured: true,
  },
  {
    name: "Club",
    detail: "Best for regular players who want standings, coach-assisted review, and a stable place for recurring sessions.",
    cta: "See leaderboard",
    link: "/leaderboard",
    featured: false,
  },
] as const;

const notes = [
  {
    title: "For fast sessions",
    text: "Set up a board, make the first move, and stay focused on play instead of wrestling a crowded interface.",
  },
  {
    title: "For review habits",
    text: "Run back through the moves after the game and catch tactical misses while the position is still fresh.",
  },
] as const;

const tickerItems = [
  "local board",
  "engine sparring",
  "move review",
  "captured pieces",
  "club ladder",
  "live rooms",
] as const;

export function HomePage() {
  return (
    <div className="landing-shell min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        <header className="landing-topbar page-enter">
          <div className="flex items-center">
            <img alt="Boardline logo" className="auth-brand__mark" src={logo} />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--color-muted)]">
                Boardline Chess
              </p>
              <p className="text-sm uppercase tracking-[0.18em] text-[var(--color-text)]">
                Match Room
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)] lg:flex">
            <a href="#formats">Formats</a>
            <a href="#analysis">Analysis</a>
            <a href="#plans">Modes</a>
          </nav>
          <div className="flex flex-wrap gap-2">
            <Link to="/auth">
              <Button compact variant="secondary">
                Sign in
              </Button>
            </Link>
            <Link to="/play">
              <Button compact>Play now</Button>
            </Link>
          </div>
        </header>

        <section className="landing-hero page-enter">
          <div className="landing-hero-copy">
            <p className="section-kicker">Stable board. Fast rematch.</p>
            <h1 className="landing-hero-title">
              Chess that feels
              <span className="text-[var(--color-accent)]"> sharp on move one.</span>
            </h1>
            <p className="max-w-2xl text-lg text-[var(--color-muted)] sm:text-xl">
              Boardline keeps the board central, the room readable, and the next
              review step obvious whether you are running a local game, testing ideas
              against the engine, or moving into club play.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/play">
                <Button>Start local game</Button>
              </Link>
              <Link to="/auth">
                <Button variant="secondary">Create account</Button>
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="landing-mini-stat">
                <span>100%</span>
                <p>legal move validation</p>
              </div>
              <div className="landing-mini-stat">
                <span>8x8</span>
                <p>board-first layout</p>
              </div>
              <div className="landing-mini-stat">
                <span>1 tap</span>
                <p>into the next game</p>
              </div>
            </div>
          </div>

          <div className="landing-hero-visual panel-rise">
            <img
              src={heroImage}
              alt="Editorial chess artwork showing a tilted board with key pieces and match-note style annotations."
              className="landing-image"
            />
          </div>
        </section>

        <section className="landing-ticker panel-rise" aria-label="Boardline features">
          <div className="landing-ticker-track">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </section>

        <section id="formats" className="landing-section page-enter">
          <div className="landing-heading">
            <span className="landing-heading-bar" aria-hidden="true" />
            <div>
              <h2>Match Specs</h2>
              <p>Everything important stays close to the board.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {specCards.map((card) => (
              <article
                key={card.title}
                className={`landing-spec-card landing-spec-card--${card.tone} panel-rise`}
              >
                <div className="landing-spec-icon" aria-hidden="true">
                  {card.title.charAt(0)}
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="analysis" className="landing-story-grid page-enter">
          <article className="landing-copy-block">
            <span className="landing-label">The Board Room</span>
            <p>
              The main view is built to behave like a real table: large board,
              clear move rail, visible captures, and only the controls you need
              while the clock is effectively your own concentration.
            </p>
          </article>
          <div className="landing-media-block landing-media-block--board panel-rise">
            <img
              src={boardRoomImage}
              alt="Board-first chess room artwork with a central board and restrained match-side details."
              className="landing-image"
            />
          </div>

          <div className="landing-media-block landing-media-block--analysis panel-rise">
            <img
              src={analysisImage}
              alt="Chess review artwork with analysis cards, highlighted squares, and post-game study motifs."
              className="landing-image"
            />
          </div>
          <article className="landing-copy-block">
            <span className="landing-label">After The Game</span>
            <p>
              Review is treated as part of playing, not a separate dashboard. Move
              list, engine guidance, and saved history line up so players can
              understand the position they actually reached.
            </p>
          </article>
        </section>

        <section className="landing-metrics page-enter">
          <div>
            <strong>3 modes</strong>
            <span>guest, member, club</span>
          </div>
          <div>
            <strong>1 board</strong>
            <span>kept visually central</span>
          </div>
          <div>
            <strong>Live next</strong>
            <span>rooms and ratings ready</span>
          </div>
          <div>
            <strong>Any screen</strong>
            <span>mobile and desktop usable</span>
          </div>
        </section>

        <section className="landing-section page-enter">
          <div className="landing-heading landing-heading--center">
            <div>
              <h2>Player Notes</h2>
              <p>Why the room stays useful beyond a single game.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {notes.map((note, index) => (
              <article key={note.title} className={`landing-note-card landing-note-card--${index}`}>
                <p>{note.text}</p>
                <div className="landing-note-meta">
                  <span className="landing-note-chip" aria-hidden="true" />
                  <div>
                    <strong>{note.title}</strong>
                    <span>boardline workflow</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="plans" className="landing-section page-enter">
          <div className="landing-heading landing-heading--center">
            <div>
              <h2>Choose Your Line</h2>
              <p>Start with the board you need now and grow into the rest.</p>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {modeCards.map((card) => (
              <article
                key={card.name}
                className={`landing-plan-card ${card.featured ? "is-featured" : ""}`}
              >
                <div>
                  <p className="section-kicker">{card.featured ? "Recommended" : "Mode"}</p>
                  <h3>{card.name}</h3>
                </div>
                <p>{card.detail}</p>
                <Link to={card.link}>
                  <Button variant={card.featured ? "primary" : "secondary"} className="w-full">
                    {card.cta}
                  </Button>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta page-enter">
          <div>
            <h2>Enter the next position.</h2>
            <p>
              Open a board, sign in for continuity, or move straight into the
              leaderboard if you already know how you want to compete.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/play">
              <Button>Play now</Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="secondary">View standings</Button>
            </Link>
          </div>
        </section>

        <footer className="landing-footer">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--color-accent)]">
              Boardline Chess
            </p>
            <p className="mt-3 max-w-sm text-sm text-[var(--color-muted)]">
              Built for players who want the board to stay central before, during,
              and after the game.
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            <Link to="/play">Local board</Link>
            <Link to="/review">Review</Link>
            <Link to="/upgrade">Upgrade</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
