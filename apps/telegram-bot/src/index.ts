import { fileURLToPath } from "node:url";
import { Bot } from "grammy";
import {
  buildMockTelegramReportPreview,
  StaticInstrumentResolver
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  PortfolioHoldingRepository,
  UserMarketWatchItemRepository,
  UserRepository
} from "@stock-chatbot/database";

import {
  advanceConversation,
  createInitialConversationState,
  getConversationStartMessage,
  InMemoryConversationStateStore
} from "./conversation-state.js";
import { loadTelegramBotEnv } from "./load-env.js";
import {
  buildGroupRegistrationReminder,
  buildNewMemberWelcomeMessage,
  extractNewlyJoinedMemberName,
  GroupRegistrationReminderStore,
  isGroupChat
} from "./onboarding.js";
import { readToken } from "./token.js";
import { TelegramUserPortfolioService } from "./user-portfolio-service.js";

loadTelegramBotEnv();

const DEFAULT_DATABASE_URL = "postgresql://stockbot:stockbot@localhost:5432/stockbot";

async function main(): Promise<void> {
  const token = readToken();

  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is missing. Skipping bot startup.");
    process.exit(1);
  }

  const bot = new Bot(token);
  const conversationStateStore = new InMemoryConversationStateStore();
  const groupRegistrationReminderStore = new GroupRegistrationReminderStore();
  const instrumentResolver = new StaticInstrumentResolver();
  const pool = createPool(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL);
  const db = createDatabase(pool);
  const userPortfolioService = new TelegramUserPortfolioService({
    userRepository: new UserRepository(db),
    portfolioHoldingRepository: new PortfolioHoldingRepository(db),
    userMarketWatchRepository: new UserMarketWatchItemRepository(db)
  });

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
      await reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    const registeredUser = await userPortfolioService.findRegisteredUser(userKey);

    if (!registeredUser) {
      await reply("먼저 /register 를 실행해 계정을 등록해 주세요.");
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
        "/register",
        "/help",
        "/portfolio_add",
        "/portfolio_list",
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
        "/register",
        "/portfolio_add",
        "/portfolio_list",
        "/portfolio_remove",
        "/market_add",
        "/market_items",
        "/mock_report"
      ].join("\n")
    );
  });

  bot.command("register", async (context) => {
    if (!context.from || !context.chat) {
      await context.reply("사용자 또는 채팅 정보를 확인하지 못했습니다.");
      return;
    }

    const displayName = [context.from.first_name, context.from.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || context.from.username || "Telegram User";
    const registerInput: {
      chatId: string;
      chatType: string;
      displayName: string;
      languageCode?: string;
      telegramUserId: string;
    } = {
      telegramUserId: String(context.from.id),
      displayName,
      chatId: String(context.chat.id),
      chatType: context.chat.type
    };

    if (context.from.language_code) {
      registerInput.languageCode = context.from.language_code;
    }

    const result = await userPortfolioService.registerTelegramUser(registerInput);

    if (result.deliveryMode === "private_ready") {
      await context.reply(
        "등록이 완료되었습니다. 앞으로 개인화 리포트는 이 1:1 대화로 발송됩니다."
      );
      return;
    }

    await context.reply(
      "계정 등록은 완료되었습니다. 개인정보 보호를 위해 개인화 리포트는 봇과 1:1 대화에서 /register 를 다시 실행하신 뒤 발송됩니다."
    );
  });

  bot.command("portfolio_add", async (context) =>
    startConversation(context.from?.id, "portfolio_add", (text) => context.reply(text))
  );

  bot.command("portfolio_list", async (context) => {
    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    try {
      const holdings = await userPortfolioService.listPortfolioHoldings(userKey);

      if (holdings.length === 0) {
        await context.reply("현재 등록된 보유 종목이 없습니다. /portfolio_add 로 추가해 주세요.");
        return;
      }

      await context.reply(
        [
          "현재 등록된 보유 종목입니다.",
          ...holdings.map((holding) => {
            const details = [
              holding.quantity ? `수량 ${holding.quantity}` : null,
              holding.avgPrice ? `평단 ${holding.avgPrice}` : null
            ].filter(Boolean);

            return `- ${holding.companyName} (${holding.symbol}, ${holding.exchange})${details.length > 0 ? ` · ${details.join(" / ")}` : ""}`;
          })
        ].join("\n")
      );
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  });

  bot.command("portfolio_remove", async (context) =>
    startConversation(context.from?.id, "portfolio_remove", (text) =>
      context.reply(text)
    )
  );

  bot.command("market_add", async (context) =>
    startConversation(context.from?.id, "market_add", (text) => context.reply(text))
  );

  bot.command("market_items", async (context) => {
    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    try {
      const items = await userPortfolioService.listMarketIndicators(userKey);

      await context.reply(
        [
          "현재 추적 중인 시장 지표입니다.",
          ...items.map((item) => `- ${item.itemName} (${item.itemCode})${item.isDefault ? "" : " · custom"}`)
        ].join("\n")
      );
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  });

  bot.command("mock_report", async (context) => {
    await context.reply(buildMockTelegramReportPreview().renderedText);
  });

  bot.on("message:new_chat_members", async (context) => {
    if (!isGroupChat(context.chat.type)) {
      return;
    }

    const memberNames = context.message.new_chat_members
      .filter((member) => !member.is_bot)
      .map((member) =>
        [member.first_name, member.last_name].filter(Boolean).join(" ").trim() ||
        member.username ||
        "새 사용자"
      );

    if (memberNames.length === 0) {
      return;
    }

    await context.reply(buildNewMemberWelcomeMessage(memberNames));
  });

  bot.on("chat_member", async (context) => {
    const chatMemberUpdate = context.update.chat_member;

    if (!chatMemberUpdate || !isGroupChat(chatMemberUpdate.chat.type)) {
      return;
    }

    const joinedMemberName = extractNewlyJoinedMemberName({
      oldStatus: chatMemberUpdate.old_chat_member.status,
      newStatus: chatMemberUpdate.new_chat_member.status,
      user: chatMemberUpdate.new_chat_member.user
    });

    if (!joinedMemberName) {
      return;
    }

    await context.reply(buildNewMemberWelcomeMessage([joinedMemberName]));
  });

  bot.on("message:text", async (context) => {
    const text = context.message.text.trim();

    if (text.startsWith("/")) {
      return;
    }

    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    const state = conversationStateStore.get(userKey);

    if (!state) {
      if (isGroupChat(context.chat.type)) {
        const registeredUser = await userPortfolioService.findRegisteredUser(userKey);

        if (
          !registeredUser &&
          groupRegistrationReminderStore.shouldRemind(
            userKey,
            String(context.chat.id)
          )
        ) {
          await context.reply(buildGroupRegistrationReminder());
        }
      }

      return;
    }

    const transition = advanceConversation(state, text, instrumentResolver);

    if (transition.status === "completed") {
      conversationStateStore.clear(userKey);

      try {
        switch (transition.completion.command) {
          case "portfolio_add":
            await userPortfolioService.addPortfolioHolding(
              userKey,
              transition.completion.draft
            );
            await context.reply(
              `${transition.completion.draft.companyName} 보유 종목을 저장했습니다.`
            );
            break;
          case "portfolio_remove": {
            const removed = await userPortfolioService.removePortfolioHolding(
              userKey,
              transition.completion.resolution
            );
            await context.reply(
              removed
                ? `${transition.completion.resolution.companyName} 보유 종목을 삭제했습니다.`
                : `${transition.completion.resolution.companyName} 종목은 현재 등록되어 있지 않습니다.`
            );
            break;
          }
          case "market_add":
            await userPortfolioService.addMarketIndicator(
              userKey,
              transition.completion.resolution
            );
            await context.reply(
              `${transition.completion.resolution.itemName} 지표를 추적 항목에 반영했습니다.`
            );
            break;
        }
      } catch (error) {
        await context.reply(resolveTelegramCommandError(error));
      }

      return;
    }

    conversationStateStore.set(userKey, transition.nextState);
    await context.reply(transition.message);
  });

  const shutdown = async () => {
    bot.stop();
    await pool.end();
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());

  await bot.start({
    allowed_updates: [
      "message",
      "chat_member",
      "my_chat_member"
    ]
  });
}

function resolveTelegramCommandError(error: unknown): string {
  if (error instanceof Error && error.message === "USER_NOT_REGISTERED") {
    return "먼저 /register 를 실행해 계정을 등록해 주세요.";
  }

  return "요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
