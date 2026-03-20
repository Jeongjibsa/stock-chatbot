type Environment = Record<string, string | undefined>;

export type AppConfig = {
  apiHost: string;
  databaseUrl: string;
  nodeEnv: string;
  port: number;
  redisUrl: string;
};

export function readConfig(env: Environment = process.env): AppConfig {
  const port = Number.parseInt(env.PORT ?? "3000", 10);

  return {
    apiHost: env.API_HOST ?? "0.0.0.0",
    databaseUrl:
      env.DATABASE_URL ?? "postgresql://stockbot:stockbot@localhost:5432/stockbot",
    nodeEnv: env.NODE_ENV ?? "development",
    port: Number.isNaN(port) ? 3000 : port,
    redisUrl: env.REDIS_URL ?? "redis://localhost:6379"
  };
}
