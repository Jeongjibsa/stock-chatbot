export type BriefingSession =
  | "post_market"
  | "pre_market"
  | "weekend_briefing";

export const PRE_MARKET_HOUR = 7;
export const PRE_MARKET_MINUTE = 30;
export const POST_MARKET_HOUR = 20;
export const POST_MARKET_MINUTE = 30;
export const WEEKEND_BRIEFING_HOUR = 7;
export const WEEKEND_BRIEFING_MINUTE = 30;

export function formatBriefingSessionLabel(
  session: BriefingSession
): string {
  if (session === "pre_market") {
    return "장 시작 전";
  }

  if (session === "post_market") {
    return "장 마감 후";
  }

  return "주말 브리핑";
}

export function formatBriefingSessionRole(
  session: BriefingSession
): string {
  if (session === "pre_market") {
    return "미장 마감 분석 기반 국장 시초가 예측";
  }

  if (session === "post_market") {
    return "국장/대체거래소 결과 분석 및 미장 예보";
  }

  return "미장 마감 분석 및 주간 이슈 총정리, 다음 주 일정 요약";
}

export function formatBriefingSessionSlug(
  session: BriefingSession
): string {
  if (session === "pre_market") {
    return "pre-market";
  }

  if (session === "post_market") {
    return "post-market";
  }

  return "weekend-briefing";
}

export function parseBriefingSession(
  value: string | null | undefined
): BriefingSession | null {
  if (
    value === "pre_market" ||
    value === "post_market" ||
    value === "weekend_briefing"
  ) {
    return value;
  }

  return null;
}

export function resolveManualBriefingSession(input?: {
  now?: Date;
  timeZone?: string;
}): BriefingSession {
  const parts = getZonedTimeParts(input?.timeZone ?? "Asia/Seoul", input?.now);

  return parts.totalMinutes >= 15 * 60 + 30 ? "post_market" : "pre_market";
}

export function resolveScheduledBriefingSession(input?: {
  now?: Date;
  timeZone?: string;
}): BriefingSession | "none" {
  const timeZone = input?.timeZone ?? "Asia/Seoul";
  const parts = getZonedTimeParts(timeZone, input?.now);

  if (
    parts.totalMinutes >= WEEKEND_BRIEFING_HOUR * 60 + WEEKEND_BRIEFING_MINUTE &&
    isScheduledBriefingSessionAllowed("weekend_briefing", {
      timeZone,
      ...(input?.now ? { now: input.now } : {})
    })
  ) {
    return "weekend_briefing";
  }

  if (
    parts.totalMinutes >= POST_MARKET_HOUR * 60 + POST_MARKET_MINUTE &&
    isScheduledBriefingSessionAllowed("post_market", {
      timeZone,
      ...(input?.now ? { now: input.now } : {})
    })
  ) {
    return "post_market";
  }

  if (
    isScheduledBriefingSessionAllowed("pre_market", {
      timeZone,
      ...(input?.now ? { now: input.now } : {})
    })
  ) {
    return "pre_market";
  }

  return "none";
}

export function isScheduledBriefingSessionAllowed(
  session: BriefingSession,
  input?: {
    now?: Date;
    timeZone?: string;
  }
): boolean {
  const parts = getZonedTimeParts(input?.timeZone ?? "Asia/Seoul", input?.now);

  if (session === "weekend_briefing") {
    return parts.weekday === 6;
  }

  if (session === "pre_market") {
    return parts.weekday >= 1 && parts.weekday <= 6;
  }

  return parts.weekday >= 1 && parts.weekday <= 5;
}

export function listScheduledBriefingSessionsForDate(input?: {
  now?: Date;
  timeZone?: string;
}): BriefingSession[] {
  const parts = getZonedTimeParts(input?.timeZone ?? "Asia/Seoul", input?.now);

  if (parts.weekday >= 1 && parts.weekday <= 5) {
    return ["pre_market", "post_market"];
  }

  if (parts.weekday === 6) {
    return ["pre_market", "weekend_briefing"];
  }

  return [];
}

export function getBriefingSessionTime(
  session: BriefingSession
): { hour: number; minute: number } {
  if (session === "pre_market") {
    return { hour: PRE_MARKET_HOUR, minute: PRE_MARKET_MINUTE };
  }

  if (session === "post_market") {
    return { hour: POST_MARKET_HOUR, minute: POST_MARKET_MINUTE };
  }

  return { hour: WEEKEND_BRIEFING_HOUR, minute: WEEKEND_BRIEFING_MINUTE };
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
