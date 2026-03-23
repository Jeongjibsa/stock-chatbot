import type {
  MarketIndicatorResolution,
  PortfolioTickerResolution,
  RankedTickerSearchResult,
  StaticInstrumentResolver
} from "@stock-chatbot/application";
import { parseReportTimeArgument } from "./report-settings.js";

export type ConversationCommand =
  | "market_add"
  | "portfolio_add"
  | "portfolio_bulk"
  | "portfolio_remove"
  | "report_time";

export type PortfolioTickerSearchPort = {
  pickHighConfidenceSingleResult(
    results: RankedTickerSearchResult[]
  ): RankedTickerSearchResult | null;
  search(query: string, limit?: number): Promise<RankedTickerSearchResult[]>;
  toPortfolioTickerResolution(result: RankedTickerSearchResult): PortfolioTickerResolution;
};

export type ConversationDependencies = {
  marketResolver: Pick<StaticInstrumentResolver, "resolveMarketIndicator">;
  portfolioTickerSearch: PortfolioTickerSearchPort;
};

export type PortfolioAddState = {
  command: "portfolio_add";
  draft: {
    avgPrice?: string;
    quantity?: string;
    resolution?: PortfolioTickerResolution;
    searchResults?: RankedTickerSearchResult[];
  };
  step:
    | "awaiting_avg_price"
    | "awaiting_avg_price_choice"
    | "awaiting_quantity"
    | "awaiting_quantity_choice"
    | "awaiting_ticker_confirmation"
    | "awaiting_ticker_query"
    | "awaiting_ticker_selection";
};

export type PortfolioBulkState = {
  command: "portfolio_bulk";
  draft: {};
  step: "awaiting_portfolio_bulk_input";
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

export type ReportTimeState = {
  command: "report_time";
  draft: {};
  step: "awaiting_time";
};

export type ConversationState =
  | MarketAddState
  | PortfolioAddState
  | PortfolioBulkState
  | PortfolioRemoveState
  | ReportTimeState;

export type ConversationCompletion =
  | {
      command: "market_add";
      resolution: MarketIndicatorResolution;
    }
  | {
      command: "portfolio_add";
      draft: NonNullable<PortfolioAddState["draft"]["resolution"]> & {
        avgPrice?: string;
        quantity?: string;
      };
    }
  | {
      command: "portfolio_bulk";
      tokens: string[];
    }
  | {
      command: "portfolio_remove";
      resolution: PortfolioTickerResolution;
    }
  | {
      command: "report_time";
      hour: number;
      minute: number;
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

export type ConversationStateStore = {
  clear(userKey: string): Promise<void> | void;
  get(userKey: string): Promise<ConversationState | null> | ConversationState | null;
  set(userKey: string, state: ConversationState): Promise<void> | void;
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
        step: "awaiting_ticker_query",
        draft: {}
      };
    case "portfolio_bulk":
      return {
        command,
        step: "awaiting_portfolio_bulk_input",
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
    case "report_time":
      return {
        command,
        step: "awaiting_time",
        draft: {}
      };
  }
}

export function getConversationStartMessage(command: ConversationCommand): string {
  switch (command) {
    case "portfolio_add":
      return "종목명을 입력해주세요.";
    case "portfolio_bulk":
      return "여러 종목을 쉼표, 줄바꿈, 세미콜론으로 구분해서 입력해 주세요.";
    case "portfolio_remove":
      return "삭제할 종목명 또는 종목 코드를 입력해 주세요.";
    case "market_add":
      return "추가할 시장 지표 이름이나 코드(KOSPI, VIX 등)를 입력해 주세요.";
    case "report_time":
      return "변경할 브리핑 시간을 HH:MM 형식으로 입력해 주세요. 예: 08:30";
  }
}

export async function advanceConversation(
  state: ConversationState,
  input: string,
  dependencies: ConversationDependencies
): Promise<ConversationTransitionResult> {
  switch (state.command) {
    case "portfolio_add":
      return advancePortfolioAddConversation(state, input, dependencies);
    case "portfolio_bulk":
      return advancePortfolioBulkConversation(state, input);
    case "portfolio_remove":
      return advancePortfolioRemoveConversation(state, input, dependencies);
    case "market_add":
      return advanceMarketAddConversation(state, input, dependencies);
    case "report_time":
      return advanceReportTimeConversation(state, input);
  }
}

async function advanceReportTimeConversation(
  state: ReportTimeState,
  input: string
): Promise<ConversationTransitionResult> {
  const parsed = parseReportTimeArgument(input.trim());

  if (!parsed) {
    return {
      status: "invalid",
      nextState: state,
      message: "시간 형식이 올바르지 않습니다. 예: 08:30"
    };
  }

  return {
    status: "completed",
    completion: {
      command: "report_time",
      hour: parsed.hour,
      minute: parsed.minute
    },
    message: `정기 브리핑 시간을 ${input.trim()}로 변경합니다.`
  };
}

async function advancePortfolioBulkConversation(
  state: PortfolioBulkState,
  input: string
): Promise<ConversationTransitionResult> {
  const tokens = input
    .split(/[\n,;]+/g)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return {
      status: "invalid",
      nextState: state,
      message: "등록할 종목을 한 개 이상 입력해 주세요."
    };
  }

  return {
    status: "completed",
    completion: {
      command: "portfolio_bulk",
      tokens
    },
    message: `${tokens.length}개 종목의 벌크 추가 요청을 기록했어.`
  };
}

