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
    <Card className="overflow-hidden">
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="kicker">
              {report.reportDate}
            </p>
            <h3 className="text-balance text-2xl font-semibold leading-8 tracking-tight">
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
            날짜별 feed에서 최신순으로 정렬됩니다.
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
