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
  timezone?: string;
}): string {
  return [
    "현재 정기 브리핑 설정입니다.",
    `- 발송 상태: ${input.dailyReportEnabled === false ? "꺼짐" : "켜짐"}`,
    "- 고정 발송 시각: 07:30 / 20:30",
    `- 기준 타임존: ${input.timezone ?? "Asia/Seoul"}`,
    "- 운영 캘린더: 월~금 오전/오후, 토요일 오전만, 일요일 없음",
    "- 역할 분리: 오전은 판단 프레임, 오후는 해석 검증과 기준 보정",
    "",
    "변경 명령:",
    "- /report_on",
    "- /report_off",
    "- /report_time"
  ].join("\n");
}
