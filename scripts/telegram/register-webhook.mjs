const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL?.trim();
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim();
const allowedUpdates = ["message", "chat_member", "my_chat_member"];

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is missing");
  process.exit(1);
}

if (!webhookUrl) {
  console.error("TELEGRAM_WEBHOOK_URL is missing");
  process.exit(1);
}

if (!secretToken) {
  console.error("TELEGRAM_WEBHOOK_SECRET_TOKEN is missing");
  process.exit(1);
}

const apiBaseUrl = `https://api.telegram.org/bot${token}`;
const setWebhookPayload = {
  url: webhookUrl,
  allowed_updates: allowedUpdates,
  drop_pending_updates: false
};

setWebhookPayload.secret_token = secretToken;

const setWebhookResponse = await fetch(`${apiBaseUrl}/setWebhook`, {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify(setWebhookPayload)
});

if (!setWebhookResponse.ok) {
  const body = await setWebhookResponse.text();
  console.error(body);
  process.exit(1);
}

const setWebhookResult = await setWebhookResponse.json();

if (!setWebhookResult.ok) {
  console.error(JSON.stringify(setWebhookResult, null, 2));
  process.exit(1);
}

const webhookInfoResponse = await fetch(`${apiBaseUrl}/getWebhookInfo`);

if (!webhookInfoResponse.ok) {
  const body = await webhookInfoResponse.text();
  console.error(body);
  process.exit(1);
}

const webhookInfo = await webhookInfoResponse.json();

console.log(
  JSON.stringify(
    {
      allowedUpdates,
      setWebhookResult,
      webhookInfo
    },
    null,
    2
  )
);
