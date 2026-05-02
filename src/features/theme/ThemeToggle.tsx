import { useTheme } from "@/app/providers/theme-context";
import { Button } from "@/shared/ui/Button";

export function ThemeToggle() {
  const { cycleTheme, resolvedTheme, theme } = useTheme();

  return (
    <Button
      aria-label={`Cycle theme mode. Current setting ${theme}, resolved ${resolvedTheme}`}
      className="justify-between gap-3 self-start"
      compact
      variant="secondary"
      onClick={cycleTheme}
      type="button"
    >
      <span>Theme</span>
      <span className="font-mono text-[10px]">{resolvedTheme}</span>
    </Button>
  );
}
