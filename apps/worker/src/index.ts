import "dotenv/config";

import { fileURLToPath } from "node:url";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";

const REPORT_QUEUE_NAME = "daily-report";
const DAILY_REPORT_JOB_NAME = "daily-report.run";

type DailyReportPayload = {
  source: "bootstrap" | "scheduler" | "manual";
};

type Environment = Record<string, string | undefined>;

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
  const worker = new Worker(
    REPORT_QUEUE_NAME,
    async (job) => {
      console.log(`[worker] processing ${job.name}`, {
        id: job.id,
        data: job.data
      });
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

  console.log(`[worker] ready on queue ${REPORT_QUEUE_NAME}`);

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
