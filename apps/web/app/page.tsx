import { FeedEmptyState } from "../components/feed-empty-state";
import { FeedErrorState } from "../components/feed-error-state";
import { ReportCard } from "../components/report-card";
import { groupReportsByDate } from "../lib/report-feed";
import { listPublicReports } from "../lib/public-reports";

export default async function HomePage() {
  try {
    const reports = await listPublicReports();

    if (reports.length === 0) {
      return (
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <header className="mb-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
              Stock Briefing Archive
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">공개 브리핑 피드</h1>
            <p className="max-w-3xl text-sm leading-7 text-[color:var(--muted)]">
              날짜별 최신순으로 정리된 시장 브리핑 archive입니다.
            </p>
          </header>
          <FeedEmptyState />
        </main>
      );
    }

    const grouped = groupReportsByDate(reports);

    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Stock Briefing Archive
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">공개 브리핑 피드</h1>
          <p className="max-w-3xl text-sm leading-7 text-[color:var(--muted)]">
            최신 기준일이 위로 오도록 정렬된 공개 시장 브리핑입니다. 개인화 포트폴리오
            정보는 포함하지 않습니다.
          </p>
        </header>
        <div className="space-y-10">
          {grouped.map((group) => (
            <section key={group.reportDate} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold">{group.reportDate}</h2>
                <div className="h-px flex-1 bg-[color:var(--line)]" />
              </div>
              <div className="space-y-4">
                {group.reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
            Stock Briefing Archive
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">공개 브리핑 피드</h1>
        </header>
        <FeedErrorState />
      </main>
    );
  }
}
