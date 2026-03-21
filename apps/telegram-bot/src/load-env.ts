import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

export function loadTelegramBotEnv(): void {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    resolve(currentDir, "../../../.env"),
    resolve(currentDir, "../.env"),
    resolve(process.cwd(), ".env")
  ];

  for (const path of candidatePaths) {
    if (existsSync(path)) {
      config({
        path,
        quiet: true
      });
      return;
    }
  }

  config({
    quiet: true
  });
}
