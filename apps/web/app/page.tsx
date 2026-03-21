import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";

import { FeedEmptyState } from "../components/feed-empty-state";
import { FeedErrorState } from "../components/feed-error-state";
import { ReportCard } from "../components/report-card";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { groupReportsByDate } from "../lib/report-feed";
import { listPublicReports } from "../lib/public-reports";

export default async function HomePage() {
  try {
    const reports = await listPublicReports();

    if (reports.length === 0) {
      return (
        <main className="pb-12">
          <header className="mb-10 grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="report-shell soft-grid overflow-hidden p-8 sm:p-10">
              <p className="section-label">Stock Briefing Archive</p>
              <h1 className="gradient-title mt-4 text-balance text-[2.7rem] font-semibold sm:text-[3.4rem]">
                공개 브리핑 피드
              </h1>
              <p className="mt-5 max-w-3xl text-[0.98rem] leading-8 text-[color:var(--muted)]">
                날짜별 최신순으로 정리된 시장 브리핑 archive입니다. 공개 웹은 개인화
                포트폴리오를 제외한 공용 브리핑만 제공합니다.
              </p>
            </div>
            <Card className="feed-stripe overflow-hidden">
              <CardContent className="flex h-full flex-col justify-between gap-6">
                <div>
                  <p className="section-label">Runtime</p>
                  <p className="mt-3 text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                    Telegram 요약본과 공개 웹 feed를 한 흐름으로 운영합니다.
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                    Vercel webhook, cron, Neon 기반 read model을 공용으로 사용합니다.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href="https://t.me/JungStock_bot">
                      Telegram 봇 열기
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </header>
          <FeedEmptyState />
        </main>
      );
    }

    const grouped = groupReportsByDate(reports);
    const latestReport = reports[0]!;

    return (
      <main className="pb-12">
        <header className="mb-12 grid gap-5 lg:grid-cols-[1.38fr_0.82fr]">
          <div className="report-shell soft-grid overflow-hidden p-8 sm:p-10">
            <p className="section-label">Stock Briefing Archive</p>
            <h1 className="gradient-title mt-4 text-balance text-[2.7rem] font-semibold sm:text-[3.5rem]">
              최신순 공개 브리핑 피드
            </h1>
            <p className="mt-5 max-w-3xl text-[0.98rem] leading-8 text-[color:var(--muted)]">
              미국·한국 시장 브리핑을 날짜별로 묶어 읽을 수 있는 archive입니다.
              개인화 포트폴리오 정보는 포함하지 않습니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/reports/${latestReport.id}`}>
                  최신 브리핑 보기
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-5">
            <Card className="feed-stripe overflow-hidden">
              <CardContent className="space-y-4">
                <p className="section-label">Latest Summary</p>
                <p className="text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                  {latestReport.summary}
                </p>
                <p className="text-sm leading-7 text-[color:var(--muted)]">
                  가장 최근에 저장된 공개 브리핑의 요약입니다.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="section-label">Reports</p>
                  <p className="data-value mt-3">
                    {reports.length}
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">누적 공개 브리핑 수</p>
                </div>
                <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4">
                  <p className="section-label">Cadence</p>
                  <p className="mt-3 flex items-center gap-2 text-[1rem] font-semibold tracking-[-0.03em]">
                    <Activity className="h-4 w-4 text-[color:var(--accent)]" />
                    Daily archive
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    텔레그램 요약본과 같은 기준일로 동기화
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </header>
        <div className="space-y-14">
          {grouped.map((group) => (
            <section key={group.reportDate} className="space-y-5">
              <div className="flex items-end gap-4">
                <div className="space-y-1">
                  <p className="section-label">Date Group</p>
                  <h2 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                    {group.reportDate}
                  </h2>
                </div>
                <div className="mb-2 h-px flex-1 bg-[color:var(--line)]" />
                <p className="mb-1 text-sm font-medium text-[color:var(--muted)]">
                  {group.reports.length} items
                </p>
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
      <main className="pb-12">
        <header className="mb-8 report-shell p-8 sm:p-10">
          <p className="section-label">Stock Briefing Archive</p>
          <h1 className="gradient-title mt-4 text-[2.3rem] font-semibold">
            공개 브리핑 피드
          </h1>
        </header>
        <FeedErrorState />
      </main>
    );
  }
}
