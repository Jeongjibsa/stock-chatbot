import Link from "next/link";

import {
  formatBriefingSessionLabel,
  isAdminTelegramUserId
} from "@stock-chatbot/application";

import { FeedErrorState } from "../../components/feed-error-state";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { getAdminUserActionMessage } from "../../lib/admin-user-actions";
import { getAdminDashboardSnapshot } from "../../lib/admin-dashboard";
import { normalizeMarketRegime, scoreTone } from "../../lib/report-feed";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const snapshot = await getAdminDashboardSnapshot();
    const action = readQueryParam(resolvedSearchParams, "userAction");
    const telegramUserId = readQueryParam(resolvedSearchParams, "telegramUserId");
    const actionMessage = getAdminUserActionMessage(action, telegramUserId);
    const completionRate =
      snapshot.runSummary24h.totalCount === 0
        ? 0
        : Math.round(
            ((snapshot.runSummary24h.completedCount +
              snapshot.runSummary24h.partialSuccessCount) /
              snapshot.runSummary24h.totalCount) *
              100
          );

    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="report-shell soft-grid mb-10 overflow-hidden p-8 sm:p-10">
          <p className="section-label">Stock Briefing Ops</p>
          <h1 className="mt-4 text-[2.5rem] font-semibold tracking-[-0.045em] text-[color:var(--foreground)]">
            운영 콘솔
          </h1>
          <p className="mt-4 max-w-3xl text-[0.98rem] leading-8 text-[color:var(--muted)]">
            최근 공개 브리핑, 개인화 리포트 실행 상태, Telegram 사용자 차단 상태를
            함께 관리하는 운영 화면입니다.
          </p>
        </header>

        {actionMessage ? (
          <section className="mb-6">
            <div
              className={`rounded-[22px] border px-5 py-4 text-sm font-medium ${
                actionMessage.tone === "positive"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              {actionMessage.text}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="최근 공개 브리핑"
            value={snapshot.latestReport?.reportDate ?? "없음"}
            detail={snapshot.latestReport?.summary ?? "생성된 공개 브리핑이 없습니다."}
          />
          <MetricCard
            label="최근 7일 공개 브리핑"
            value={`${snapshot.reportsLast7Days}건`}
            detail="reports 읽기 모델 기준"
          />
          <MetricCard
            label="최근 24시간 완료율"
            value={`${completionRate}%`}
            detail={`총 ${snapshot.runSummary24h.totalCount}건 / 실패 ${snapshot.runSummary24h.failedCount}건`}
          />
          <MetricCard
            label="최근 24시간 실행 중"
            value={`${snapshot.runSummary24h.runningCount}건`}
            detail={`partial ${snapshot.runSummary24h.partialSuccessCount}건`}
          />
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="전략 회고 적중률"
            value={
              snapshot.strategyBacktestSummary.hitRate === null
                ? "없음"
                : `${snapshot.strategyBacktestSummary.hitRate}%`
            }
            detail={`win ${snapshot.strategyBacktestSummary.winCount} / loss ${snapshot.strategyBacktestSummary.lossCount}`}
          />
          <MetricCard
            label="평균 이후 수익률"
            value={
              snapshot.strategyBacktestSummary.averageReturnPct === null
                ? "없음"
                : `${snapshot.strategyBacktestSummary.averageReturnPct > 0 ? "+" : ""}${snapshot.strategyBacktestSummary.averageReturnPct}%`
            }
            detail={`평가 가능 ${snapshot.strategyBacktestSummary.evaluatedCount}건`}
          />
          <MetricCard
            label="회고 불가 항목"
            value={`${snapshot.strategyBacktestSummary.unavailableCount}건`}
            detail={`neutral ${snapshot.strategyBacktestSummary.neutralCount}건`}
          />
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.05fr_1.45fr]">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">최근 공개 브리핑</h2>
                  <p className="text-sm text-[color:var(--muted)]">
                    공개 가능한 브리핑만 표시합니다.
                  </p>
                </div>
                <Link
                  className="text-sm font-semibold text-[color:var(--accent)]"
                  href="/"
                >
                  공개 피드 보기
                </Link>
              </div>
              <Separator />
              <div className="space-y-3">
                {snapshot.recentReports.length === 0 ? (
                  <p className="text-sm text-[color:var(--muted)]">
                    아직 저장된 공개 브리핑이 없습니다.
                  </p>
                ) : (
                  snapshot.recentReports.map((report) => {
                    const marketRegime = normalizeMarketRegime(report.marketRegime);
                    const regimeTone =
                      marketRegime === "Risk-On"
                        ? "positive"
                        : marketRegime === "Risk-Off"
                          ? "negative"
                          : "neutral";
                    const scoreBadgeTone =
                      scoreTone(report.totalScore) === "positive"
                        ? "positive"
                        : scoreTone(report.totalScore) === "negative"
                          ? "negative"
                          : "neutral";

                    return (
                      <div
                        key={report.id}
                        className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface)] p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                              {report.reportDate} · {formatBriefingSessionLabel(report.briefingSession)}
                            </p>
                            <p className="mt-1 font-semibold leading-6">{report.summary}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge tone={regimeTone}>{marketRegime}</Badge>
                            <Badge tone={scoreBadgeTone}>
                              Total {report.totalScore > 0 ? "+" : ""}
                              {report.totalScore.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Link
                            className="text-sm font-semibold text-[color:var(--accent)]"
                            href={`/reports/${report.id}`}
                          >
                            상세 브리핑 보기
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">최근 리포트 실행 로그</h2>
                <p className="text-sm text-[color:var(--muted)]">
                  사용자별 개인화 실행 결과를 최근순으로 보여줍니다.
                </p>
              </div>
              <Separator />
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    <tr>
                      <th className="pb-3 pr-4 font-semibold">시작</th>
                      <th className="pb-3 pr-4 font-semibold">사용자</th>
                      <th className="pb-3 pr-4 font-semibold">기준일</th>
                      <th className="pb-3 pr-4 font-semibold">유형</th>
                      <th className="pb-3 font-semibold">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--line)]">
                    {snapshot.recentRuns.length === 0 ? (
                      <tr>
                        <td
                          className="py-4 text-[color:var(--muted)]"
                          colSpan={5}
                        >
                          아직 실행 로그가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      snapshot.recentRuns.map((run) => (
                        <tr key={run.id}>
                          <td className="py-3 pr-4 align-top text-[color:var(--muted)]">
                            {formatDateTime(run.startedAt)}
                          </td>
                          <td className="py-3 pr-4 align-top">{run.displayName}</td>
                          <td className="py-3 pr-4 align-top">{run.runDate}</td>
                          <td className="py-3 pr-4 align-top">
                            <span className="text-[color:var(--muted)]">
                              {run.scheduleType}
                            </span>
                          </td>
                          <td className="py-3 align-top">
                            <div className="space-y-1">
                              <Badge tone={statusTone(run.status)}>
                                {formatRunStatus(run.status)}
                              </Badge>
                              {run.errorMessage ? (
                                <p className="max-w-sm text-xs leading-5 text-[color:var(--muted)]">
                                  {run.errorMessage}
                                </p>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Telegram 사용자 관리</h2>
                  <p className="text-sm text-[color:var(--muted)]">
                    등록 상태, 차단 상태, 오늘 사용량을 확인하고 block/unblock 할 수
                    있습니다.
                  </p>
                </div>
              </div>
              <Separator />
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    <tr>
                      <th className="pb-3 pr-4 font-semibold">사용자</th>
                      <th className="pb-3 pr-4 font-semibold">상태</th>
                      <th className="pb-3 pr-4 font-semibold">오늘 /report</th>
                      <th className="pb-3 pr-4 font-semibold">오늘 종목 추가</th>
                      <th className="pb-3 pr-4 font-semibold">최근 요청</th>
                      <th className="pb-3 font-semibold">제어</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--line)]">
                    {snapshot.users.length === 0 ? (
                      <tr>
                        <td className="py-4 text-[color:var(--muted)]" colSpan={6}>
                          아직 조회 가능한 Telegram 사용자가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      snapshot.users.map((user) => (
                        <tr key={user.telegramUserId}>
                          <td className="py-3 pr-4 align-top">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{user.displayName}</p>
                                {isAdminTelegramUserId(user.telegramUserId) ? (
                                  <Badge tone="neutral">operator</Badge>
                                ) : null}
                              </div>
                              <p className="text-xs text-[color:var(--muted)]">
                                {user.telegramUserId}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 pr-4 align-top">
                            <div className="flex flex-wrap gap-2">
                              <Badge tone={user.isRegistered ? "positive" : "neutral"}>
                                {user.isRegistered ? "registered" : "unregistered"}
                              </Badge>
                              <Badge tone={user.isBlocked ? "negative" : "positive"}>
                                {user.isBlocked ? "blocked" : "active"}
                              </Badge>
                            </div>
                            {user.isBlocked && user.blockedReason ? (
                              <p className="mt-2 text-xs text-[color:var(--muted)]">
                                reason: {user.blockedReason}
                                {user.blockedAt
                                  ? ` · ${formatDateTime(user.blockedAt)}`
                                  : ""}
                              </p>
                            ) : user.unregisteredAt ? (
                              <p className="mt-2 text-xs text-[color:var(--muted)]">
                                unregistered: {formatDateTime(user.unregisteredAt)}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-3 pr-4 align-top">
                            {user.dailyReportRequestsToday} / 1
                          </td>
                          <td className="py-3 pr-4 align-top">
                            {user.dailyPortfolioRequestsToday} / 3
                          </td>
                          <td className="py-3 pr-4 align-top text-[color:var(--muted)]">
                            {user.lastRequestAt ? formatDateTime(user.lastRequestAt) : "-"}
                          </td>
                          <td className="py-3 align-top">
                            {isAdminTelegramUserId(user.telegramUserId) ? (
                              <span className="inline-flex min-w-24 items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
                                protected
                              </span>
                            ) : (
                              <form
                                action={`/api/admin/users/${encodeURIComponent(user.telegramUserId)}/${user.isBlocked ? "unblock" : "block"}`}
                                method="post"
                              >
                                <button
                                  className={`inline-flex min-w-24 items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                                    user.isBlocked
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                                  }`}
                                  type="submit"
                                >
                                  {user.isBlocked ? "unblock" : "block"}
                                </button>
                              </form>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10">
          <Card>
            <CardContent className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">최근 전략 회고</h2>
                <p className="text-sm text-[color:var(--muted)]">
                  최근 시그널의 이후 수익률과 액션 적합도를 간단히 비교합니다.
                </p>
              </div>
              <Separator />
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    <tr>
                      <th className="pb-3 pr-4 font-semibold">기준일</th>
                      <th className="pb-3 pr-4 font-semibold">사용자</th>
                      <th className="pb-3 pr-4 font-semibold">종목</th>
                      <th className="pb-3 pr-4 font-semibold">액션</th>
                      <th className="pb-3 pr-4 font-semibold">점수</th>
                      <th className="pb-3 pr-4 font-semibold">이후 수익률</th>
                      <th className="pb-3 font-semibold">판정</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--line)]">
                    {snapshot.recentStrategySnapshots.length === 0 ? (
                      <tr>
                        <td className="py-4 text-[color:var(--muted)]" colSpan={7}>
                          아직 저장된 전략 스냅샷이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      snapshot.recentStrategySnapshots.map((strategy) => (
                        <tr key={strategy.id}>
                          <td className="py-3 pr-4 align-top">{strategy.runDate}</td>
                          <td className="py-3 pr-4 align-top">{strategy.displayName}</td>
                          <td className="py-3 pr-4 align-top">
                            <div className="space-y-1">
                              <p>{strategy.companyName}</p>
                              {strategy.symbol ? (
                                <p className="text-xs text-[color:var(--muted)]">
                                  {strategy.symbol}
                                  {strategy.exchange ? ` · ${strategy.exchange}` : ""}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-3 pr-4 align-top">
                            <Badge tone={actionTone(strategy.action)}>
                              {strategy.action}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 align-top">
                            {strategy.totalScore > 0 ? "+" : ""}
                            {strategy.totalScore.toFixed(2)}
                          </td>
                          <td className="py-3 pr-4 align-top">
                            {strategy.realizedReturnPct === null
                              ? "-"
                              : `${strategy.realizedReturnPct > 0 ? "+" : ""}${strategy.realizedReturnPct.toFixed(2)}%`}
                          </td>
                          <td className="py-3 align-top">
                            <Badge tone={outcomeTone(strategy.outcome)}>
                              {formatOutcome(strategy.outcome)}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-3">
          <p className="section-label">
            Stock Briefing Ops
          </p>
          <h1 className="text-[2.4rem] font-semibold tracking-[-0.04em]">운영 콘솔</h1>
        </header>
        <FeedErrorState />
      </main>
    );
  }
}

function readQueryParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | null {
  const value = searchParams?.[key];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return null;
}

function MetricCard(input: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <p className="section-label">
          {input.label}
        </p>
        <p className="data-value">{input.value}</p>
        <p className="text-sm leading-7 text-[color:var(--muted)]">{input.detail}</p>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatRunStatus(
  status: "completed" | "failed" | "partial_success" | "running"
): string {
  switch (status) {
    case "completed":
      return "completed";
    case "partial_success":
      return "partial";
    case "failed":
      return "failed";
    case "running":
      return "running";
  }
}

function statusTone(
  status: "completed" | "failed" | "partial_success" | "running"
): "positive" | "negative" | "neutral" {
  switch (status) {
    case "completed":
      return "positive";
    case "failed":
      return "negative";
    case "partial_success":
    case "running":
      return "neutral";
  }
}

function actionTone(
  action: "ACCUMULATE" | "DEFENSIVE" | "HOLD" | "REDUCE"
): "positive" | "negative" | "neutral" {
  switch (action) {
    case "ACCUMULATE":
      return "positive";
    case "REDUCE":
      return "negative";
    case "HOLD":
    case "DEFENSIVE":
      return "neutral";
  }
}

function outcomeTone(
  outcome: "loss" | "neutral" | "unavailable" | "win"
): "positive" | "negative" | "neutral" {
  switch (outcome) {
    case "win":
      return "positive";
    case "loss":
      return "negative";
    case "neutral":
    case "unavailable":
      return "neutral";
  }
}

function formatOutcome(outcome: "loss" | "neutral" | "unavailable" | "win"): string {
  switch (outcome) {
    case "win":
      return "win";
    case "loss":
      return "loss";
    case "neutral":
      return "neutral";
    case "unavailable":
      return "n/a";
  }
}
