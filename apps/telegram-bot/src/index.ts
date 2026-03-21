import { fileURLToPath } from "node:url";
import { loadTelegramBotEnv } from "./load-env.js";
import { buildTelegramBotApp, TELEGRAM_ALLOWED_UPDATES } from "./build-bot.js";
import { readToken } from "./token.js";

loadTelegramBotEnv();

async function main(): Promise<void> {
  const token = readToken();

  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is missing. Skipping bot startup.");
    process.exit(1);
  }

  const app = buildTelegramBotApp(token);

  process.once("SIGINT", () => void app.close());
  process.once("SIGTERM", () => void app.close());

  await app.bot.start({
    allowed_updates: [...TELEGRAM_ALLOWED_UPDATES]
  });
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
