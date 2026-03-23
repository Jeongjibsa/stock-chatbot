import type { ReportRunRecord } from "@stock-chatbot/database";

import type { TelegramE2ERuntime } from "./runtime.js";

export type TelegramE2EScenarioRequirement =
  | "group_chat"
  | "primary_user"
  | "secondary_user";

export type TelegramE2EScenarioContext = {
  runId: string;
  runtime: TelegramE2ERuntime;
  suiteStartedAt: Date;
};

export type TelegramE2EScenarioDefinition = {
  automatable: "full" | "partial";
  id: string;
  minimum: boolean;
  requirements: TelegramE2EScenarioRequirement[];
  run: (context: TelegramE2EScenarioContext) => Promise<void>;
  title: string;
};

const REPORT_TIMEOUT_MS = 60_000;

export const MINIMUM_REGRESSION_SCENARIO_IDS = [
  "smoke_connectivity",
  "dm_onboarding",
  "register_basic",
  "unregister_reregister",
  "portfolio_add_exact_symbol",
  "portfolio_bulk_mixed",
  "report_without_holdings",
  "report_with_holdings"
] as const;

export const TELEGRAM_E2E_SCENARIOS: TelegramE2EScenarioDefinition[] = [
  {
    id: "smoke_connectivity",
    title: "Bot API smoke connectivity",
    minimum: true,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      const profile = await runtime.botApiClient.getMe();

      if (!profile.isBot) {
        throw new Error("getMe returned a non-bot profile");
      }

      const unauthorizedResponse = await fetch(runtime.config.webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          update_id: Date.now(),
          message: {
            message_id: 1,
            date: Math.floor(Date.now() / 1_000),
            chat: {
              id: Number(runtime.config.primaryChatId),
              type: "private"
            },
            from: {
              id: Number(runtime.config.primaryUserId),
              is_bot: false,
              first_name: "E2E"
            },
            text: "/start"
          }
        })
      });

      if (unauthorizedResponse.status !== 401) {
        throw new Error(
          `Expected unauthorized webhook call to return 401, got ${unauthorizedResponse.status}`
        );
      }
    }
  },
  {
    id: "dm_onboarding",
    title: "DM /start and /help onboarding",
    minimum: true,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await runtime.resetUser(runtime.config.primaryUserId);

      const startSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/start",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: startSince,
        expectedPhrases: ["/register", "/portfolio_add", "/portfolio_bulk", "/report"]
      });

      const helpSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/help",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: helpSince,
        expectedPhrases: ["/register", "/portfolio_add", "/portfolio_bulk", "/portfolio_list"]
      });
    }
  },
  {
    id: "register_basic",
    title: "Basic /register flow",
    minimum: true,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await runtime.resetUser(runtime.config.primaryUserId);

      const since = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/register",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since,
        expectedPhrases: ["등록이 완료되었습니다.", "/report", "/portfolio_add"]
      });

      const user = await runtime.userRepository.getByTelegramUserId(
        runtime.config.primaryUserId
      );

      if (!user) {
        throw new Error("Expected /register to create a user record");
      }

      if (user.preferredDeliveryChatId !== runtime.config.primaryChatId) {
        throw new Error("Expected /register to store the private delivery chat id");
      }
    }
  },
  {
    id: "register_duplicate",
    title: "Duplicate /register",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await ensureRegisteredPrimary(runtime);

      const since = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/register",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since,
        expectedPhrases: ["이미 등록된 계정입니다.", "/report", "/unregister"]
      });
    }
  },
  {
    id: "unregister_reregister",
    title: "/unregister then /register",
    minimum: true,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await ensureRegisteredPrimary(runtime);

      const unregisterSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/unregister",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: unregisterSince,
        expectedPhrases: ["초기화했습니다.", "/register"]
      });

      const removed = await runtime.userRepository.getByTelegramUserId(
        runtime.config.primaryUserId
      );

      if (removed) {
        throw new Error("Expected /unregister to remove the registered user");
      }

      const registerSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/register",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: registerSince,
        expectedPhrases: ["등록이 완료되었습니다.", "/portfolio_add"]
      });
    }
  },
  {
    id: "portfolio_add_exact_symbol",
    title: "/portfolio_add exact symbol",
    minimum: true,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await resetPrimaryAndRegister(runtime);

      await completePortfolioAdd(runtime, "005930", {
        expectedSelectionPhrase: "삼성전자 (005930)를 추가할까요?",
        finalChoiceValues: ["예", "no", "no", "no"]
      });

      await assertHoldingExists(runtime, runtime.config.primaryUserId, "005930");
    }
  },
  {
    id: "portfolio_add_korean_alias",
    title: "/portfolio_add Korean alias",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await resetPrimaryAndRegister(runtime);

      const resultMessages = await completePortfolioAdd(runtime, "삼전", {
        confirmOnly: true,
        expectedSelectionPhrase: "삼성전자 (005930)를 추가할까요?"
      });

      assertAnyReplyContains(resultMessages, "다른 종목명을 입력해주세요.");
    }
  },
  {
    id: "portfolio_add_company_name",
    title: "/portfolio_add company name",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await resetPrimaryAndRegister(runtime);

      const resultMessages = await completePortfolioAdd(runtime, "현대차", {
        confirmOnly: true,
        expectedSelectionPhrase: "현대자동차 (005380)를 추가할까요?"
      });

      assertAnyReplyContains(resultMessages, "다른 종목명을 입력해주세요.");
    }
  },
  {
    id: "portfolio_add_fuzzy",
    title: "/portfolio_add typo/fuzzy input",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await resetPrimaryAndRegister(runtime);

      const resultMessages = await completePortfolioAdd(runtime, "tesl", {
        confirmOnly: true,
        expectedSelectionPhrase: "TSLA"
      });

      assertAnyReplyContains(resultMessages, "다른 종목명을 입력해주세요.");
    }
  },
  {
    id: "portfolio_add_multi_candidate_selection",
    title: "/portfolio_add multi-candidate numeric selection",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await resetPrimaryAndRegister(runtime);

      const promptSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/portfolio_add",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: promptSince,
        expectedPhrases: ["종목명을 입력해주세요."]
      });

      const searchSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "삼성",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: searchSince,
        expectedPhrases: ["검색 결과입니다. 번호를 입력해주세요.", "1."]
      });

      const selectionSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "1",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: selectionSince,
        expectedPhrases: ["선택했습니다.", "평균 매수가를 입력할까요?"]
      });
    }
  },
  {
    id: "portfolio_add_no_result",
    title: "/portfolio_add no-result flow",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await resetPrimaryAndRegister(runtime);

      const promptSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/portfolio_add",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: promptSince,
        expectedPhrases: ["종목명을 입력해주세요."]
      });

      const searchSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "zzzzzz",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: searchSince,
        expectedPhrases: ["검색 결과가 없습니다. 다시 입력해주세요."]
      });
    }
  },
  {
    id: "portfolio_bulk_success",
    title: "/portfolio_bulk success case",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await resetPrimaryAndRegister(runtime);

      const since = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/portfolio_bulk 삼성전자, 현대차, tesl",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since,
        expectedPhrases: ["벌크 종목 등록 결과입니다.", "추가됨:"]
      });

      await assertHoldingExists(runtime, runtime.config.primaryUserId, "005930");
      await assertHoldingExists(runtime, runtime.config.primaryUserId, "005380");
      await assertHoldingExists(runtime, runtime.config.primaryUserId, "TSLA");
    }
  },
  {
    id: "portfolio_bulk_mixed",
    title: "/portfolio_bulk mixed-result case",
    minimum: true,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await resetPrimaryAndRegister(runtime);

      const since = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/portfolio_bulk 삼성, app, zzzzzz",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since,
        expectedPhrases: ["벌크 종목 등록 결과입니다.", "실패:"]
      });
    }
  },
  {
    id: "portfolio_list",
    title: "/portfolio_list",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await seedPrimaryPortfolio(runtime, ["삼성전자", "현대차"]);

      const since = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/portfolio_list",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since,
        expectedPhrases: ["현재 등록된 보유 종목입니다.", "삼성전자", "현대자동차"]
      });
    }
  },
  {
    id: "duplicate_portfolio_add",
    title: "duplicate portfolio add",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await seedPrimaryPortfolio(runtime, ["삼성전자"]);

      await completePortfolioAdd(runtime, "005930", {
        expectedSelectionPhrase: "삼성전자 (005930)를 추가할까요?",
        finalChoiceValues: ["예", "no", "no", "no"]
      });

      const replies = await runtime.outboundMessageRepository.listByChatId(
        runtime.config.primaryChatId,
        {
          since: new Date(Date.now() - 60_000)
        }
      );
      assertAnyReplyContains(replies, "이미 등록되어 있습니다.");

      const user = await requireRegisteredUser(runtime, runtime.config.primaryUserId);
      const holdings = await runtime.portfolioHoldingRepository.listByUserId(user.id);
      const samsungHoldings = holdings.filter((holding) => holding.symbol === "005930");

      if (samsungHoldings.length !== 1) {
        throw new Error("Duplicate portfolio add created more than one holding row");
      }
    }
  },
  {
    id: "portfolio_remove",
    title: "/portfolio_remove",
    minimum: false,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await seedPrimaryPortfolio(runtime, ["삼성전자"]);

      const promptSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/portfolio_remove",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: promptSince,
        expectedPhrases: ["삭제할 종목명 또는 종목 코드를 입력"]
      });

      const removeSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "005930",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since: removeSince,
        expectedPhrases: ["보유 종목을 삭제했습니다."]
      });

      const user = await requireRegisteredUser(runtime, runtime.config.primaryUserId);
      const holdings = await runtime.portfolioHoldingRepository.listByUserId(user.id);

      if (holdings.some((holding) => holding.symbol === "005930")) {
        throw new Error("Expected /portfolio_remove to delete the holding");
      }
    }
  },
  {
    id: "report_without_holdings",
    title: "/report without holdings",
    minimum: true,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await resetPrimaryAndRegister(runtime);

      const since = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/report",
        updateId: runtime.nextUpdateId()
      });

      await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since,
        timeoutMs: REPORT_TIMEOUT_MS,
        expectedPhrases: ["브리핑을 생성하고 있습니다.", "🗞️ 오늘의 포트폴리오 프리마켓 브리핑"]
      });

      const latestRun = await findLatestTelegramReportRun(runtime, runtime.config.primaryUserId);

      if (!latestRun?.reportText) {
        throw new Error("Expected /report without holdings to persist a report_text");
      }
    }
  },
  {
    id: "report_with_holdings",
    title: "/report with holdings",
    minimum: true,
    automatable: "full",
    requirements: ["primary_user"],
    run: async ({ runtime }) => {
      await seedPrimaryPortfolio(runtime, ["삼성전자", "현대차"]);

      const since = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/report",
        updateId: runtime.nextUpdateId()
      });
      const replies = await runtime.waitForReplyContaining({
        chatId: runtime.config.primaryChatId,
        since,
        timeoutMs: REPORT_TIMEOUT_MS,
        expectedPhrases: ["브리핑을 생성하고 있습니다.", "🗞️ 오늘의 포트폴리오 프리마켓 브리핑"]
      });

      const reportReply = replies.find((message) =>
        message.text.includes("🗞️ 오늘의 포트폴리오 프리마켓 브리핑")
      );

      if (!reportReply?.text.includes("삼성전자")) {
        throw new Error("Expected personalized /report to mention at least one holding");
      }

      if (!reportReply.text.includes("포트폴리오 리밸런싱 제안")) {
        throw new Error("Expected personalized /report to include a rebalancing summary");
      }

      if (!reportReply.text.includes("시세 스냅샷은")) {
        throw new Error("Expected personalized /report to include holding price snapshots");
      }

      const latestRun = await findLatestTelegramReportRun(runtime, runtime.config.primaryUserId);

      if (!latestRun?.reportText?.includes("삼성전자")) {
        throw new Error("Expected report_runs.report_text to include holding content");
      }

      if (!latestRun.reportText.includes("포트폴리오 리밸런싱 제안")) {
        throw new Error("Expected report_runs.report_text to include rebalancing content");
      }
    }
  },
  {
    id: "group_onboarding_guidance",
    title: "group onboarding guidance",
    minimum: false,
    automatable: "partial",
    requirements: ["group_chat", "primary_user"],
    run: async ({ runtime }) => {
      const groupChatId = requireGroupChatId(runtime);

      const since = new Date();
      await runtime.invokeGroupJoin({
        chatId: groupChatId,
        joinedUserId: runtime.config.primaryUserId,
        joinedUserName: "E2E Primary",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: groupChatId,
        since,
        expectedPhrases: ["환영합니다.", "/register", "DM"]
      });
    }
  },
  {
    id: "group_dm_redirection",
    title: "group command DM redirection",
    minimum: false,
    automatable: "partial",
    requirements: ["group_chat", "primary_user"],
    run: async ({ runtime }) => {
      const groupChatId = requireGroupChatId(runtime);
      await runtime.resetUser(runtime.config.primaryUserId);

      const registerSince = new Date();
      await runtime.invokeGroupText({
        chatId: groupChatId,
        userId: runtime.config.primaryUserId,
        text: "/register",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: groupChatId,
        since: registerSince,
        expectedPhrases: ["DM에서 /register", "계정 등록은 완료되었습니다."]
      });

      const addSince = new Date();
      await runtime.invokeGroupText({
        chatId: groupChatId,
        userId: runtime.config.primaryUserId,
        text: "/portfolio_add",
        updateId: runtime.nextUpdateId()
      });
      await runtime.waitForReplyContaining({
        chatId: groupChatId,
        since: addSince,
        expectedPhrases: ["/register", "계정을 등록"]
      });
    }
  },
  {
    id: "multi_user_isolation",
    title: "multi-user isolation",
    minimum: false,
    automatable: "partial",
    requirements: ["primary_user", "secondary_user"],
    run: async ({ runtime }) => {
      const secondaryChatId = requireSecondaryChatId(runtime);
      const secondaryUserId = requireSecondaryUserId(runtime);

      await runtime.resetUser(runtime.config.primaryUserId);
      await runtime.resetUser(secondaryUserId);
      await ensureRegisteredPrimary(runtime);
      await ensureRegisteredSecondary(runtime);

      await bulkAdd(runtime, runtime.config.primaryUserId, runtime.config.primaryChatId, [
        "삼성전자"
      ]);
      await bulkAdd(runtime, secondaryUserId, secondaryChatId, ["현대차"]);

      const primaryListSince = new Date();
      await runtime.invokePrivateText({
        chatId: runtime.config.primaryChatId,
        userId: runtime.config.primaryUserId,
        text: "/portfolio_list",
        updateId: runtime.nextUpdateId()
      });
      const primaryReplies = await runtime.waitForReplies({
        chatId: runtime.config.primaryChatId,
        since: primaryListSince,
        predicate: (messages) =>
          messages.some(
            (message) =>
              message.text.includes("삼성전자") &&
              !message.text.includes("현대자동차")
          )
      });
      assertAnyReplyContains(primaryReplies, "삼성전자");

      const secondaryListSince = new Date();
      await runtime.invokePrivateText({
        chatId: secondaryChatId,
        userId: secondaryUserId,
        text: "/portfolio_list",
        updateId: runtime.nextUpdateId()
      });
      const secondaryReplies = await runtime.waitForReplies({
        chatId: secondaryChatId,
        since: secondaryListSince,
        predicate: (messages) =>
          messages.some(
            (message) =>
              message.text.includes("현대자동차") &&
              !message.text.includes("삼성전자")
          )
      });
      assertAnyReplyContains(secondaryReplies, "현대자동차");
    }
  }
];

