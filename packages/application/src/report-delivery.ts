export type DeliveryChannel = "mobile" | "telegram" | "web";

export type ReportDeliveryRequest = {
  channel: DeliveryChannel;
  recipientId: string;
  renderedText: string;
};

export type ReportDeliveryResult = {
  channel: DeliveryChannel;
  deliveryId: string;
  previewText: string;
  recipientId: string;
  status: "mocked" | "sent";
  transport: "mock" | "provider";
};

export interface ReportDeliveryAdapter {
  deliver(request: ReportDeliveryRequest): Promise<ReportDeliveryResult>;
}

export class MockTelegramDeliveryAdapter implements ReportDeliveryAdapter {
  constructor(
    private readonly dependencies?: {
      deliveryIdFactory?: () => string;
    }
  ) {}

  async deliver(request: ReportDeliveryRequest): Promise<ReportDeliveryResult> {
    return {
      channel: request.channel,
      deliveryId:
        this.dependencies?.deliveryIdFactory?.() ??
        `mock-${request.channel}-${request.recipientId}`,
      previewText: request.renderedText,
      recipientId: request.recipientId,
      status: "mocked",
      transport: "mock"
    };
  }
}

export type TelegramBotProfile = {
  firstName: string;
  id: number;
  isBot: boolean;
  username?: string;
};

export type TelegramSentMessage = {
  chatId: string;
  messageId: string;
  text: string;
};

type FetchPort = typeof fetch;
type FetchInit = Parameters<FetchPort>[1];

export class TelegramBotApiClient {
  private readonly apiBaseUrl: string;

  constructor(
    private readonly dependencies: {
      token: string;
      fetchFn?: FetchPort;
    }
  ) {
    this.apiBaseUrl = `https://api.telegram.org/bot${dependencies.token}`;
  }

  async getMe(): Promise<TelegramBotProfile> {
    const result = await this.request<{
      first_name: string;
      id: number;
      is_bot: boolean;
      username?: string;
    }>("getMe");

    const profile: TelegramBotProfile = {
      id: result.id,
      isBot: result.is_bot,
      firstName: result.first_name
    };

    if (result.username) {
      profile.username = result.username;
    }

    return profile;
  }

  async sendMessage(input: {
    chatId: string;
    disableNotification?: boolean;
    text: string;
  }): Promise<TelegramSentMessage> {
    const result = await this.request<{
      chat: {
        id: number | string;
      };
      message_id: number;
      text: string;
    }>("sendMessage", {
      method: "POST",
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
        disable_notification: input.disableNotification ?? true
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    return {
      chatId: String(result.chat.id),
      messageId: String(result.message_id),
      text: result.text
    };
  }

  private async request<T>(method: string, init?: FetchInit): Promise<T> {
    const fetchFn = this.dependencies.fetchFn ?? globalThis.fetch;

    if (!fetchFn) {
      throw new Error("fetch is not available");
    }

    const response = await fetchFn(`${this.apiBaseUrl}/${method}`, init);

    if (!response.ok) {
      throw new Error(`Telegram API request failed with status ${response.status}`);
    }

    const body = (await response.json()) as
      | {
          ok: true;
          result: T;
        }
      | {
          description?: string;
          error_code?: number;
          ok: false;
        };

    if (!body.ok) {
      throw new Error(body.description ?? "Telegram API returned an error");
    }

    return body.result;
  }
}

export class TelegramReportDeliveryAdapter implements ReportDeliveryAdapter {
  constructor(
    private readonly dependencies: {
      auditPort?: {
        insert(input: {
          chatId: string;
          method?: string;
          telegramMessageId?: string;
          text: string;
        }): Promise<unknown>;
      };
      telegramClient: TelegramBotApiClient;
    }
  ) {}

  async deliver(request: ReportDeliveryRequest): Promise<ReportDeliveryResult> {
    if (request.channel !== "telegram") {
      throw new Error("TelegramReportDeliveryAdapter supports telegram only");
    }

    const message = await this.dependencies.telegramClient.sendMessage({
      chatId: request.recipientId,
      text: request.renderedText
    });

    if (this.dependencies.auditPort) {
      await this.dependencies.auditPort.insert({
        chatId: message.chatId,
        method: "sendMessage",
        telegramMessageId: message.messageId,
        text: message.text
      });
    }

    return {
      channel: request.channel,
      deliveryId: `${message.chatId}:${message.messageId}`,
      previewText: request.renderedText,
      recipientId: request.recipientId,
      status: "sent",
      transport: "provider"
    };
  }
}
