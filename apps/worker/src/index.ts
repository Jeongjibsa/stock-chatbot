import "dotenv/config";

import { fileURLToPath } from "node:url";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  DAILY_REPORT_JOB_NAME,
  REPORT_QUEUE_NAME,
  type DailyReportPayload
} from "@stock-chatbot/application";

type Environment = Record<string, string | undefined>;

import { buildDailyReportJobProcessor } from "./process-daily-report.js";
import { getWorkerReadyMessage, scheduleDailyReportJob } from "./scheduler.js";

export function readRedisUrl(env: Environment = process.env): string {
  return env.REDIS_URL ?? "redis://localhost:6379";
}

async function main(): Promise<void> {
  const redisUrl = readRedisUrl();
  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null
  });
  const queue = new Queue(REPORT_QUEUE_NAME, {
    connection
  });
  const processDailyReport = buildDailyReportJobProcessor();
  const worker = new Worker(
    REPORT_QUEUE_NAME,
    async (job) => {
      console.log(`[worker] processing ${job.name}`, {
        id: job.id,
        data: job.data
      });

      if (job.name !== DAILY_REPORT_JOB_NAME) {
        throw new Error(`Unsupported job name: ${job.name}`);
      }

      return processDailyReport();
    },
    {
      connection
    }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] completed ${job.name}`, { id: job.id });
  });

  worker.on("failed", (job, error) => {
    console.error(`[worker] failed ${job?.name ?? "unknown"}`, {
      error,
      id: job?.id
    });
  });

  await scheduleDailyReportJob(queue);

  console.log(getWorkerReadyMessage());

  if (process.env.NODE_ENV !== "production") {
    await queue.add(
      DAILY_REPORT_JOB_NAME,
      {
        source: "bootstrap"
      } satisfies DailyReportPayload,
      {
        removeOnComplete: 50,
        removeOnFail: 50
      }
    );
  }

  const shutdown = async (signal: string) => {
    console.log(`[worker] shutting down (${signal})`);
    await worker.close();
    await queue.close();
    connection.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
