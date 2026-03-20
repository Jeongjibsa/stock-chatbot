export type HealthStatus = "ok" | "degraded";

export type HealthCheckResponse = {
  checks: {
    database: boolean;
    redis: boolean;
  };
  environment: string;
  service: string;
  status: HealthStatus;
  uptimeSeconds: number;
};
