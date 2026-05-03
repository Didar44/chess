type Props = {
  kicker: string;
  title: string;
  summary: string;
};

export function PageIntro({ kicker, title, summary }: Props) {
  return (
    <div className="app-intro section-card p-4 sm:p-5">
      <div className="min-w-0">
        <p className="section-kicker">{kicker}</p>
        <h2 className="mt-3 max-w-4xl text-4xl font-semibold uppercase leading-[0.92] sm:text-5xl">
          {title}
        </h2>
      </div>
      <p className="mt-4 max-w-3xl text-base text-[var(--color-muted)] sm:text-lg">
        {summary}
      </p>
    </div>
  );
}
