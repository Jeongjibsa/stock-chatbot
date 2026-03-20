import type {
  MarketIndicatorResolution,
  PortfolioTickerResolution,
  StaticInstrumentResolver
} from "@stock-chatbot/application";

export type ConversationCommand =
  | "market_add"
  | "portfolio_add"
  | "portfolio_remove";

export type PortfolioAddState = {
  command: "portfolio_add";
  draft: {
    avgPrice?: string;
    note?: string;
    quantity?: string;
    resolution?: PortfolioTickerResolution;
  };
  step:
    | "awaiting_avg_price"
    | "awaiting_avg_price_choice"
    | "awaiting_note"
    | "awaiting_note_choice"
    | "awaiting_quantity"
    | "awaiting_quantity_choice"
    | "awaiting_ticker";
};

export type PortfolioRemoveState = {
  command: "portfolio_remove";
  draft: {
    resolution?: PortfolioTickerResolution;
  };
  step: "awaiting_ticker";
};

export type MarketAddState = {
  command: "market_add";
  draft: {
    resolution?: MarketIndicatorResolution;
  };
  step: "awaiting_query";
};

export type ConversationState =
  | MarketAddState
  | PortfolioAddState
  | PortfolioRemoveState;

export type ConversationCompletion =
  | {
      command: "market_add";
      resolution: MarketIndicatorResolution;
    }
  | {
      command: "portfolio_add";
      draft: NonNullable<PortfolioAddState["draft"]["resolution"]> & {
        avgPrice?: string;
        note?: string;
        quantity?: string;
      };
    }
  | {
      command: "portfolio_remove";
      resolution: PortfolioTickerResolution;
    };

export type ConversationTransitionResult =
  | {
      message: string;
      nextState: ConversationState;
      status: "invalid" | "waiting";
    }
  | {
      completion: ConversationCompletion;
      message: string;
      status: "completed";
    };

export class InMemoryConversationStateStore {
  private readonly stateByUserKey = new Map<string, ConversationState>();

  clear(userKey: string): void {
    this.stateByUserKey.delete(userKey);
  }

  get(userKey: string): ConversationState | null {
    return this.stateByUserKey.get(userKey) ?? null;
  }

  set(userKey: string, state: ConversationState): void {
    this.stateByUserKey.set(userKey, state);
  }
}

export function createInitialConversationState(command: ConversationCommand): ConversationState {
  switch (command) {
    case "portfolio_add":
      return {
        command,
        step: "awaiting_ticker",
        draft: {}
      };
    case "portfolio_remove":
      return {
        command,
        step: "awaiting_ticker",
        draft: {}
      };
    case "market_add":
      return {
        command,
        step: "awaiting_query",
        draft: {}
      };
  }
}

export function getConversationStartMessage(command: ConversationCommand): string {
  switch (command) {
    case "portfolio_add":
      return "추가할 종목명 또는 티커를 입력해줘.";
    case "portfolio_remove":
      return "삭제할 종목명 또는 티커를 입력해줘.";
    case "market_add":
      return "추가할 시장 지표 이름이나 코드(KOSPI, VIX 등)를 입력해줘.";
  }
}

export function advanceConversation(
  state: ConversationState,
  input: string,
  resolver: StaticInstrumentResolver
): ConversationTransitionResult {
  switch (state.command) {
    case "portfolio_add":
      return advancePortfolioAddConversation(state, input, resolver);
    case "portfolio_remove":
      return advancePortfolioRemoveConversation(state, input, resolver);
    case "market_add":
      return advanceMarketAddConversation(state, input, resolver);
  }
}

