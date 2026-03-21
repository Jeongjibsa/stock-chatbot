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
        <main className="mx-auto max-w-6xl pb-12">
          <header className="mb-8 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="surface-panel rounded-[32px] p-8">
              <p className="kicker">
                Stock Briefing Archive
              </p>
              <h1 className="gradient-title mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                공개 브리핑 피드
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--muted)]">
                날짜별 최신순으로 정리된 시장 브리핑 archive입니다.
              </p>
            </div>
            <Card>
              <CardContent className="flex h-full flex-col justify-between gap-5">
                <div>
                  <p className="kicker">Runtime</p>
                  <p className="mt-3 text-lg font-semibold tracking-tight">
                    Telegram 요약본과 공개 웹 feed를 한 흐름으로 운영합니다.
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
      <main className="mx-auto max-w-6xl pb-12">
        <header className="mb-10 grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="surface-panel rounded-[32px] p-8">
            <p className="kicker">
              Stock Briefing Archive
            </p>
            <h1 className="gradient-title mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              최신순 공개 브리핑 피드
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--muted)]">
              미국·한국 시장 브리핑을 날짜별로 묶어 읽을 수 있는 archive입니다.
              개인화 포트폴리오 정보는 포함하지 않습니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/reports/${latestReport.id}`}>
                  최신 브리핑 보기
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            <Card>
              <CardContent className="space-y-3">
                <p className="kicker">Latest Summary</p>
                <p className="text-lg font-semibold tracking-tight">{latestReport.summary}</p>
                <p className="text-sm leading-7 text-[color:var(--muted)]">
                  가장 최근에 저장된 공개 브리핑의 요약입니다.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="kicker">Reports</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {reports.length}
                  </p>
                  <p className="text-sm text-[color:var(--muted)]">누적 공개 브리핑 수</p>
                </div>
                <div>
                  <p className="kicker">Cadence</p>
                  <p className="mt-2 flex items-center gap-2 text-lg font-semibold tracking-tight">
                    <Activity className="h-4 w-4 text-[color:var(--accent)]" />
                    Daily archive
                  </p>
                  <p className="text-sm text-[color:var(--muted)]">
                    텔레그램 요약본과 같은 기준일로 동기화
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </header>
        <div className="space-y-12">
          {grouped.map((group) => (
            <section key={group.reportDate} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">{group.reportDate}</h2>
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
      <main className="mx-auto max-w-6xl pb-12">
        <header className="mb-8 surface-panel rounded-[32px] p-8">
          <p className="kicker">
            Stock Briefing Archive
          </p>
          <h1 className="gradient-title mt-4 text-4xl font-semibold tracking-tight">
            공개 브리핑 피드
          </h1>
        </header>
        <FeedErrorState />
      </main>
    );
  }
}
