import Link from "next/link";
import { ArrowUpRight, BarChart3 } from "lucide-react";

import type { PublicReport } from "../types/report";
import { normalizeMarketRegime, scoreTone } from "../lib/report-feed";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";

export function ReportCard({ report }: { report: PublicReport }) {
  const marketRegime = normalizeMarketRegime(report.marketRegime);
  const scoreBadgeTone =
    scoreTone(report.totalScore) === "positive"
      ? "positive"
      : scoreTone(report.totalScore) === "negative"
        ? "negative"
        : "neutral";
  const regimeTone =
    marketRegime === "Risk-On"
      ? "positive"
      : marketRegime === "Risk-Off"
        ? "negative"
        : "neutral";

  return (
    <Card className="group overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[0.78rem] font-medium text-[color:var(--muted)]">
              <span>{report.reportDate}</span>
              <span className="inline-flex h-1 w-1 rounded-full bg-[color:var(--line-strong)]" />
              <span>{formatCreatedAt(report.createdAt)}</span>
            </div>
            <h3 className="text-balance text-[1.6rem] font-semibold leading-8 tracking-[-0.04em] text-[color:var(--foreground)]">
              {report.summary}
            </h3>
            <p className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
              <BarChart3 className="h-4 w-4" />
              최신 공개 브리핑 요약과 핵심 시그널만 간결하게 보여줍니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={regimeTone}>{marketRegime}</Badge>
            <Badge tone={scoreBadgeTone}>
              Total {report.totalScore > 0 ? "+" : ""}
              {report.totalScore.toFixed(2)}
            </Badge>
          </div>
        </div>
        <Separator />
        <div className="flex flex-wrap gap-2">
          {report.signals.slice(0, 3).map((signal) => (
            <span key={signal} className="signal-chip">
              {signal}
            </span>
          ))}
          {report.signals.length === 0 ? (
            <span className="text-sm text-[color:var(--muted)]">
              핵심 시그널이 아직 정리되지 않았습니다.
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[color:var(--muted)]">
            시그널 {Math.min(report.signals.length, 3)}개 · 공개 아카이브 기준
          </p>
          <Button asChild size="sm">
            <Link href={`/reports/${report.id}`}>
              상세 브리핑 보기
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "기록 시각 미상";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
