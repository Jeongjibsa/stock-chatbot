import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";

import { formatBriefingSessionLabel, formatBriefingSessionRole } from "@stock-chatbot/application";

import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { MarkdownReport } from "../../../components/markdown-report";
import { getPublicReportById } from "../../../lib/public-reports";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;

  try {
    const report = await getPublicReportById(id);

    if (!report) {
      notFound();
    }

    return (
      <main className="pb-12">
        <div className="space-y-8">
          <header className="report-shell overflow-hidden p-8 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-label">Report Detail</p>
                <h1 className="gradient-title mt-4 text-[2.55rem] font-semibold tracking-[-0.05em]">
                  {report.reportDate}
                </h1>
                <p className="mt-3 text-sm font-medium text-[color:var(--muted)]">
                  {formatBriefingSessionLabel(report.briefingSession)} · {formatBriefingSessionRole(report.briefingSession)}
                </p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                  피드로 돌아가기
                </Link>
              </Button>
            </div>
            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[color:var(--muted)]">
              {report.summary}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {report.indicatorTags.map((tag) => (
                <span key={tag} className="signal-chip">
                  {tag}
                </span>
              ))}
            </div>
          </header>

          <div className="flex flex-col gap-8">
            <Card className="border-none bg-white shadow-[0_8px_30px_rgba(15,23,42,0.03)] ring-1 ring-[color:var(--line)]">
              <CardContent className="space-y-5 p-7 sm:p-10">
                <div className="space-y-1">
                  <p className="section-label">Executive Signals</p>
                  <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                    오늘의 핵심 요약 시그널
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {report.signals.map((signal) => (
                    <span key={signal} className="signal-chip">
                      {signal}
                    </span>
                  ))}
                  {report.signals.length === 0 ? (
                    <p className="text-[0.95rem] text-[color:var(--muted)]">요약된 시그널이 없습니다.</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-white shadow-[0_8px_30px_rgba(15,23,42,0.03)] ring-1 ring-[color:var(--line)]">
              <CardContent className="p-7 sm:p-10">
                <MarkdownReport content={report.contentMarkdown} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="space-y-3">
            <p className="section-label text-[color:var(--accent-strong)]">
              Error
            </p>
            <h1 className="text-[1.8rem] font-semibold tracking-[-0.04em]">
              상세 브리핑을 불러오지 못했습니다.
            </h1>
            <p className="text-[0.95rem] leading-8 text-[color:var(--muted)]">
              데이터베이스 연결 상태와 공개 브리핑 생성 경로를 확인해 주세요.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }
}
