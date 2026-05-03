import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/shared/lib/cn";

type Props = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    heading?: string;
    kicker?: string;
  }
>;

export function Panel({ children, className, heading, kicker, ...props }: Props) {
  return (
    <section
      className={cn("app-panel section-card p-4 sm:p-5", className)}
      {...props}
    >
      {(heading || kicker) && (
        <header className="mb-4 border-b border-[var(--color-border)] pb-3">
          {kicker ? <p className="section-kicker">{kicker}</p> : null}
          {heading ? (
            <h2 className="mt-2 text-3xl font-semibold uppercase leading-none sm:text-4xl">
              {heading}
            </h2>
          ) : null}
        </header>
      )}
      {children}
    </section>
  );
}
