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
    scheduleType: "daily-pre-market",
    skillVersion: "daily-report-orchestrator/v1",
    status: "completed"
  });
  const defaultHistory = [
    defaultLatestReport.historyItem,
    toReportHistoryItem({
      id: "mock-run-previous",
      promptVersion: "daily-report/v1",
      reportText:
        "1. 🗞️ 오늘의 포트폴리오 프리마켓 브리핑 (2026-03-20)\n\n2. 📌 오늘 한 줄 결론\n- 현재 확보된 데이터 기준으로는 종목별 선별 대응이 가능하며, 무리한 추격보다 포트 균형 점검이 우선입니다.",
      runDate: "2026-03-20",
      scheduleType: "daily-pre-market",
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
