import Link from "next/link";

import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export function FeedEmptyState() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-6">
        <p className="section-label">Empty State</p>
        <div className="flex flex-col gap-2">
          <h2 className="max-w-[18ch] text-[1.9rem] font-semibold tracking-[-0.045em] text-[color:var(--foreground)] sm:text-[2rem]">
            아직 공개 브리핑이 없습니다.
          </h2>
          <p className="max-w-2xl text-[0.95rem] leading-8 text-[color:var(--muted)]">
            첫 공개 브리핑이 저장되면 이 화면에 날짜별 최신순 feed가 나타납니다. 개인화
            포트폴리오 정보는 웹에 공개되지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="muted">public-only archive</Badge>
          <Badge tone="muted">mobile-friendly layout</Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="https://t.me/JungStock_bot">Telegram 봇 열기</Link>
          </Button>
        </div>
        <div className="grid gap-3 rounded-[24px] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Delivery
            </p>
            <p className="mt-2 text-sm font-medium">Telegram DM 요약본</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Archive
            </p>
            <p className="mt-2 text-sm font-medium">공개 웹 feed / detail</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Runtime
            </p>
            <p className="mt-2 text-sm font-medium">Vercel webhook + cron</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
