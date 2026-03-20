import "dotenv/config";

import { fileURLToPath } from "node:url";
import { Bot } from "grammy";

import { readToken } from "./token.js";

async function main(): Promise<void> {
  const token = readToken();

  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is missing. Skipping bot startup.");
    process.exit(1);
  }

  const bot = new Bot(token);

  bot.command("start", async (context) => {
    await context.reply(
      [
        "stock-chatbot bot is running.",
        "Current Phase 1 bootstrap commands:",
        "/start",
        "/help"
      ].join("\n")
    );
  });

  bot.command("help", async (context) => {
    await context.reply("Daily scheduled report MVP is in bootstrap phase.");
  });

  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());

  await bot.start();
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
