type Environment = Record<string, string | undefined>;

export function isAuthorizedCronRequest(
  request: Request,
  env: Environment = process.env
): boolean {
  const secret = env.CRON_SECRET;

  if (!secret) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}
