import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement>;

export function TextField({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "min-h-12 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 outline-none transition-colors focus:border-[var(--color-accent)]",
        className,
      )}
      {...props}
    />
  );
}
