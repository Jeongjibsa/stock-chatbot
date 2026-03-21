import { Bot } from "grammy";
import {
  buildMockTelegramReportPreview,
  StaticInstrumentResolver
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  PortfolioHoldingRepository,
  TelegramConversationStateRepository,
  UserMarketWatchItemRepository,
  UserRepository
} from "@stock-chatbot/database";

import {
  advanceConversation,
  createInitialConversationState,
  getConversationStartMessage,
  type ConversationCommand,
  type ConversationStateStore,
  InMemoryConversationStateStore
} from "./conversation-state.js";
import { DbConversationStateStore } from "./db-conversation-state-store.js";
import {
  buildGroupRegisterSuccessMessage,
  buildGroupRegistrationReminder,
  buildHelpMessage,
  buildNewMemberWelcomeMessage,
  buildPrivateRegisterSuccessMessage,
  buildStartMessage,
  extractNewlyJoinedMemberName,
  GroupJoinWelcomeStore,
  GroupRegistrationReminderStore,
  isGroupChat
} from "./onboarding.js";
import {
  buildTelegramReportRuntime,
  getRunDateForTimezone
} from "./report-service.js";
import {
  formatHourMinute,
  formatReportSettings,
  parseReportTimeArgument
} from "./report-settings.js";
import { TelegramUserPortfolioService } from "./user-portfolio-service.js";

type Environment = Record<string, string | undefined>;

type TelegramBotAppOptions = {
  conversationStateStore?: ConversationStateStore;
  usePersistentConversationState?: boolean;
};

const DEFAULT_DATABASE_URL = "postgresql://stockbot:stockbot@localhost:5432/stockbot";

export const TELEGRAM_ALLOWED_UPDATES = [
  "message",
  "chat_member",
  "my_chat_member"
] as const;

export type TelegramBotApp = {
  bot: Bot;
  close: () => Promise<void>;
};

