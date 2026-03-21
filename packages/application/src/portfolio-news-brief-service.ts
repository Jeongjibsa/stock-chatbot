import type { LlmClient } from "./llm-client.js";
import { dedupeNewsArticles, normalizeNewsArticles } from "./news-normalization.js";
import {
  buildNewsEventExtractionPrompt,
  parseNewsEventExtractionOutput
} from "./news-prompt-contract.js";
import type {
  HoldingNewsBrief,
  HoldingReference,
  NewsCollectionAdapter
} from "./news.js";

export class PortfolioNewsBriefService {
  constructor(
    private readonly dependencies: {
      llmClient: LlmClient;
      newsCollectionAdapter: NewsCollectionAdapter;
    }
  ) {}

  async generateBriefsForHoldings(
    holdings: HoldingReference[]
  ): Promise<HoldingNewsBrief[]> {
    const briefs: HoldingNewsBrief[] = [];

    for (const holding of holdings) {
      try {
        const articles = await this.dependencies.newsCollectionAdapter.fetchLatestForHolding({
          holding,
          limit: 6
        });
        const normalizedArticles = dedupeNewsArticles(normalizeNewsArticles(articles));

        if (normalizedArticles.length === 0) {
          briefs.push({
            holding,
            articles: [],
            events: [],
            status: "unavailable",
            errorMessage: "관련 뉴스를 찾지 못했어."
          });
          continue;
        }

        const prompt = buildNewsEventExtractionPrompt({
          holding,
          articles: normalizedArticles
        });
        const llmResponse = await this.dependencies.llmClient.generate({
          task: "news-event-extraction",
          input: prompt.input,
          instructions: prompt.instructions,
          metadata: prompt.metadata
        });
        const parsed = parseNewsEventExtractionOutput(llmResponse.outputText);
        const brief: HoldingNewsBrief = {
          holding,
          articles: normalizedArticles,
          events: parsed.events,
          status: "ok"
        };

        if (llmResponse.id) {
          brief.llmResponseId = llmResponse.id;
        }

        briefs.push(brief);
      } catch (error) {
        briefs.push({
          holding,
          articles: [],
          events: [],
          status: "partial_success",
          errorMessage:
            error instanceof Error ? error.message : "뉴스 요약 생성에 실패했어."
        });
      }
    }

    return briefs;
  }
}
