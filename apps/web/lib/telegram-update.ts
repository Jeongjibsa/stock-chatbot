export function extractTelegramUpdateId(payload: string): string | null {
  try {
    const parsed = JSON.parse(payload) as {
      update_id?: number | string;
    };

    if (parsed.update_id === undefined || parsed.update_id === null) {
      return null;
    }

    return String(parsed.update_id);
  } catch {
    return null;
  }
}