export function buildTelegramBotApp(
  token: string,
  env: Environment = process.env,
  options: TelegramBotAppOptions = {}
): TelegramBotApp {
  const bot = new Bot(token);
  const pool = createPool(env.DATABASE_URL ?? DEFAULT_DATABASE_URL);
  const db = createDatabase(pool);
  const conversationStateStore =
    options.conversationStateStore ??
    buildConversationStateStore(db, options.usePersistentConversationState !== false);
  const groupJoinWelcomeStore = new GroupJoinWelcomeStore();
  const groupRegistrationReminderStore = new GroupRegistrationReminderStore();
  const instrumentResolver = new StaticInstrumentResolver();
  const userPortfolioService = new TelegramUserPortfolioService({
    userRepository: new UserRepository(db),
    portfolioHoldingRepository: new PortfolioHoldingRepository(db),
    userMarketWatchRepository: new UserMarketWatchItemRepository(db)
  });
  let reportRuntime:
    | ReturnType<typeof buildTelegramReportRuntime>
    | undefined;

  const getUserKey = (userId?: number): string | null => {
    if (!userId) {
      return null;
    }

    return String(userId);
  };

  const startConversation = async (
    userId: number | undefined,
    command: ConversationCommand,
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

    await conversationStateStore.set(userKey, createInitialConversationState(command));
    await reply(getConversationStartMessage(command));
  };

  const getReportRuntime = () => {
    reportRuntime ??= buildTelegramReportRuntime(env);
    return reportRuntime;
  };

  bot.command("start", async (context) => {
    await context.reply(buildStartMessage());
  });

  bot.command("help", async (context) => {
    await context.reply(buildHelpMessage());
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
      await context.reply(buildPrivateRegisterSuccessMessage());
      return;
    }

    await context.reply(buildGroupRegisterSuccessMessage());
  });

  bot.command("report", async (context) => {
    if (!context.chat || context.chat.type !== "private") {
      await context.reply(
        "개인화 브리핑은 봇과의 1:1 대화에서만 제공됩니다. DM에서 /register 후 /report 를 실행해 주세요."
      );
      return;
    }

    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    const registeredUser = await userPortfolioService.findRegisteredUser(userKey);

    if (!registeredUser) {
      await context.reply("먼저 /register 를 실행해 계정을 등록해 주세요.");
      return;
    }

    if (registeredUser.preferredDeliveryChatId !== String(context.chat.id)) {
      await context.reply(
        "이 1:1 대화를 개인 브리핑 수신 대상으로 확정하려면 먼저 /register 를 다시 실행해 주세요."
      );
      return;
    }

    await context.reply("브리핑을 생성하고 있습니다. 잠시만 기다려 주세요.");

    try {
      const runDate = getRunDateForTimezone("Asia/Seoul");
      const result = await getReportRuntime().reportService.runForTelegramUser({
        telegramUserId: userKey,
        runDate
      });

      if (result.status === "failed") {
        await context.reply(
          "브리핑 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }

      if (!result.reportText) {
        await context.reply(
          "브리핑을 준비했지만 표시할 내용이 없습니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }

      await context.reply(result.reportText);
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  });

  bot.command("report_settings", async (context) => {
    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    try {
      const user = await userPortfolioService.findRegisteredUser(userKey);

      if (!user) {
        await context.reply("먼저 /register 를 실행해 계정을 등록해 주세요.");
        return;
      }

      await context.reply(formatReportSettings(user));
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  });

  bot.command("report_on", async (context) => {
    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    try {
      const updated = await userPortfolioService.updateDailyReportSettings(userKey, {
        dailyReportEnabled: true
      });

      await context.reply(
        [
          "정기 브리핑 발송을 켰습니다.",
          formatReportSettings(updated)
        ].join("\n\n")
      );
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  });

  bot.command("report_off", async (context) => {
    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    try {
      const updated = await userPortfolioService.updateDailyReportSettings(userKey, {
        dailyReportEnabled: false
      });

      await context.reply(
        [
          "정기 브리핑 발송을 껐습니다.",
          formatReportSettings(updated)
        ].join("\n\n")
      );
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  });

  bot.command("report_time", async (context) => {
    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    const parsedTime = parseReportTimeArgument(context.match);

    if (!parsedTime) {
      await context.reply("사용 예시: /report_time 09:00");
      return;
    }

    try {
      const updated = await userPortfolioService.updateDailyReportSettings(userKey, {
        dailyReportEnabled: true,
        dailyReportHour: parsedTime.hour,
        dailyReportMinute: parsedTime.minute
      });

      await context.reply(
        [
          `정기 브리핑 시간을 ${formatHourMinute(
            parsedTime.hour,
            parsedTime.minute
          )}로 변경했습니다.`,
          formatReportSettings(updated)
        ].join("\n\n")
      );
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
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

    const shouldSendWelcome = context.message.new_chat_members.some((member) => {
      if (member.is_bot) {
        return false;
      }

      return groupJoinWelcomeStore.shouldWelcome(
        String(member.id),
        String(context.chat.id)
      );
    });

    if (!shouldSendWelcome) {
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

    if (
      !groupJoinWelcomeStore.shouldWelcome(
        String(chatMemberUpdate.new_chat_member.user.id),
        String(chatMemberUpdate.chat.id)
      )
    ) {
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

    const state = await conversationStateStore.get(userKey);

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
      await conversationStateStore.clear(userKey);

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

    await conversationStateStore.set(userKey, transition.nextState);
    await context.reply(transition.message);
  });

  return {
    bot,
    close: async () => {
      bot.stop();
      if (reportRuntime) {
        await reportRuntime.close();
      }
      await pool.end();
    }
  };
}

function buildConversationStateStore(
  db: ReturnType<typeof createDatabase>,
  usePersistentConversationState: boolean
): ConversationStateStore {
  if (!usePersistentConversationState) {
    return new InMemoryConversationStateStore();
  }

  return new DbConversationStateStore(
    new TelegramConversationStateRepository(db)
  );
}

export function resolveTelegramCommandError(error: unknown): string {
  if (error instanceof Error && error.message === "USER_NOT_REGISTERED") {
    return "먼저 /register 를 실행해 계정을 등록해 주세요.";
  }

  return "요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}