async function resetPrimaryAndRegister(runtime: TelegramE2ERuntime): Promise<void> {
  await runtime.resetUser(runtime.config.primaryUserId);
  await ensureRegisteredPrimary(runtime);
}

async function ensureRegisteredPrimary(runtime: TelegramE2ERuntime): Promise<void> {
  const existing = await runtime.userRepository.getByTelegramUserId(
    runtime.config.primaryUserId
  );

  if (existing?.preferredDeliveryChatId === runtime.config.primaryChatId) {
    return;
  }

  const since = new Date();
  await runtime.invokePrivateText({
    chatId: runtime.config.primaryChatId,
    userId: runtime.config.primaryUserId,
    text: "/register",
    updateId: runtime.nextUpdateId()
  });
  await runtime.waitForReplyContaining({
    chatId: runtime.config.primaryChatId,
    since,
    expectedPhrases: ["등록", "/report"]
  });
}

async function ensureRegisteredSecondary(runtime: TelegramE2ERuntime): Promise<void> {
  const secondaryChatId = requireSecondaryChatId(runtime);
  const secondaryUserId = requireSecondaryUserId(runtime);
  const existing = await runtime.userRepository.getByTelegramUserId(secondaryUserId);

  if (existing?.preferredDeliveryChatId === secondaryChatId) {
    return;
  }

  const since = new Date();
  await runtime.invokePrivateText({
    chatId: secondaryChatId,
    userId: secondaryUserId,
    text: "/register",
    updateId: runtime.nextUpdateId()
  });
  await runtime.waitForReplyContaining({
    chatId: secondaryChatId,
    since,
    expectedPhrases: ["등록", "/report"]
  });
}

