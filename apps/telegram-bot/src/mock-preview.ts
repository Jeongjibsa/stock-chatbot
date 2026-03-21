import { buildMockTelegramReportPreview } from "@stock-chatbot/application";

export function buildMockReportReply(): string {
  return buildMockTelegramReportPreview().renderedText;
}
