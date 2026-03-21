type Environment = Record<string, string | undefined>;

export function isTelegramWebhookSecretRequired(
  env: Environment = process.env
): boolean {
  return env.VERCEL_ENV === "production";
}

export function hasTelegramWebhookSecret(
  env: Environment = process.env
): boolean {
  return Boolean(env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim());
}

export function isAuthorizedTelegramWebhookRequest(
  request: Request,
  env: Environment = process.env
): boolean {
  const secret = env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim();
  const headerSecret = request.headers
    .get("x-telegram-bot-api-secret-token")
    ?.trim();

  if (!secret) {
    return !isTelegramWebhookSecretRequired(env);
  }

  return headerSecret === secret;
}
