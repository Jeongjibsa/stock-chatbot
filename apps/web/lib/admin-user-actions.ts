import { isAdminTelegramUserId } from "@stock-chatbot/application";

export type AdminUserActionStatus =
  | "blocked"
  | "unblocked"
  | "error_admin_protected"
  | "error_not_found";

export function buildAdminUserActionRedirectUrl(input: {
  action: AdminUserActionStatus;
  requestUrl: string;
  telegramUserId: string;
}) {
  const url = new URL("/admin", input.requestUrl);
  url.searchParams.set("userAction", input.action);
  url.searchParams.set("telegramUserId", input.telegramUserId);
  return url;
}

export function getAdminUserActionMessage(
  action: string | null | undefined,
  telegramUserId: string | null | undefined
): { tone: "negative" | "positive"; text: string } | null {
  if (!action || !telegramUserId) {
    return null;
  }

  switch (action) {
    case "blocked":
      return {
        tone: "positive",
        text: `${telegramUserId} 사용자를 차단했습니다.`
      };
    case "unblocked":
      return {
        tone: "positive",
        text: `${telegramUserId} 사용자의 차단을 해제했습니다.`
      };
    case "error_admin_protected":
      return {
        tone: "negative",
        text: `${telegramUserId} 운영자 계정은 admin 화면에서 차단할 수 없습니다.`
      };
    case "error_not_found":
      return {
        tone: "negative",
        text: `${telegramUserId} 사용자를 찾지 못했습니다.`
      };
    default:
      return null;
  }
}

export function isProtectedAdminUser(telegramUserId: string): boolean {
  return isAdminTelegramUserId(telegramUserId);
}
