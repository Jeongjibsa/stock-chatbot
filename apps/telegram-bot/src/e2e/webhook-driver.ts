export type TelegramSyntheticUpdate =
  | {
      message: Record<string, unknown>;
      update_id: number;
    }
  | {
      chat_member: Record<string, unknown>;
      update_id: number;
    };

export async function postSyntheticTelegramUpdate(input: {
  payload: TelegramSyntheticUpdate;
  webhookSecretToken: string;
  webhookUrl: string;
}): Promise<void> {
  const response = await fetch(input.webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": input.webhookSecretToken
    },
    body: JSON.stringify(input.payload)
  });

  if (!response.ok) {
    throw new Error(
      `Webhook request failed with status ${response.status}: ${await response.text()}`
    );
  }
}

export function buildPrivateTextMessageUpdate(input: {
  chatId: string;
  text: string;
  updateId: number;
  userId: string;
}): TelegramSyntheticUpdate {
  return {
    update_id: input.updateId,
    message: {
      message_id: input.updateId,
      date: buildUnixTimestamp(),
      from: {
        id: Number(input.userId),
        is_bot: false,
        first_name: "E2E",
        last_name: "Primary"
      },
      chat: {
        id: Number(input.chatId),
        type: "private",
        first_name: "E2E",
        last_name: "Primary"
      },
      text: input.text,
      entities: buildCommandEntities(input.text)
    }
  };
}

export function buildGroupTextMessageUpdate(input: {
  chatId: string;
  text: string;
  updateId: number;
  userId: string;
}): TelegramSyntheticUpdate {
  return {
    update_id: input.updateId,
    message: {
      message_id: input.updateId,
      date: buildUnixTimestamp(),
      from: {
        id: Number(input.userId),
        is_bot: false,
        first_name: "E2E",
        last_name: "GroupUser"
      },
      chat: {
        id: Number(input.chatId),
        type: "supergroup",
        title: "StockBot E2E Group"
      },
      text: input.text,
      entities: buildCommandEntities(input.text)
    }
  };
}

export function buildGroupNewMemberUpdate(input: {
  chatId: string;
  joinedUserId: string;
  joinedUserName: string;
  updateId: number;
}): TelegramSyntheticUpdate {
  return {
    update_id: input.updateId,
    message: {
      message_id: input.updateId,
      date: buildUnixTimestamp(),
      from: {
        id: Number(input.joinedUserId),
        is_bot: false,
        first_name: input.joinedUserName
      },
      chat: {
        id: Number(input.chatId),
        type: "supergroup",
        title: "StockBot E2E Group"
      },
      new_chat_members: [
        {
          id: Number(input.joinedUserId),
          is_bot: false,
          first_name: input.joinedUserName
        }
      ]
    }
  };
}

function buildCommandEntities(text: string) {
  const trimmed = text.trim();

  if (!trimmed.startsWith("/")) {
    return undefined;
  }

  const commandText = trimmed.split(/\s+/u, 1)[0] ?? trimmed;

  return [
    {
      type: "bot_command",
      offset: 0,
      length: commandText.length
    }
  ];
}

function buildUnixTimestamp(date = new Date()): number {
  return Math.floor(date.valueOf() / 1_000);
}
