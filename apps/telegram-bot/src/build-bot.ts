import { Bot, InlineKeyboard, Keyboard } from "grammy";
import {
  buildMockTelegramReportPreview,
  RankedTickerSearchService,
  StaticInstrumentResolver
} from "@stock-chatbot/application";
import {
  createDatabase,
  createPool,
  PortfolioHoldingRepository,
  TelegramOutboundMessageRepository,
  TickerMasterRepository,
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
  buildAlreadyRegisteredMessage,
  buildGroupRegisterSuccessMessage,
  buildGroupRegistrationReminder,
  buildHelpMessage,
  buildNewMemberWelcomeMessage,
  buildPrivateRegisterSuccessMessage,
  buildStartMessage,
  buildUnregisterMissingMessage,
  buildUnregisterSuccessMessage,
  extractNewlyJoinedMemberName,
  GroupJoinWelcomeStore,
  GroupRegistrationReminderStore,
  isGroupChat
} from "./onboarding.js";
import { parsePortfolioBulkArgument } from "./portfolio-bulk.js";
import {
  buildTelegramReportRuntime,
  resolveTelegramReportRunDate,
  resolveTelegramReportFollowUpMessage
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
const HOME_REPORT_BUTTON = "📊 브리핑 보기";
const HOME_PORTFOLIO_ADD_BUTTON = "➕ 종목 추가";
const HOME_PORTFOLIO_LIST_BUTTON = "📁 내 종목";
const HOME_SETTINGS_BUTTON = "⚙️ 설정";
const HOME_MOCK_REPORT_BUTTON = "🧪 예시 리포트";

export const TELEGRAM_ALLOWED_UPDATES = [
  "message",
  "callback_query",
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
  const tickerSearchService = new RankedTickerSearchService(
    new TickerMasterRepository(db),
    {
      aliasResolver: instrumentResolver
    }
  );
  const telegramOutboundMessageRepository = new TelegramOutboundMessageRepository(db);
  const userPortfolioService = new TelegramUserPortfolioService({
    userRepository: new UserRepository(db),
    portfolioHoldingRepository: new PortfolioHoldingRepository(db),
    userMarketWatchRepository: new UserMarketWatchItemRepository(db)
  });
  let reportRuntime:
    | ReturnType<typeof buildTelegramReportRuntime>
    | undefined;

  bot.api.config.use(async (prev, method, payload, signal) => {
    const result = await prev(method, payload, signal);

    if (method === "sendMessage") {
      const outboundMessage = extractTelegramOutboundMessage(payload, result);

      if (outboundMessage) {
        try {
          await telegramOutboundMessageRepository.insert(outboundMessage);
        } catch (error) {
          console.warn("telegram-outbound-audit-failed", {
            chatId: outboundMessage.chatId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return result;
  });

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

  const replyWithHomeMenu = async (context: any, text: string) => {
    if (!context.chat || context.chat.type !== "private") {
      await context.reply(text);
      return;
    }

    await context.reply(text, {
      reply_markup: buildHomeReplyKeyboard()
    });
  };

  const handleStart = async (context: any) => {
    await replyWithHomeMenu(context, buildStartMessage());
  };

  const handleHelp = async (context: any) => {
    await replyWithHomeMenu(context, buildHelpMessage());
  };

  const handleReport = async (context: any) => {
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
      const runDate = resolveTelegramReportRunDate(env, {
        timeZone: "Asia/Seoul"
      });
      const result = await getReportRuntime().reportService.runForTelegramUser({
        telegramUserId: userKey,
        runDate
      });

      const followUpMessage = resolveTelegramReportFollowUpMessage(result);

      if (followUpMessage) {
        await context.reply(followUpMessage);
        return;
      }

      await context.reply(result.reportText, {
        reply_markup: buildHomeReplyKeyboard()
      });
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  };

  const handleReportSettings = async (context: any) => {
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

      await context.reply(formatReportSettings(user), {
        reply_markup: buildSettingsInlineKeyboard()
      });
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  };

  const handlePortfolioList = async (context: any) => {
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
        ].join("\n"),
        {
          reply_markup: buildHomeReplyKeyboard()
        }
      );
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  };

  const handleMarketItems = async (context: any) => {
    await context.reply(
      "관심 지표 개인 설정은 더 이상 사용하지 않습니다. /report 와 공개 브리핑은 시스템 기본 시장 지표 세트를 기준으로 제공됩니다.",
      {
        reply_markup: buildHomeReplyKeyboard()
      }
    );
  };

  bot.command("start", handleStart);

  bot.command("help", handleHelp);

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

    const existingUser = await userPortfolioService.findRegisteredUser(
      registerInput.telegramUserId
    );

    if (
      context.chat.type === "private" &&
      existingUser?.preferredDeliveryChatId === registerInput.chatId &&
      existingUser.preferredDeliveryChatType === context.chat.type
    ) {
      await replyWithHomeMenu(context, buildAlreadyRegisteredMessage());
      return;
    }

    const result = await userPortfolioService.registerTelegramUser(registerInput);

    if (result.alreadyRegistered) {
      await replyWithHomeMenu(context, buildAlreadyRegisteredMessage());
      return;
    }

    if (result.deliveryMode === "private_ready") {
      await replyWithHomeMenu(context, buildPrivateRegisterSuccessMessage());
      return;
    }

    await context.reply(buildGroupRegisterSuccessMessage());
  });

  bot.command("unregister", async (context) => {
    if (!context.chat || context.chat.type !== "private") {
      await context.reply(
        "등록 초기화는 봇과의 1:1 대화에서만 가능합니다. DM에서 /unregister 를 실행해 주세요."
      );
      return;
    }

    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.reply("사용자 식별 정보를 확인하지 못했습니다.");
      return;
    }

    try {
      const removed = await userPortfolioService.unregisterTelegramUser(userKey);
      await conversationStateStore.clear(userKey);
      await context.reply(
        removed
          ? buildUnregisterSuccessMessage()
          : buildUnregisterMissingMessage()
      );
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  });

  bot.command("report", handleReport);

  bot.command("report_settings", handleReportSettings);

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

  bot.command("report_mode", async (context) => {
    await context.reply(
      "리포트 밀도 설정은 더 이상 사용하지 않습니다. 현재는 단일 개인화 브리핑 형식으로 제공됩니다."
    );
  });

  bot.command("report_link_on", async (context) => {
    await context.reply(
      "공개 상세 브리핑 링크 설정은 더 이상 개별 옵션으로 제공하지 않습니다."
    );
  });

  bot.command("report_link_off", async (context) => {
    await context.reply(
      "공개 상세 브리핑 링크 설정은 더 이상 개별 옵션으로 제공하지 않습니다."
    );
  });

  bot.command("portfolio_add", async (context) =>
    startConversation(context.from?.id, "portfolio_add", (text) => context.reply(text))
  );

  bot.command("portfolio_bulk", async (context) => {
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

    const tokens = parsePortfolioBulkArgument(
      typeof context.match === "string" ? context.match : String(context.match ?? "")
    );

    if (tokens.length === 0) {
      await context.reply(
        "사용 예시: /portfolio_bulk 삼성전자, SK하이닉스, 현대차"
      );
      return;
    }

    const resolved = [];
    const unresolved: string[] = [];
    const ambiguous: Array<{
      query: string;
      results: Awaited<ReturnType<typeof tickerSearchService.search>>;
    }> = [];

    for (const token of tokens) {
      const results = await tickerSearchService.search(token, 5);

      if (results.length === 0) {
        unresolved.push(token);
        continue;
      }

      const resolutionResult = tickerSearchService.pickBulkAutoSelection(results);

      if (!resolutionResult) {
        ambiguous.push({
          query: token,
          results
        });
        continue;
      }

      resolved.push(tickerSearchService.toPortfolioTickerResolution(resolutionResult));
    }

    if (resolved.length === 0) {
      const failureLines = [];

      if (unresolved.length > 0) {
        failureLines.push(...unresolved.map((item) => `- ${item} → 후보 없음`));
      }

      if (ambiguous.length > 0) {
        failureLines.push(
          ...ambiguous.map(
            (item) =>
              `- ${item.query} → 후보 다수 (${item.results
                .slice(0, 3)
                .map((result) => `${result.name} ${result.symbol}`)
                .join(", ")})`
          )
        );
      }

      await context.reply(
        [
          "등록 가능한 종목을 찾지 못했습니다.",
          ...failureLines,
          "",
          "예시: /portfolio_bulk 삼성전자, SK하이닉스, 현대차"
        ].join("\n")
      );
      return;
    }

    try {
      const result = await userPortfolioService.addPortfolioHoldingsBulk(
        userKey,
        resolved
      );
      const lines = ["벌크 종목 등록 결과입니다."];

      if (result.added.length > 0) {
        lines.push(
          "",
          "추가됨:",
          ...result.added.map(
            (holding) => `- ${holding.companyName} (${holding.symbol}, ${holding.exchange})`
          )
        );
      }

      if (result.skippedExisting.length > 0) {
        lines.push(
          "",
          "이미 등록:",
          ...result.skippedExisting.map(
            (holding) => `- ${holding.companyName} (${holding.symbol}, ${holding.exchange})`
          )
        );
      }

      if (unresolved.length > 0) {
        lines.push(
          "",
          "실패:",
          ...unresolved.map((item) => `- ${item} → 후보 없음`)
        );
      }

      if (ambiguous.length > 0) {
        lines.push(
          ...(unresolved.length > 0 ? [] : ["", "실패:"]),
          ...ambiguous.map(
            (item) =>
              `- ${item.query} → 후보 다수 (${item.results
                .slice(0, 3)
                .map((result) => `${result.name} ${result.symbol}`)
                .join(", ")})`
          )
        );
      }

      lines.push("", "필요하면 /portfolio_list 로 저장 결과를 확인해 주세요.");

      await context.reply(lines.join("\n"));
    } catch (error) {
      await context.reply(resolveTelegramCommandError(error));
    }
  });

  bot.command("portfolio_list", handlePortfolioList);

  bot.command("portfolio_remove", async (context) =>
    startConversation(context.from?.id, "portfolio_remove", (text) =>
      context.reply(text)
    )
  );

  bot.command("market_add", async (context) =>
    context.reply(
      "관심 지표 개인 설정은 더 이상 사용하지 않습니다. /report 와 공개 브리핑은 시스템 기본 시장 지표 세트를 기준으로 제공됩니다."
    )
  );

  bot.command("market_items", handleMarketItems);

  bot.command("mock_report", async (context) => {
    await context.reply(buildMockTelegramReportPreview().renderedText, {
      reply_markup: buildHomeReplyKeyboard()
    });
  });

  bot.callbackQuery(/^settings:/, async (context) => {
    const userKey = getUserKey(context.from?.id);

    if (!userKey) {
      await context.answerCallbackQuery({
        text: "사용자 식별 정보를 확인하지 못했습니다."
      });
      return;
    }

    const action = context.callbackQuery.data.replace(/^settings:/, "");

    try {
      if (action === "time_change") {
        await conversationStateStore.set(userKey, createInitialConversationState("report_time"));
        await context.answerCallbackQuery({
          text: "변경할 시간을 입력해 주세요."
        });
        await context.reply("변경할 브리핑 시간을 HH:MM 형식으로 입력해 주세요. 예: 08:30");
        return;
      }

      const updated =
        action === "report_on"
          ? await userPortfolioService.updateDailyReportSettings(userKey, {
              dailyReportEnabled: true
            })
          : action === "report_off"
            ? await userPortfolioService.updateDailyReportSettings(userKey, {
                dailyReportEnabled: false
              })
            : null;

      if (!updated) {
        await context.answerCallbackQuery({
          text: "지원하지 않는 설정입니다."
        });
        return;
      }

      await context.answerCallbackQuery({
        text: "설정을 반영했습니다."
      });
      try {
        await context.editMessageText(formatReportSettings(updated), {
          reply_markup: buildSettingsInlineKeyboard()
        });
      } catch {
        await context.reply(formatReportSettings(updated), {
          reply_markup: buildSettingsInlineKeyboard()
        });
      }
    } catch (error) {
      const message = resolveTelegramCommandError(error);

      await context.answerCallbackQuery({
        text: message
      });
      await context.reply(message);
    }
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
      if (!isGroupChat(context.chat.type)) {
        if (text === HOME_REPORT_BUTTON) {
          await handleReport(context);
          return;
        }

        if (text === HOME_PORTFOLIO_ADD_BUTTON) {
          await startConversation(context.from?.id, "portfolio_add", (message) =>
            context.reply(message)
          );
          return;
        }

        if (text === HOME_PORTFOLIO_LIST_BUTTON) {
          await handlePortfolioList(context);
          return;
        }

        if (text === HOME_SETTINGS_BUTTON) {
          await handleReportSettings(context);
          return;
        }

        if (text === HOME_MOCK_REPORT_BUTTON) {
          await context.reply(buildMockTelegramReportPreview().renderedText, {
            reply_markup: buildHomeReplyKeyboard()
          });
          return;
        }
      }

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

    const transition = await advanceConversation(state, text, {
      marketResolver: instrumentResolver,
      portfolioTickerSearch: tickerSearchService
    });

    if (transition.status === "completed") {
      await conversationStateStore.clear(userKey);

      try {
        switch (transition.completion.command) {
          case "portfolio_add": {
            const result = await userPortfolioService.addPortfolioHolding(
              userKey,
              transition.completion.draft
            );
            await context.reply(
              result.created
                ? `${transition.completion.draft.companyName}(${transition.completion.draft.symbol})가 추가되었습니다.`
                : `${transition.completion.draft.companyName}(${transition.completion.draft.symbol})는 이미 등록되어 있습니다.`
            );
            break;
          }
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
          case "report_time": {
            const updated = await userPortfolioService.updateDailyReportSettings(userKey, {
              dailyReportEnabled: true,
              dailyReportHour: transition.completion.hour,
              dailyReportMinute: transition.completion.minute
            });
            await context.reply(
              [
                `정기 브리핑 시간을 ${formatHourMinute(
                  transition.completion.hour,
                  transition.completion.minute
                )}로 변경했습니다.`,
                formatReportSettings(updated)
              ].join("\n\n")
            );
            break;
          }
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

export function buildHomeReplyKeyboard(): Keyboard {
  return new Keyboard([
    [HOME_REPORT_BUTTON, HOME_PORTFOLIO_ADD_BUTTON],
    [HOME_PORTFOLIO_LIST_BUTTON, HOME_SETTINGS_BUTTON],
    [HOME_MOCK_REPORT_BUTTON]
  ]).resized();
}

export function buildSettingsInlineKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("브리핑 켜기", "settings:report_on")
    .text("브리핑 끄기", "settings:report_off")
    .row()
    .text("시간 변경", "settings:time_change");
}

function extractTelegramOutboundMessage(
  payload: unknown,
  result: unknown
):
  | {
      chatId: string;
      method: string;
      telegramMessageId?: string;
      text: string;
    }
  | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const chatId =
    "chat_id" in payload && payload.chat_id !== undefined && payload.chat_id !== null
      ? String(payload.chat_id)
      : null;
  const text =
    "text" in payload && typeof payload.text === "string" ? payload.text : null;

  if (!chatId || !text) {
    return null;
  }

  let telegramMessageId: string | undefined;

  if (
    result &&
    typeof result === "object" &&
    "message_id" in result &&
    result.message_id !== undefined &&
    result.message_id !== null
  ) {
    telegramMessageId = String(result.message_id);
  }

  const outboundMessage: {
    chatId: string;
    method: string;
    telegramMessageId?: string;
    text: string;
  } = {
    chatId,
    method: "sendMessage",
    text
  };

  if (telegramMessageId) {
    outboundMessage.telegramMessageId = telegramMessageId;
  }

  return outboundMessage;
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
