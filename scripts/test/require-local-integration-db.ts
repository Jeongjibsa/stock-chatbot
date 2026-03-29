const DEFAULT_LOCAL_INTEGRATION_DATABASE_URL =
  "postgresql://stockbot:stockbot@127.0.0.1:5432/stockbot";

const SAFE_LOCAL_DATABASE_HOSTS = new Set(["127.0.0.1", "::1", "localhost", "postgres"]);

export function isSafeLocalIntegrationDatabaseUrl(connectionString: string): boolean {
  try {
    const parsed = new URL(connectionString);
    return SAFE_LOCAL_DATABASE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function configureIntegrationDatabaseEnv(
  env: NodeJS.ProcessEnv = process.env
): string {
  const configuredDatabaseUrl = env.DATABASE_URL?.trim();
  const databaseUrl =
    configuredDatabaseUrl && configuredDatabaseUrl.length > 0
      ? configuredDatabaseUrl
      : DEFAULT_LOCAL_INTEGRATION_DATABASE_URL;

  if (!isSafeLocalIntegrationDatabaseUrl(databaseUrl)) {
    throw new Error(
      "Refusing to run integration tests against a non-local DATABASE_URL. " +
        "Use local Docker PostgreSQL (127.0.0.1/localhost/postgres) for integration tests."
    );
  }

  env.DATABASE_URL = databaseUrl;
  env.RUN_INTEGRATION_TESTS = "1";

  return databaseUrl;
}

configureIntegrationDatabaseEnv();
