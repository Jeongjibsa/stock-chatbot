type Environment = Record<string, string | undefined>;

export function isAuthorizedTelegramWebhookRequest(
  request: Request,
  env: Environment = process.env
): boolean {
  const secret = env.TELEGRAM_WEBHOOK_SECRET_TOKEN;

  if (!secret) {
    return true;
  }

  return (
    request.headers.get("x-telegram-bot-api-secret-token") === secret
  );
}
