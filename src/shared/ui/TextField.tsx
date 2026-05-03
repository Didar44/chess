import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement>;

export function TextField({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "min-h-12 border-2 border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-surface)_94%,white)] px-3 text-[var(--color-text)] outline-none shadow-[4px_4px_0_var(--color-shadow)] transition-all focus:border-[var(--color-accent)] focus:shadow-[2px_2px_0_var(--color-shadow)]",
        className,
      )}
      {...props}
    />
  );
}
