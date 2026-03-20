type Environment = Record<string, string | undefined>;

export function readToken(env: Environment = process.env): string | null {
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token || token === "replace-me") {
    return null;
  }

  return token;
}
