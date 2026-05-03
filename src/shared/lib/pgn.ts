const DEFAULT_PGN_TAGS = new Set([
  '[Event "?"]',
  '[Site "?"]',
  '[Date "????.??.??"]',
  '[Round "?"]',
  '[White "?"]',
  '[Black "?"]',
  '[Result "*"]',
]);

export function formatDisplayPgn(pgn: string) {
  const trimmed = pgn.trim();

  if (!trimmed) {
    return "";
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const filteredLines = lines.filter((line) => !DEFAULT_PGN_TAGS.has(line.trim()));
  const display = filteredLines.join("\n").trim();

  return display || trimmed;
}