async function seedPrimaryPortfolio(
  runtime: TelegramE2ERuntime,
  keywords: string[]
): Promise<void> {
  await resetPrimaryAndRegister(runtime);
  await bulkAdd(runtime, runtime.config.primaryUserId, runtime.config.primaryChatId, keywords);
}

async function bulkAdd(
  runtime: TelegramE2ERuntime,
  userId: string,
  chatId: string,
  keywords: string[]
): Promise<void> {
  const since = new Date();
  await runtime.invokePrivateText({
    chatId,
    userId,
    text: `/portfolio_bulk ${keywords.join(", ")}`,
    updateId: runtime.nextUpdateId()
  });
  await runtime.waitForReplyContaining({
    chatId,
    since,
    expectedPhrases: ["벌크 종목 등록 결과입니다."]
  });
}

async function completePortfolioAdd(
  runtime: TelegramE2ERuntime,
  query: string,
  options: {
    confirmOnly?: boolean;
    expectedSelectionPhrase: string;
    finalChoiceValues?: string[];
  }
) {
  const promptSince = new Date();
  await runtime.invokePrivateText({
    chatId: runtime.config.primaryChatId,
    userId: runtime.config.primaryUserId,
    text: "/portfolio_add",
    updateId: runtime.nextUpdateId()
  });
  await runtime.waitForReplyContaining({
    chatId: runtime.config.primaryChatId,
    since: promptSince,
    expectedPhrases: ["종목명을 입력해주세요."]
  });

  const searchSince = new Date();
  await runtime.invokePrivateText({
    chatId: runtime.config.primaryChatId,
    userId: runtime.config.primaryUserId,
    text: query,
    updateId: runtime.nextUpdateId()
  });
  const searchReplies = await runtime.waitForReplyContaining({
    chatId: runtime.config.primaryChatId,
    since: searchSince,
    expectedPhrases: [options.expectedSelectionPhrase]
  });

  if (options.confirmOnly) {
    const cancelSince = new Date();
    await runtime.invokePrivateText({
      chatId: runtime.config.primaryChatId,
      userId: runtime.config.primaryUserId,
      text: "아니오",
      updateId: runtime.nextUpdateId()
    });
    return runtime.waitForReplies({
      chatId: runtime.config.primaryChatId,
      since: cancelSince,
      predicate: (messages) => messages.some((message) => message.text.includes("다른 종목명을"))
    });
  }

  for (const value of options.finalChoiceValues ?? []) {
    const since = new Date();
    await runtime.invokePrivateText({
      chatId: runtime.config.primaryChatId,
      userId: runtime.config.primaryUserId,
      text: value,
      updateId: runtime.nextUpdateId()
    });
    await runtime.waitForReplies({
      chatId: runtime.config.primaryChatId,
      since,
      predicate: (messages) => messages.length > 0
    });
  }

  return searchReplies;
}

