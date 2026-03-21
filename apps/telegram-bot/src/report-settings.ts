export function parseReportTimeArgument(
  value: string | undefined
): { hour: number; minute: number } | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const matched = raw.match(/^(\d{1,2}):(\d{2})$/);

  if (!matched) {
    return null;
  }

  const hour = Number.parseInt(matched[1] ?? "", 10);
  const minute = Number.parseInt(matched[2] ?? "", 10);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    hour,
    minute
  };
}

export function formatHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatReportSettings(input: {
  dailyReportEnabled?: boolean;
  dailyReportHour?: number;
  dailyReportMinute?: number;
  includePublicBriefingLink?: boolean;
  reportDetailLevel?: string | null;
  timezone?: string;
}): string {
  return [
    "현재 정기 브리핑 설정입니다.",
    `- 발송 상태: ${input.dailyReportEnabled === false ? "꺼짐" : "켜짐"}`,
    `- 발송 시간: ${formatHourMinute(
      input.dailyReportHour ?? 9,
      input.dailyReportMinute ?? 0
    )}`,
    `- 타임존: ${input.timezone ?? "Asia/Seoul"}`,
    `- 리포트 밀도: ${input.reportDetailLevel === "compact" ? "compact" : "standard"}`,
    `- 상세 링크: ${input.includePublicBriefingLink === false ? "숨김" : "표시"}`,
    "",
    "변경 명령:",
    "- /report_on",
    "- /report_off",
    "- /report_time 09:00",
    "- /report_mode compact",
    "- /report_link_on",
    "- /report_link_off"
  ].join("\n");
}
