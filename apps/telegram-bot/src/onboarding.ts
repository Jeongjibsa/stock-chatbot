export class GroupRegistrationReminderStore {
  private readonly remindedKeys = new Set<string>();

  shouldRemind(userId: string, chatId: string): boolean {
    const key = `${chatId}:${userId}`;

    if (this.remindedKeys.has(key)) {
      return false;
    }

    this.remindedKeys.add(key);
    return true;
  }
}

export class GroupJoinWelcomeStore {
  private readonly lastWelcomedAt = new Map<string, number>();

  constructor(private readonly dedupeWindowMs = 30_000) {}

  shouldWelcome(userId: string, chatId: string, now = Date.now()): boolean {
    const key = `${chatId}:${userId}`;
    const lastWelcomedAt = this.lastWelcomedAt.get(key);

    if (lastWelcomedAt && now - lastWelcomedAt < this.dedupeWindowMs) {
      return false;
    }

    this.lastWelcomedAt.set(key, now);
    return true;
  }
}

const COMMAND_SUMMARIES = [
  "/register - 개인화 리포트 등록",
  "/unregister - 등록 초기화",
  "/report - 지금 브리핑 받기",
  "/report_settings - 브리핑 설정 확인",
  "/report_on - 정기 브리핑 켜기",
  "/report_off - 정기 브리핑 끄기",
  "/report_time - 브리핑 시간 변경",
  "/report_mode - 브리핑 밀도 변경",
  "/report_link_on - 상세 링크 표시",
  "/report_link_off - 상세 링크 숨김",
  "/portfolio_add - 보유 종목 추가",
  "/portfolio_bulk - 종목 여러 개 빠르게 추가",
  "/portfolio_list - 내 종목 확인",
  "/portfolio_remove - 보유 종목 삭제",
  "/market_add - 관심 지표 추가",
  "/market_items - 추적 지표 확인",
  "/mock_report - 예시 리포트 보기"
] as const;

export function buildStartMessage(): string {
  return [
    "안녕하세요. StockManager 봇입니다.",
    "개인화 리포트는 아래 순서로 설정해 주세요.",
    "1. /register - 개인 발송 대상 등록",
    "2. /report - 지금 브리핑 확인",
    "3. /portfolio_add - 보유 종목 추가",
    "4. /portfolio_bulk - 여러 종목 한번에 추가",
    "5. /portfolio_list - 저장 결과 확인",
    "6. /market_add - 관심 지표 추가",
    "7. 매일 오전 브리핑 수신",
    "",
    "지원 명령:",
    ...COMMAND_SUMMARIES
  ].join("\n");
}

export function buildHelpMessage(): string {
  return [
    "사용 방법은 간단합니다.",
    "1. /register 로 등록",
    "2. /report 로 브리핑 확인",
    "3. /portfolio_add 로 종목 추가",
    "4. /portfolio_bulk 로 여러 종목 빠르게 추가",
    "5. /portfolio_list 로 확인",
    "6. 필요하면 /market_add 로 관심 지표 추가",
    "",
    "지원 명령:",
    ...COMMAND_SUMMARIES
  ].join("\n");
}

export function buildPrivateRegisterSuccessMessage(): string {
  return [
    "등록이 완료되었습니다.",
    "앞으로 개인화 리포트는 이 1:1 대화로 발송됩니다.",
    "다음 단계:",
    "1. /report 로 오늘 브리핑을 바로 확인해 보세요.",
    "2. /portfolio_add 로 보유 종목을 추가해 주세요.",
    "3. /portfolio_bulk 삼성전자, SK하이닉스, 현대차 처럼 여러 종목을 한번에 추가할 수 있습니다.",
    "4. /portfolio_list 로 저장 결과를 확인해 주세요.",
    "5. 필요하면 /market_add 로 관심 지표를 추가해 주세요.",
    "6. /report_mode compact 로 더 짧은 브리핑으로 바꿀 수 있습니다.",
    "보유 종목이 없어도 시장 브리핑은 먼저 받아보실 수 있습니다."
  ].join("\n");
}

export function buildAlreadyRegisteredMessage(): string {
  return [
    "이미 등록된 계정입니다.",
    "바로 /report 로 브리핑을 받아보시거나 /portfolio_list 로 현재 종목을 확인해 주세요.",
    "등록을 처음부터 다시 시작하려면 /unregister 로 초기화할 수 있습니다."
  ].join("\n");
}

export function buildUnregisterSuccessMessage(): string {
  return [
    "등록 정보와 개인 설정을 초기화했습니다.",
    "다시 시작하려면 /register 를 실행해 주세요."
  ].join("\n");
}

export function buildUnregisterMissingMessage(): string {
  return "현재 초기화할 등록 정보가 없습니다. 먼저 /register 로 등록해 주세요.";
}

export function buildGroupRegisterSuccessMessage(): string {
  return [
    "계정 등록은 완료되었습니다.",
    "개인정보 보호를 위해 개인화 리포트는 봇과 1:1 대화에서만 발송됩니다.",
    "다음 단계:",
    "1. 봇과 1:1 대화를 열어 주세요.",
    "2. DM에서 /register 를 다시 실행해 주세요.",
    "3. 이후 /portfolio_add 로 보유 종목을 등록해 주세요."
  ].join("\n");
}

export function buildGroupRegistrationReminder(): string {
  return [
    "개인화 기능을 사용하시려면 먼저 봇과 1:1 대화에서 /register 를 실행해 주세요.",
    "개인 리포트와 보유 종목 정보는 개인정보 보호를 위해 DM으로만 제공됩니다."
  ].join("\n");
}

export function buildNewMemberWelcomeMessage(memberNames: string[]): string {
  const memberLabel =
    memberNames.length > 0 ? memberNames.join(", ") : "새 사용자";

  return [
    `${memberLabel}님, 환영합니다.`,
    buildGroupRegistrationReminder()
  ].join("\n");
}

export function isGroupChat(chatType: string): boolean {
  return chatType === "group" || chatType === "supergroup";
}

export function extractNewlyJoinedMemberName(input: {
  newStatus?: string;
  oldStatus?: string;
  user?: {
    first_name?: string;
    is_bot?: boolean;
    last_name?: string;
    username?: string;
  };
}): string | null {
  if (!input.user || input.user.is_bot) {
    return null;
  }

  if (!didBecomeActiveMember(input.oldStatus, input.newStatus)) {
    return null;
  }

  return (
    [input.user.first_name, input.user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    input.user.username ||
    "새 사용자"
  );
}

function didBecomeActiveMember(
  oldStatus?: string,
  newStatus?: string
): boolean {
  const activeStatuses = new Set([
    "administrator",
    "creator",
    "member",
    "restricted"
  ]);

  if (!newStatus || !activeStatuses.has(newStatus)) {
    return false;
  }

  return !oldStatus || !activeStatuses.has(oldStatus);
}
