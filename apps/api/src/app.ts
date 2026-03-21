import Fastify from "fastify";

import {
  buildMockTelegramReportPreview,
  MockTelegramDeliveryAdapter,
  toLatestReportView,
  toReportHistoryItem,
  type LatestReportView,
  type ReportHistoryItem
} from "@stock-chatbot/application";

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
  getLatestReportView?: (userId: string) => Promise<LatestReportView | null>;
  listReportHistory?: (userId: string) => Promise<ReportHistoryItem[]>;
  mockTelegramPreview?: () => Promise<{
    deliveryId: string;
    previewText: string;
    recipientId: string;
    status: "mocked" | "sent";
    transport: "mock" | "provider";
  }>;
};

export function buildApp(dependencies: HealthCheckDependencies) {
  const server = Fastify({
    logger: true
  });
  const defaultLatestReport = toLatestReportView({
    id: "mock-run-latest",
    promptVersion: "daily-report/v1",
    reportText: buildMockTelegramReportPreview().renderedText,
    runDate: "2026-03-21",
    scheduleType: "daily-9am",
    skillVersion: "daily-report-orchestrator/v1",
    status: "completed"
  });
  const defaultHistory = [
    defaultLatestReport.historyItem,
    toReportHistoryItem({
      id: "mock-run-previous",
      promptVersion: "daily-report/v1",
      reportText:
        "🗞️ 오늘의 브리핑 (2026-03-20 기준)\n\n📌 한 줄 요약\n시장 지표 1개와 보유 종목 1개 기준으로 정리했습니다.",
      runDate: "2026-03-20",
      scheduleType: "daily-9am",
      skillVersion: "daily-report-orchestrator/v1",
      status: "partial_success"
    })
  ];
  const defaultMockTelegramPreview = async () =>
    new MockTelegramDeliveryAdapter({
      deliveryIdFactory: () => "mock-telegram-preview"
    }).deliver({
      channel: "telegram",
      recipientId: "mock-user",
      renderedText: buildMockTelegramReportPreview().renderedText
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

  server.get("/v1/reports/:userId/latest", async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const latestReport =
      (await dependencies.getLatestReportView?.(userId)) ?? defaultLatestReport;

    if (!latestReport) {
      return reply.status(404).send({
        message: "latest report not found"
      });
    }

    return latestReport;
  });

  server.get("/v1/reports/:userId/history", async (request) => {
    const { userId } = request.params as { userId: string };

    return (await dependencies.listReportHistory?.(userId)) ?? defaultHistory;
  });

  server.get("/v1/mock/telegram/daily-report", async () => {
    return (
      (await dependencies.mockTelegramPreview?.()) ?? (await defaultMockTelegramPreview())
    );
  });

  return server;
}
