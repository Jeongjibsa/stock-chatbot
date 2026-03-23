import { describe, expect, it } from "vitest";

import type { RankedTickerSearchResult } from "@stock-chatbot/application";
import { StaticInstrumentResolver } from "@stock-chatbot/application";

import {
  advanceConversation,
  createInitialConversationState,
  getConversationStartMessage,
  InMemoryConversationStateStore
} from "./conversation-state.js";

function createTickerSearchStub() {
  const catalog: Record<string, RankedTickerSearchResult[]> = {
    AAPL: [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        market: "NASDAQ",
        score: 1000,
        matchTier: "exact_symbol"
      }
    ],
    samsung: [
      {
        symbol: "005930",
        name: "삼성전자",
        market: "KOSPI",
        score: 840,
        matchTier: "prefix"
      },
      {
        symbol: "006400",
        name: "삼성SDI",
        market: "KOSPI",
        score: 822,
        matchTier: "prefix"
      }
    ]
  };

  return {
    async search(query: string) {
      return catalog[query] ?? [];
    },
    pickHighConfidenceSingleResult(results: RankedTickerSearchResult[]) {
      const [first, second] = results;

      if (!first) {
        return null;
      }

      if (first.matchTier === "exact_symbol" || first.matchTier === "exact_name") {
        return first;
      }

      if (!second) {
        return first;
      }

      return null;
    },
    toPortfolioTickerResolution(result: RankedTickerSearchResult) {
      return {
        symbol: result.symbol,
        exchange: result.market.startsWith("KO") ? "KR" : "US",
        companyName: result.name,
        matchedBy: result.matchTier === "exact_symbol" ? "symbol" : "alias",
        confidence:
          result.matchTier === "exact_symbol" || result.matchTier === "exact_name"
            ? "high"
            : "medium"
      } as const;
    }
  };
}

describe("conversation-state", () => {
  const dependencies = {
    marketResolver: new StaticInstrumentResolver(),
    portfolioTickerSearch: createTickerSearchStub()
  };

  it("walks through portfolio add flow to completion with single high-confidence result", async () => {
    let state = createInitialConversationState("portfolio_add");

    const tickerStep = await advanceConversation(state, "AAPL", dependencies);
    expect(tickerStep.status).toBe("waiting");
    if (tickerStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    expect(tickerStep.message).toContain("추가할까요?");
    state = tickerStep.nextState;

    const confirmationStep = await advanceConversation(state, "yes", dependencies);
    expect(confirmationStep.status).toBe("waiting");
    if (confirmationStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = confirmationStep.nextState;

    const avgPriceChoiceStep = await advanceConversation(state, "yes", dependencies);
    expect(avgPriceChoiceStep.status).toBe("waiting");
    if (avgPriceChoiceStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = avgPriceChoiceStep.nextState;

    const avgPriceStep = await advanceConversation(state, "210.5", dependencies);
    expect(avgPriceStep.status).toBe("waiting");
    if (avgPriceStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = avgPriceStep.nextState;

    const quantityChoiceStep = await advanceConversation(state, "yes", dependencies);
    expect(quantityChoiceStep.status).toBe("waiting");
    if (quantityChoiceStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = quantityChoiceStep.nextState;

    const quantityStep = await advanceConversation(state, "3", dependencies);
    expect(quantityStep.status).toBe("completed");
    if (quantityStep.status !== "completed") {
      throw new Error("expected completed state");
    }

    expect(quantityStep.completion).toMatchObject({
      command: "portfolio_add",
      draft: {
        symbol: "AAPL",
        exchange: "US",
        avgPrice: "210.5",
        quantity: "3"
      }
    });
  });

  it("shows numbered selection when multiple results exist", async () => {
    let state = createInitialConversationState("portfolio_add");

    const searchStep = await advanceConversation(state, "samsung", dependencies);
    expect(searchStep.status).toBe("waiting");
    if (searchStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    expect(searchStep.message).toContain("1. 삼성전자");
    expect(searchStep.message).toContain("2. 삼성SDI");
    state = searchStep.nextState;

    const selectionStep = await advanceConversation(state, "1", dependencies);
    expect(selectionStep.status).toBe("waiting");
    if (selectionStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    expect(selectionStep.message).toContain("삼성전자 (005930)를 선택했습니다.");
  });

  it("keeps the flow active on invalid inputs", async () => {
    const state = createInitialConversationState("market_add");
    const invalidStep = await advanceConversation(state, "unknown market", dependencies);

    expect(invalidStep.status).toBe("invalid");
    if (invalidStep.status === "completed") {
      throw new Error("expected invalid state");
    }
    expect(invalidStep.nextState.command).toBe("market_add");
  });

  it("supports start messages and in-memory store lifecycle", () => {
    const store = new InMemoryConversationStateStore();
    const state = createInitialConversationState("portfolio_remove");

    store.set("user-1", state);

    expect(getConversationStartMessage("portfolio_add")).toContain("종목명을 입력");
    expect(getConversationStartMessage("portfolio_bulk")).toContain("여러 종목");
    expect(getConversationStartMessage("portfolio_remove")).toContain("삭제할 종목");
    expect(store.get("user-1")).toMatchObject({
      command: "portfolio_remove"
    });

    store.clear("user-1");

    expect(store.get("user-1")).toBeNull();
  });

  it("completes portfolio bulk input in a single reply", async () => {
    const state = createInitialConversationState("portfolio_bulk");
    const result = await advanceConversation(
      state,
      "삼성전자, SK하이닉스\n현대차",
      dependencies
    );

    expect(result.status).toBe("completed");
    if (result.status !== "completed") {
      throw new Error("expected completed state");
    }

    expect(result.completion).toEqual({
      command: "portfolio_bulk",
      tokens: ["삼성전자", "SK하이닉스", "현대차"]
    });
  });
});
