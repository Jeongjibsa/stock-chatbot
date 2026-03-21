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
