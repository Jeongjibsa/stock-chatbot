export type PublicReport = {
  briefingSession: "post_market" | "pre_market" | "weekend_briefing";
  contentMarkdown: string;
  createdAt: string;
  id: string;
  indicatorTags: string[];
  marketRegime: string;
  newsReferences: Array<{ sourceLabel: string; title: string; url: string }>;
  reportDate: string;
  signals: string[];
  summary: string;
  totalScore: number;
};

export type ReportsByDate = Array<{
  reportDate: string;
  reports: PublicReport[];
}>;