async function advancePortfolioAddConversation(
  state: PortfolioAddState,
  input: string,
  dependencies: ConversationDependencies
): Promise<ConversationTransitionResult> {
  const normalizedInput = input.trim();

  switch (state.step) {
    case "awaiting_ticker_query": {
      const results = await dependencies.portfolioTickerSearch.search(normalizedInput, 5);

      if (results.length === 0) {
        return {
          status: "invalid",
          nextState: state,
          message: "검색 결과가 없습니다. 다시 입력해주세요."
        };
      }

      const singleHighConfidence =
        dependencies.portfolioTickerSearch.pickHighConfidenceSingleResult(results);

      if (singleHighConfidence) {
        return {
          status: "waiting",
          nextState: {
            ...state,
            step: "awaiting_ticker_confirmation",
            draft: {
              ...state.draft,
              resolution:
                dependencies.portfolioTickerSearch.toPortfolioTickerResolution(
                  singleHighConfidence
                ),
              searchResults: [singleHighConfidence]
            }
          },
          message: `${singleHighConfidence.name} (${singleHighConfidence.symbol})를 추가할까요? [예/아니오]`
        };
      }

      return {
        status: "waiting",
        nextState: {
          ...state,
          step: "awaiting_ticker_selection",
          draft: {
            ...state.draft,
            searchResults: results
          }
        },
        message: buildTickerSelectionMessage(results)
      };
    }
    case "awaiting_ticker_confirmation": {
      const choice = parseYesNo(normalizedInput);

      if (choice === null) {
        return {
          status: "invalid",
          nextState: state,
          message: "예 또는 아니오로 답해주세요."
        };
      }

      if (!choice) {
        return {
          status: "waiting",
          nextState: {
            command: "portfolio_add",
            step: "awaiting_ticker_query",
            draft: {}
          },
          message: "알겠습니다. 다른 종목명을 입력해주세요."
        };
      }

      if (!state.draft.resolution) {
        throw new Error("Portfolio add confirmation reached without a resolution");
      }

      return {
        status: "waiting",
        nextState: {
          ...state,
          step: "awaiting_avg_price_choice"
        },
        message: "평균 매수가를 입력할까요? (yes/no)"
      };
    }
    case "awaiting_ticker_selection": {
      const searchResults = state.draft.searchResults ?? [];
      const selectionIndex = parseSelectionIndex(normalizedInput, searchResults.length);

      if (selectionIndex === null) {
        return {
          status: "invalid",
          nextState: state,
          message: `1부터 ${searchResults.length} 사이 번호를 입력해주세요.`
        };
      }

      const selected = searchResults[selectionIndex];

      if (!selected) {
        return {
          status: "invalid",
          nextState: state,
          message: `1부터 ${searchResults.length} 사이 번호를 입력해주세요.`
        };
      }

      return {
        status: "waiting",
        nextState: {
          ...state,
          step: "awaiting_avg_price_choice",
          draft: {
            ...state.draft,
            resolution: dependencies.portfolioTickerSearch.toPortfolioTickerResolution(
              selected
            ),
            searchResults: [selected]
          }
        },
        message: `${selected.name} (${selected.symbol})를 선택했습니다. 평균 매수가를 입력할까요? (yes/no)`
      };
    }
    case "awaiting_avg_price_choice": {
      const choice = parseYesNo(normalizedInput);

      if (choice === null) {
        return {
          status: "invalid",
          nextState: state,
          message: "yes/no 또는 예/아니오로 답해주세요."
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
          message: "yes/no 또는 예/아니오로 답해주세요."
        };
      }

      if (!choice) {
        return completePortfolioAddConversation(state);
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

      return completePortfolioAddConversation({
        ...state,
        draft: {
          ...state.draft,
          quantity: normalizedInput
        }
      });
    }
  }
}

async function advancePortfolioRemoveConversation(
  state: PortfolioRemoveState,
  input: string,
  dependencies: ConversationDependencies
): Promise<ConversationTransitionResult> {
  const results = await dependencies.portfolioTickerSearch.search(input.trim(), 5);
  const resolutionResult =
    dependencies.portfolioTickerSearch.pickHighConfidenceSingleResult(results);

  if (!resolutionResult) {
    return {
      status: "invalid",
      nextState: state,
      message: "삭제할 종목을 찾지 못했습니다. 종목명이나 종목 코드를 다시 입력해 주세요."
    };
  }

  const resolution =
    dependencies.portfolioTickerSearch.toPortfolioTickerResolution(resolutionResult);

  return {
    status: "completed",
    completion: {
      command: "portfolio_remove",
      resolution
    },
    message: `${resolution.companyName} (${resolution.symbol}, ${resolution.exchange}) 삭제 요청을 기록했어. 실제 삭제 저장은 다음 단계에서 연결할게.`
  };
}

async function advanceMarketAddConversation(
  state: MarketAddState,
  input: string,
  dependencies: ConversationDependencies
): Promise<ConversationTransitionResult> {
  const resolution = dependencies.marketResolver.resolveMarketIndicator(input.trim());

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

function completePortfolioAddConversation(
  state: PortfolioAddState
): ConversationTransitionResult {
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

  return {
    status: "completed",
    completion: completionDraft,
    message: `${state.draft.resolution.companyName} (${state.draft.resolution.symbol}, ${state.draft.resolution.exchange}) 입력 흐름을 기록했어. 실제 저장 연결은 다음 단계에서 진행할게.`
  };
}

function buildTickerSelectionMessage(results: RankedTickerSearchResult[]): string {
  return [
    "검색 결과입니다. 번호를 입력해주세요.",
    ...results.map(
      (result, index) => `${index + 1}. ${result.name} (${result.symbol}) · ${result.market}`
    )
  ].join("\n");
}

function parseSelectionIndex(value: string, length: number): number | null {
  const numericValue = Number.parseInt(value.trim(), 10);

  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > length) {
    return null;
  }

  return numericValue - 1;
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
