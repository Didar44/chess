import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    compact?: boolean;
  }
>;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--color-border-strong)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
  secondary:
    "border-[var(--color-border-strong)] bg-[var(--color-panel-strong)] text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]",
  ghost:
    "border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]",
  danger:
    "border-[var(--color-danger)] bg-[var(--color-danger)] text-[#fff4f1] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
};

export function Button({
  children,
  className,
  variant = "primary",
  compact = false,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center border text-sm font-semibold uppercase tracking-[0.12em] shadow-[4px_4px_0_var(--color-shadow)] transition-all duration-[160ms] touch-manipulation focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55",
        compact ? "min-h-10 px-3 py-2" : "min-h-11 px-4 py-3",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
