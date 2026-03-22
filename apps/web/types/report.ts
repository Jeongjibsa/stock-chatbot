export type PublicReport = {
  contentMarkdown: string;
  createdAt: string;
  id: string;
  indicatorTags: string[];
  marketRegime: string;
  reportDate: string;
  signals: string[];
  summary: string;
  totalScore: number;
};

export type ReportsByDate = Array<{
  reportDate: string;
  reports: PublicReport[];
}>;
