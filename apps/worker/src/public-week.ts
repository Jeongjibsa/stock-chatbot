import type { BriefingSession } from "@stock-chatbot/application";

export const PUBLIC_BRIEFING_RECOVERY_WINDOW_DAYS = 7;

export type PublicWeekSession = {
  reportDate: string;
  briefingSession: BriefingSession;
};

export function buildPublicWeekSessions(referenceDate: string): PublicWeekSession[] {
  const endDate = parseDateOnly(referenceDate);
  const startDate = resolveWeekStartDate(endDate);

  return buildPublicSessionsBetween(formatDateOnly(startDate), referenceDate);
}

export function buildPublicRecoverySessions(
  referenceDate: string,
  recoveryWindowDays: number = PUBLIC_BRIEFING_RECOVERY_WINDOW_DAYS
): PublicWeekSession[] {
  const endDate = parseDateOnly(referenceDate);
  const startDate = new Date(endDate);

  startDate.setUTCDate(startDate.getUTCDate() - Math.max(recoveryWindowDays - 1, 0));

  return buildPublicSessionsBetween(formatDateOnly(startDate), referenceDate);
}

export function buildPublicSessionsBetween(
  startDateValue: string,
  endDateValue: string
): PublicWeekSession[] {
  const startDate = parseDateOnly(startDateValue);
  const endDate = parseDateOnly(endDateValue);

  const sessions: PublicWeekSession[] = [];

  for (
    const cursor = new Date(startDate);
    cursor.getTime() <= endDate.getTime();
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const reportDate = formatDateOnly(cursor);
    const weekday = cursor.getUTCDay();

    if (weekday >= 1 && weekday <= 5) {
      sessions.push({
        reportDate,
        briefingSession: "pre_market"
      });
    }

    if (weekday >= 1 && weekday <= 5) {
      sessions.push({
        reportDate,
        briefingSession: "post_market"
      });
    }

    if (weekday === 6) {
      sessions.push({
        reportDate,
        briefingSession: "weekend_briefing"
      });
    }
  }

  return sessions;
}

export function readPublicBriefingRecoveryWindowDays(
  env: Record<string, string | undefined> = process.env
): number {
  const raw = env.PUBLIC_BRIEFING_RECOVERY_WINDOW_DAYS?.trim();

  if (!raw) {
    return PUBLIC_BRIEFING_RECOVERY_WINDOW_DAYS;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return PUBLIC_BRIEFING_RECOVERY_WINDOW_DAYS;
  }

  return parsed;
}

export function readPublicWeekReferenceDate(
  env: Record<string, string | undefined> = process.env,
  options?: { now?: Date; timeZone?: string }
): string {
  const value = env.PUBLIC_WEEK_REFERENCE_DATE?.trim() || env.REPORT_RUN_DATE?.trim();

  if (value) {
    return value;
  }

  return formatDateInTimeZone(options?.timeZone ?? "Asia/Seoul", options?.now);
}

function formatDateInTimeZone(timeZone: string, now: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(now);
}

function resolveWeekStartDate(endDate: Date) {
  const startDate = new Date(endDate);
  const offset = (endDate.getUTCDay() + 6) % 7;
  startDate.setUTCDate(startDate.getUTCDate() - offset);
  return startDate;
}

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}
