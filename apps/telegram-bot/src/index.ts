import "dotenv/config";

import { fileURLToPath } from "node:url";
import { Bot } from "grammy";
import {
  buildMockTelegramReportPreview,
  StaticInstrumentResolver
} from "@stock-chatbot/application";

import {
  advanceConversation,
  createInitialConversationState,
  getConversationStartMessage,
  InMemoryConversationStateStore
} from "./conversation-state.js";
import { readToken } from "./token.js";

async function main(): Promise<void> {
  const token = readToken();

  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is missing. Skipping bot startup.");
    process.exit(1);
  }

  const bot = new Bot(token);
  const conversationStateStore = new InMemoryConversationStateStore();
  const instrumentResolver = new StaticInstrumentResolver();

  const getUserKey = (userId?: number): string | null => {
    if (!userId) {
      return null;
    }

    return String(userId);
  };

  const startConversation = async (
    userId: number | undefined,
    command: Parameters<typeof createInitialConversationState>[0],
    reply: (text: string) => Promise<unknown>
  ): Promise<void> => {
    const userKey = getUserKey(userId);

    if (!userKey) {
      await reply("사용자 식별 정보를 확인하지 못했어.");
      return;
    }

    conversationStateStore.set(userKey, createInitialConversationState(command));
    await reply(getConversationStartMessage(command));
  };

  bot.command("start", async (context) => {
    await context.reply(
      [
        "stock-chatbot bot is running.",
        "Current bootstrap commands:",
        "/start",
        "/help",
        "/portfolio_add",
        "/portfolio_remove",
        "/market_add",
        "/market_items",
        "/mock_report"
      ].join("\n")
    );
  });

  bot.command("help", async (context) => {
    await context.reply(
      [
        "지원 중인 명령:",
        "/portfolio_add",
        "/portfolio_remove",
        "/market_add",
        "/market_items",
        "/mock_report"
      ].join("\n")
    );
  });

  bot.command("portfolio_add", async (context) =>
    startConversation(context.from?.id, "portfolio_add", (text) => context.reply(text))
  );

  bot.command("portfolio_remove", async (context) =>
    startConversation(context.from?.id, "portfolio_remove", (text) =>
      context.reply(text)
    )
  );

  bot.command("market_add", async (context) =>
    startConversation(context.from?.id, "market_add", (text) => context.reply(text))
  );

  bot.command("market_items", async (context) => {
    await context.reply(
      "시장 지표 조회는 저장 계층이 준비됐고, 다음 단계에서 텔레그램 응답과 연결할 예정이야."
    );
  });

  bot.command("mock_report", async (context) => {
    await context.reply(buildMockTelegramReportPreview().renderedText);
  });

  bot.on("message:text", async (context) => {
    const text = context.message.text.trim();

    if (text.startsWith("/")) {
      return;
    }

    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했어.");
      return;
    }

    const state = conversationStateStore.get(userKey);

    if (!state) {
      return;
    }

    const transition = advanceConversation(state, text, instrumentResolver);

    if (transition.status === "completed") {
      conversationStateStore.clear(userKey);
      await context.reply(transition.message);
      return;
    }

    conversationStateStore.set(userKey, transition.nextState);
    await context.reply(transition.message);
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
