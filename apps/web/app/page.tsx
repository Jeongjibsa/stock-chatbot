import Link from "next/link";
import { connection } from "next/server";
import { Activity, ArrowUpRight } from "lucide-react";

import { FeedEmptyState } from "../components/feed-empty-state";
import { FeedErrorState } from "../components/feed-error-state";
import { ReportCard } from "../components/report-card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { groupReportsByDate } from "../lib/report-feed";
import { listPublicReports } from "../lib/public-reports";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await connection();

  try {
    const reports = await listPublicReports();

    if (reports.length === 0) {
      return (
        <main className="pb-12">
          <header className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
            <div className="report-shell overflow-hidden p-7 sm:p-10">
              <p className="section-label">Stock Briefing Archive</p>
              <h1 className="gradient-title mt-4 max-w-[9ch] text-balance text-[2.4rem] font-semibold leading-[1.02] sm:text-[3.3rem]">
                공개 브리핑 피드
              </h1>
              <p className="mt-4 max-w-2xl text-[0.95rem] leading-7 text-[color:var(--muted)] sm:text-[0.98rem] sm:leading-8">
                날짜별 최신순으로 정리된 시장 브리핑 archive입니다. 공개 웹은 개인화
                포트폴리오를 제외한 공용 브리핑만 제공합니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="muted">mobile-first public archive</Badge>
                <Badge tone="muted">Telegram summary linked</Badge>
              </div>
            </div>
            <Card className="feed-stripe overflow-hidden">
              <CardContent className="flex h-full flex-col justify-between gap-6">
                <div>
                  <p className="section-label">Runtime</p>
                  <p className="mt-3 text-[1.08rem] font-semibold tracking-[-0.03em] text-[color:var(--foreground)] sm:text-[1.15rem]">
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
                      <ArrowUpRight />
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
        <header className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
          <div className="report-shell overflow-hidden p-7 sm:p-10">
            <p className="section-label">Stock Briefing Archive</p>
            <h1 className="gradient-title mt-4 max-w-[9ch] text-balance text-[2.45rem] font-semibold leading-[1.02] sm:text-[3.5rem]">
              최신순 공개 브리핑 피드
            </h1>
            <p className="mt-4 max-w-2xl text-[0.95rem] leading-7 text-[color:var(--muted)] sm:text-[0.98rem] sm:leading-8">
              미국·한국 시장 브리핑을 날짜별로 묶어 읽을 수 있는 archive입니다.
              개인화 포트폴리오 정보는 포함하지 않습니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="muted">pastel blue accent</Badge>
              <Badge tone="muted">public-only briefing</Badge>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={`/reports/${latestReport.id}`}>
                  최신 브리핑 보기
                  <ArrowUpRight />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="https://t.me/JungStock_bot">
                  Telegram 봇 열기
                  <ArrowUpRight />
                </Link>
              </Button>
            </div>
            <div className="subtle-panel mt-6 flex flex-col gap-3 p-4 sm:p-5">
              <p className="section-label">Latest Summary</p>
              <p className="text-[1.05rem] font-semibold leading-7 tracking-[-0.03em] text-[color:var(--foreground)] sm:text-[1.12rem]">
                {latestReport.summary}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge tone="indicator">
                  {latestReport.reportDate}
                </Badge>
                <Badge tone="signal">
                  {latestReport.signals.length > 0
                    ? `핵심 시그널 ${Math.min(latestReport.signals.length, 3)}개`
                    : "시그널 정리 대기"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid gap-5">
            <Card>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="section-label">Reports</p>
                  <p className="data-value mt-3">{reports.length}</p>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">누적 공개 브리핑 수</p>
                </div>
                <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4">
                  <p className="section-label">Cadence</p>
                  <p className="mt-3 flex items-center gap-2 text-[1rem] font-semibold tracking-[-0.03em]">
                    <Activity className="size-4 text-[color:var(--accent-strong)]" />
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
        <div className="flex flex-col gap-12">
          {grouped.map((group) => (
            <section key={group.reportDate} className="flex flex-col gap-5">
              <div className="flex items-end gap-4">
                <div className="flex flex-col gap-1">
                  <p className="section-label">Date Group</p>
                  <h2 className="text-[1.55rem] font-semibold tracking-[-0.045em] text-[color:var(--foreground)] sm:text-[1.7rem]">
                    {group.reportDate}
                  </h2>
                </div>
                <div className="mb-2 h-px flex-1 bg-[color:var(--line)]" />
                <p className="mb-1 text-[0.82rem] font-medium text-[color:var(--muted)]">
                  {group.reports.length} items
                </p>
              </div>
              <div className="flex flex-col gap-4">
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
        <header className="mb-8 report-shell p-7 sm:p-10">
          <p className="section-label">Stock Briefing Archive</p>
          <h1 className="gradient-title mt-4 text-[2.2rem] font-semibold sm:text-[2.3rem]">
            공개 브리핑 피드
          </h1>
        </header>
        <FeedErrorState />
      </main>
    );
  }
}
