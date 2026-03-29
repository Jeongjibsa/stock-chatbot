import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { formatBriefingSessionLabel, formatBriefingSessionRole } from "@stock-chatbot/application";

import type { PublicReport } from "../types/report";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";

export function ReportCard({ report }: { report: PublicReport }) {
  void React;

  return (
    <Card className="group overflow-hidden border-none bg-white ring-1 ring-[color:var(--line)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
      <CardContent className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-[0.75rem] font-medium text-[color:var(--muted)]">
            <Badge tone="muted" className="tracking-[0.04em] normal-case">
              {report.reportDate}
            </Badge>
            <Badge tone="muted" className="tracking-[0.04em] normal-case">
              {formatBriefingSessionLabel(report.briefingSession)}
            </Badge>
            <span>{formatCreatedAt(report.createdAt)}</span>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="max-w-[40rem] text-balance text-[1.42rem] font-semibold leading-[1.28] tracking-[-0.045em] text-[color:var(--foreground)] sm:text-[1.68rem]">
              {report.summary}
            </h3>
            <p className="text-[0.93rem] leading-7 text-[color:var(--muted)]">
              {formatBriefingSessionRole(report.briefingSession)}에 맞춘 공개 브리핑 핵심만 압축해서 보여줍니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.indicatorTags.map((tag) => (
              <Badge
                key={tag}
                tone="indicator"
                className="tracking-[0.04em] normal-case"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <Separator />
        <div className="flex flex-wrap gap-2">
          {report.signals.slice(0, 3).map((signal) => (
            <Badge
              key={signal}
              tone="signal"
              className="text-left leading-5 tracking-normal normal-case"
            >
              {signal}
            </Badge>
          ))}
          {report.signals.length === 0 ? (
            <span className="text-sm text-[color:var(--muted)]">
              핵심 시그널이 아직 정리되지 않았습니다.
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.85rem] font-semibold text-[color:var(--muted)]">
            {report.signals.length > 0
              ? `핵심 시그널 ${Math.min(report.signals.length, 3)}개`
              : "핵심 시그널 정리 대기"}
          </p>
          <Button asChild size="default" className="w-full sm:w-auto">
            <Link href={`/reports/${report.id}`}>
              상세 브리핑 보기
              <ArrowUpRight />
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
