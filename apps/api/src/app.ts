import Fastify from "fastify";

type HealthCheckResponse = {
  checks: {
    database: boolean;
    redis: boolean;
  };
  environment: string;
  service: string;
  status: "ok" | "degraded";
  uptimeSeconds: number;
};

export type HealthCheckDependencies = {
  checkDatabase: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
  environment: string;
};

export function buildApp(dependencies: HealthCheckDependencies) {
  const server = Fastify({
    logger: true
  });

  server.get("/", async () => {
    return {
      service: "stock-chatbot-api",
      message: "Phase 1 API bootstrap is running"
    };
  });

  server.get("/healthz", async (): Promise<HealthCheckResponse> => {
    const checks = {
      database: false,
      redis: false
    };

    try {
      checks.database = await dependencies.checkDatabase();
    } catch (error) {
      server.log.error({ error }, "database health check failed");
    }

    try {
      checks.redis = await dependencies.checkRedis();
    } catch (error) {
      server.log.error({ error }, "redis health check failed");
    }

    return {
      service: "api",
      status: checks.database && checks.redis ? "ok" : "degraded",
      checks,
      environment: dependencies.environment,
      uptimeSeconds: Math.floor(process.uptime())
    };
  });

  return server;
}
