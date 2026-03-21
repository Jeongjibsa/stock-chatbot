import Link from "next/link";

import type { PublicReport } from "../types/report";
import { normalizeMarketRegime, scoreTone } from "../lib/report-feed";
import { Badge } from "./ui/badge";
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
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {report.reportDate}
            </p>
            <h3 className="text-lg font-semibold leading-7">{report.summary}</h3>
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
            <span
              key={signal}
              className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-3 py-1 text-xs text-[color:var(--muted)]"
            >
              {signal}
            </span>
          ))}
          {report.signals.length === 0 ? (
            <span className="text-sm text-[color:var(--muted)]">
              핵심 시그널이 아직 정리되지 않았습니다.
            </span>
          ) : null}
        </div>
        <div>
          <Link
            className="text-sm font-semibold text-[color:var(--accent)]"
            href={`/reports/${report.id}`}
          >
            상세 브리핑 보기
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
