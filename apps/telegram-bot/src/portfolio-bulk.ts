export function parsePortfolioBulkArgument(input: string | undefined): string[] {
  const raw = String(input ?? "").trim();

  if (!raw) {
    return [];
  }

  return raw
    .split(/[\n,;]+/g)
    .map((token) => token.trim())
    .filter(Boolean);
}

