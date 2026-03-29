import type { BriefingSession } from "@stock-chatbot/application";

export const PUBLIC_BRIEFING_RECOVERY_WINDOW_DAYS = 7;
const PUBLIC_POST_MARKET_HOUR = 20;
const PUBLIC_POST_MARKET_MINUTE = 30;
const PUBLIC_WEEKEND_HOUR = 7;
const PUBLIC_WEEKEND_MINUTE = 30;

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

  return resolveLatestCompletedPublicCoverageDate({
    timeZone: options?.timeZone ?? "Asia/Seoul",
    ...(options?.now ? { now: options.now } : {})
  });
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

function resolveLatestCompletedPublicCoverageDate(input: {
  now?: Date;
  timeZone: string;
}) {
  const now = input.now ?? new Date();
  const parts = getZonedTimeParts(input.timeZone, now);

  if (parts.weekday >= 1 && parts.weekday <= 5) {
    if (
      parts.totalMinutes >=
      PUBLIC_POST_MARKET_HOUR * 60 + PUBLIC_POST_MARKET_MINUTE
    ) {
      return formatDateInTimeZone(input.timeZone, now);
    }

    return findPreviousCompletedPublicCoverageDate(input.timeZone, now);
  }

  if (parts.weekday === 6) {
    if (parts.totalMinutes >= PUBLIC_WEEKEND_HOUR * 60 + PUBLIC_WEEKEND_MINUTE) {
      return formatDateInTimeZone(input.timeZone, now);
    }

    return findPreviousCompletedPublicCoverageDate(input.timeZone, now);
  }

  return findPreviousCompletedPublicCoverageDate(input.timeZone, now);
}

function getZonedTimeParts(timeZone: string, now: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone
  });
  const parts = formatter.formatToParts(now);
  const weekdayToken = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number.parseInt(
    parts.find((part) => part.type === "hour")?.value ?? "0",
    10
  );
  const minute = Number.parseInt(
    parts.find((part) => part.type === "minute")?.value ?? "0",
    10
  );

  return {
    weekday: toWeekdayNumber(weekdayToken),
    hour,
    minute,
    totalMinutes: hour * 60 + minute
  };
}

function toWeekdayNumber(token: string): number {
  switch (token) {
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    default:
      return 0;
  }
}

function findPreviousCompletedPublicCoverageDate(timeZone: string, now: Date) {
  for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const weekday = getZonedTimeParts(timeZone, candidate).weekday;

    if ((weekday >= 1 && weekday <= 5) || weekday === 6) {
      return formatDateInTimeZone(timeZone, candidate);
    }
  }

  return formatDateInTimeZone(timeZone, now);
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
