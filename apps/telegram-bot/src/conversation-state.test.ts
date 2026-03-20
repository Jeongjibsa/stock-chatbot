import { describe, expect, it } from "vitest";

import { StaticInstrumentResolver } from "@stock-chatbot/application";

import {
  advanceConversation,
  createInitialConversationState,
  getConversationStartMessage,
  InMemoryConversationStateStore
} from "./conversation-state.js";

describe("conversation-state", () => {
  const resolver = new StaticInstrumentResolver();

  it("walks through portfolio add flow to completion", () => {
    let state = createInitialConversationState("portfolio_add");

    const tickerStep = advanceConversation(state, "AAPL", resolver);
    expect(tickerStep.status).toBe("waiting");
    if (tickerStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = tickerStep.nextState;

    const avgPriceChoiceStep = advanceConversation(state, "yes", resolver);
    expect(avgPriceChoiceStep.status).toBe("waiting");
    if (avgPriceChoiceStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = avgPriceChoiceStep.nextState;

    const avgPriceStep = advanceConversation(state, "210.5", resolver);
    expect(avgPriceStep.status).toBe("waiting");
    if (avgPriceStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = avgPriceStep.nextState;

    const quantityChoiceStep = advanceConversation(state, "yes", resolver);
    expect(quantityChoiceStep.status).toBe("waiting");
    if (quantityChoiceStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = quantityChoiceStep.nextState;

    const quantityStep = advanceConversation(state, "3", resolver);
    expect(quantityStep.status).toBe("waiting");
    if (quantityStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = quantityStep.nextState;

    const noteChoiceStep = advanceConversation(state, "yes", resolver);
    expect(noteChoiceStep.status).toBe("waiting");
    if (noteChoiceStep.status === "completed") {
      throw new Error("expected waiting state");
    }
    state = noteChoiceStep.nextState;

    const noteStep = advanceConversation(state, "Long term", resolver);
    expect(noteStep.status).toBe("completed");
    if (noteStep.status !== "completed") {
      throw new Error("expected completed state");
    }

    expect(noteStep.completion).toMatchObject({
      command: "portfolio_add",
      draft: {
        symbol: "AAPL",
        exchange: "US",
        avgPrice: "210.5",
        quantity: "3",
        note: "Long term"
      }
    });
  });

  it("keeps the flow active on invalid inputs", () => {
    const state = createInitialConversationState("market_add");
    const invalidStep = advanceConversation(state, "unknown market", resolver);

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

    expect(getConversationStartMessage("portfolio_remove")).toContain("삭제할 종목");
    expect(store.get("user-1")).toMatchObject({
      command: "portfolio_remove"
    });

    store.clear("user-1");

    expect(store.get("user-1")).toBeNull();
  });
});
