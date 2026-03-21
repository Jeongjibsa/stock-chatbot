import { notFound } from "next/navigation";

import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import { MarkdownReport } from "../../../components/markdown-report";
import { normalizeMarketRegime, scoreTone } from "../../../lib/report-feed";
import { getPublicReportById } from "../../../lib/public-reports";

export default async function ReportDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const report = await getPublicReportById(id);

    if (!report) {
      notFound();
    }

    const marketRegime = normalizeMarketRegime(report.marketRegime);
    const regimeTone =
      marketRegime === "Risk-On"
        ? "positive"
        : marketRegime === "Risk-Off"
          ? "negative"
          : "neutral";
    const totalScoreTone = scoreTone(report.totalScore);

    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Report Detail
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">{report.reportDate}</h1>
            <p className="max-w-3xl text-sm leading-7 text-[color:var(--muted)]">
              {report.summary}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge tone={regimeTone}>{marketRegime}</Badge>
              <Badge tone={totalScoreTone}>
                Total {report.totalScore > 0 ? "+" : ""}
                {report.totalScore.toFixed(2)}
              </Badge>
            </div>
          </header>

          <Card>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {report.signals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-1 text-xs text-[color:var(--muted)]"
                  >
                    {signal}
                  </span>
                ))}
              </div>
              <MarkdownReport content={report.contentMarkdown} />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="border-red-200/80 dark:border-red-500/20">
          <CardContent className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700 dark:text-red-300">
              Error
            </p>
            <h1 className="text-2xl font-semibold">상세 브리핑을 불러오지 못했습니다.</h1>
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              데이터베이스 연결 상태와 공개 브리핑 생성 경로를 확인해 주세요.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }
}