async function assertHoldingExists(
  runtime: TelegramE2ERuntime,
  telegramUserId: string,
  symbol: string
): Promise<void> {
  const user = await requireRegisteredUser(runtime, telegramUserId);
  const holding = await runtime.portfolioHoldingRepository.getByUserAndSymbol(
    user.id,
    symbol,
    symbol === "TSLA" ? "US" : "KR"
  );

  if (!holding) {
    throw new Error(`Expected holding ${symbol} to exist`);
  }
}

async function requireRegisteredUser(
  runtime: TelegramE2ERuntime,
  telegramUserId: string
) {
  const user = await runtime.userRepository.getByTelegramUserId(telegramUserId);

  if (!user) {
    throw new Error(`Expected telegram user ${telegramUserId} to be registered`);
  }

  return user;
}

async function findLatestTelegramReportRun(
  runtime: TelegramE2ERuntime,
  telegramUserId: string
): Promise<ReportRunRecord | null> {
  const user = await requireRegisteredUser(runtime, telegramUserId);
  const runs = await runtime.reportRunRepository.listRecentByUserId(user.id);

  return (
    runs.find((run) => run.scheduleType === "telegram-report") ?? null
  );
}

function requireGroupChatId(runtime: TelegramE2ERuntime): string {
  if (!runtime.config.groupChatId) {
    throw new Error("TELEGRAM_E2E_GROUP_CHAT_ID is not configured");
  }

  return runtime.config.groupChatId;
}

function requireSecondaryChatId(runtime: TelegramE2ERuntime): string {
  if (!runtime.config.secondaryChatId) {
    throw new Error("TELEGRAM_E2E_SECONDARY_CHAT_ID is not configured");
  }

  return runtime.config.secondaryChatId;
}

function requireSecondaryUserId(runtime: TelegramE2ERuntime): string {
  if (!runtime.config.secondaryUserId) {
    throw new Error("TELEGRAM_E2E_SECONDARY_USER_ID is not configured");
  }

  return runtime.config.secondaryUserId;
}

function assertAnyReplyContains(
  messages: Array<{
    text: string;
  }>,
  phrase: string
): void {
  if (!messages.some((message) => message.text.includes(phrase))) {
    throw new Error(
      `Expected at least one reply to include ${JSON.stringify(phrase)}`
    );
  }
}