function advancePortfolioAddConversation(
  state: PortfolioAddState,
  input: string,
  resolver: StaticInstrumentResolver
): ConversationTransitionResult {
  const normalizedInput = input.trim();

  switch (state.step) {
    case "awaiting_ticker": {
      const resolution = resolver.resolvePortfolioTicker(normalizedInput);

      if (!resolution) {
        return {
          status: "invalid",
          nextState: state,
          message: "종목을 해석하지 못했어. 지원되는 티커나 종목명으로 다시 입력해줘."
        };
      }

      return {
        status: "waiting",
        nextState: {
          ...state,
          step: "awaiting_avg_price_choice",
          draft: {
            ...state.draft,
            resolution
          }
        },
        message: `${resolution.companyName} (${resolution.symbol}, ${resolution.exchange})를 확인했어. 평균 매수가를 입력할까? (yes/no)`
      };
    }
    case "awaiting_avg_price_choice": {
      const choice = parseYesNo(normalizedInput);

      if (choice === null) {
        return {
          status: "invalid",
          nextState: state,
          message: "yes 또는 no로 답해줘."
        };
      }

      if (!choice) {
        return {
          status: "waiting",
          nextState: {
            ...state,
            step: "awaiting_quantity_choice"
          },
          message: "보유 수량을 입력할까? (yes/no)"
        };
      }

      return {
        status: "waiting",
        nextState: {
          ...state,
          step: "awaiting_avg_price"
        },
        message: "평균 매수가를 숫자로 입력해줘."
      };
    }
    case "awaiting_avg_price": {
      if (!isNumericInput(normalizedInput)) {
        return {
          status: "invalid",
          nextState: state,
          message: "평균 매수가는 숫자로만 입력해줘."
        };
      }

      return {
        status: "waiting",
        nextState: {
          ...state,
          step: "awaiting_quantity_choice",
          draft: {
            ...state.draft,
            avgPrice: normalizedInput
          }
        },
        message: "보유 수량을 입력할까? (yes/no)"
      };
    }
    case "awaiting_quantity_choice": {
      const choice = parseYesNo(normalizedInput);

      if (choice === null) {
        return {
          status: "invalid",
          nextState: state,
          message: "yes 또는 no로 답해줘."
        };
      }

      if (!choice) {
        return {
          status: "waiting",
          nextState: {
            ...state,
            step: "awaiting_note_choice"
          },
          message: "메모를 남길까? (yes/no)"
        };
      }

      return {
        status: "waiting",
        nextState: {
          ...state,
          step: "awaiting_quantity"
        },
        message: "보유 수량을 숫자로 입력해줘."
      };
    }
    case "awaiting_quantity": {
      if (!isNumericInput(normalizedInput)) {
        return {
          status: "invalid",
          nextState: state,
          message: "보유 수량은 숫자로만 입력해줘."
        };
      }

      return {
        status: "waiting",
        nextState: {
          ...state,
          step: "awaiting_note_choice",
          draft: {
            ...state.draft,
            quantity: normalizedInput
          }
        },
        message: "메모를 남길까? (yes/no)"
      };
    }
    case "awaiting_note_choice": {
      const choice = parseYesNo(normalizedInput);

      if (choice === null) {
        return {
          status: "invalid",
          nextState: state,
          message: "yes 또는 no로 답해줘."
        };
      }

      if (!choice) {
        return completePortfolioAddConversation(state);
      }

      return {
        status: "waiting",
        nextState: {
          ...state,
          step: "awaiting_note"
        },
        message: "메모를 입력해줘."
      };
    }
    case "awaiting_note":
      return completePortfolioAddConversation({
        ...state,
        draft: {
          ...state.draft,
          note: normalizedInput
        }
      });
  }
}

function advancePortfolioRemoveConversation(
  state: PortfolioRemoveState,
  input: string,
  resolver: StaticInstrumentResolver
): ConversationTransitionResult {
  const resolution = resolver.resolvePortfolioTicker(input.trim());

  if (!resolution) {
    return {
      status: "invalid",
      nextState: state,
      message: "삭제할 종목을 해석하지 못했어. 티커나 종목명을 다시 입력해줘."
    };
  }

  return {
    status: "completed",
    completion: {
      command: "portfolio_remove",
      resolution
    },
    message: `${resolution.companyName} (${resolution.symbol}, ${resolution.exchange}) 삭제 요청을 기록했어. 실제 삭제 저장은 다음 단계에서 연결할게.`
  };
}

function advanceMarketAddConversation(
  state: MarketAddState,
  input: string,
  resolver: StaticInstrumentResolver
): ConversationTransitionResult {
  const resolution = resolver.resolveMarketIndicator(input.trim());

  if (!resolution) {
    return {
      status: "invalid",
      nextState: state,
      message: "시장 지표를 해석하지 못했어. KOSPI, VIX 같은 지원 항목으로 다시 입력해줘."
    };
  }

  return {
    status: "completed",
    completion: {
      command: "market_add",
      resolution
    },
    message: `${resolution.itemName} (${resolution.itemCode}) 추가 요청을 기록했어. 실제 저장 연결은 다음 단계에서 진행할게.`
  };
}

function completePortfolioAddConversation(state: PortfolioAddState): ConversationTransitionResult {
  if (!state.draft.resolution) {
    throw new Error("Portfolio add conversation completed without a resolved ticker");
  }

  const completionDraft: ConversationCompletion = {
    command: "portfolio_add",
    draft: {
      ...state.draft.resolution
    }
  };

  if (state.draft.avgPrice) {
    completionDraft.draft.avgPrice = state.draft.avgPrice;
  }

  if (state.draft.quantity) {
    completionDraft.draft.quantity = state.draft.quantity;
  }

  if (state.draft.note) {
    completionDraft.draft.note = state.draft.note;
  }

  return {
    status: "completed",
    completion: completionDraft,
    message: `${state.draft.resolution.companyName} (${state.draft.resolution.symbol}, ${state.draft.resolution.exchange}) 입력 흐름을 기록했어. 실제 저장 연결은 다음 단계에서 진행할게.`
  };
}

function parseYesNo(value: string): boolean | null {
  const normalizedValue = value.trim().toLowerCase();

  if (["yes", "y", "네", "예"].includes(normalizedValue)) {
    return true;
  }

  if (["no", "n", "아니오", "아니요"].includes(normalizedValue)) {
    return false;
  }

  return null;
}

function isNumericInput(value: string): boolean {
  return /^(\d+)(\.\d+)?$/.test(value.trim());
}
