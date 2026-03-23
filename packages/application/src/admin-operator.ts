export const ADMIN_TELEGRAM_USER_ID = "8606362482";

export function isAdminTelegramUserId(
  telegramUserId: string | undefined | null
): boolean {
  return telegramUserId === ADMIN_TELEGRAM_USER_ID;
}
