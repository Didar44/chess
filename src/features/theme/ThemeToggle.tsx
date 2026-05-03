import { useTheme } from "@/app/providers/theme-context";
import { Button } from "@/shared/ui/Button";

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M20 15.2A8.5 8.5 0 1 1 8.8 4a7 7 0 0 0 11.2 11.2Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect x="3.5" y="5" width="17" height="12" rx="2" />
      <path d="M9 19h6M12 17v2" />
    </svg>
  );
}

export function ThemeToggle() {
  const { cycleTheme, resolvedTheme, theme } = useTheme();
  const icon =
    theme === "system"
      ? <SystemIcon />
      : resolvedTheme === "dark"
        ? <MoonIcon />
        : <SunIcon />;

  return (
    <Button
      aria-label={`Cycle theme mode. Current setting ${theme}, resolved ${resolvedTheme}`}
      className="h-11 w-11 self-start px-0"
      compact
      title={`Theme: ${theme}`}
      variant="secondary"
      onClick={cycleTheme}
      type="button"
    >
      {icon}
    </Button>
  );
}
