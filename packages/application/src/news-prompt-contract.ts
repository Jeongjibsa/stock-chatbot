import type { HoldingReference, NewsArticle, NewsEvent } from "./news.js";

export type NewsEventExtractionPrompt = {
  input: string;
  instructions: string;
  metadata: Record<string, string>;
};

export type NewsEventExtractionOutput = {
  events: NewsEvent[];
};

export function buildNewsEventExtractionPrompt(input: {
  articles: NewsArticle[];
  holding: HoldingReference;
}): NewsEventExtractionPrompt {
  return {
    instructions: [
      "너는 투자 리포트용 뉴스 이벤트 추출기야.",
      "반드시 JSON 객체만 반환해.",
      '최상위 키는 "events" 하나만 사용해.',
      '각 event는 eventType, headline, summary, sentiment, confidence, supportingArticleIds를 포함해야 해.',
      "sentiment는 positive, neutral, negative 중 하나만 허용해.",
      "confidence는 low, medium, high 중 하나만 허용해.",
      "eventType은 earnings, guidance, macro, merger, product, regulation, supply_chain, other 중 하나만 허용해.",
      "기사에 근거가 없으면 events는 빈 배열로 반환해."
    ].join("\n"),
    input: JSON.stringify({
      holding: input.holding,
      articles: input.articles.map((article) => ({
        id: article.id,
        title: article.title,
        summary: article.summary ?? "",
        publishedAt: article.publishedAt,
        sourceName: article.sourceName
      }))
    }),
    metadata: {
      holdingSymbol: input.holding.symbol,
      promptKind: "news-event-extraction"
    }
  };
}

export function parseNewsEventExtractionOutput(
  outputText: string
): NewsEventExtractionOutput {
  const parsed = JSON.parse(outputText) as Record<string, unknown>;
  const events = Array.isArray(parsed.events) ? parsed.events : null;

  if (!events) {
    throw new Error("LLM news extraction output is missing events array");
  }

  return {
    events: events.map(parseNewsEvent)
  };
}

function parseNewsEvent(value: unknown): NewsEvent {
  if (!value || typeof value !== "object") {
    throw new Error("LLM news extraction event must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const supportingArticleIds = Array.isArray(candidate.supportingArticleIds)
    ? candidate.supportingArticleIds.filter((item): item is string => typeof item === "string")
    : [];

  if (
    typeof candidate.headline !== "string" ||
    typeof candidate.summary !== "string" ||
    !isNewsEventSentiment(candidate.sentiment) ||
    !isNewsEventConfidence(candidate.confidence) ||
    !isNewsEventType(candidate.eventType)
  ) {
    throw new Error("LLM news extraction event contains invalid fields");
  }

  return {
    confidence: candidate.confidence,
    eventType: candidate.eventType,
    headline: candidate.headline,
    sentiment: candidate.sentiment,
    summary: candidate.summary,
    supportingArticleIds
  };
}

function isNewsEventSentiment(value: unknown): value is NewsEvent["sentiment"] {
  return value === "negative" || value === "neutral" || value === "positive";
}

function isNewsEventConfidence(value: unknown): value is NewsEvent["confidence"] {
  return value === "high" || value === "low" || value === "medium";
}

function isNewsEventType(value: unknown): value is NewsEvent["eventType"] {
  return (
    value === "earnings" ||
    value === "guidance" ||
    value === "macro" ||
    value === "merger" ||
    value === "product" ||
    value === "regulation" ||
    value === "supply_chain" ||
    value === "other"
  );
}
