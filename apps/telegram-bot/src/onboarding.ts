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
