/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(_input) {
    return {
      name: "anisa-ai",
      home: "aws",
      region: "us-east-1",
    };
  },
  async run() {
    const sharedEnv = (overrides?: any) => ({
      WEBHOOK_VERIFY_TOKEN: new sst.Secret("WEBHOOK_VERIFY_TOKEN").value!,
      OPENAI_API_KEY: new sst.Secret("OPENAI_API_KEY").value!,
      OPENAI_PROJECT_ID: new sst.Secret("OPENAI_PROJECT_ID").value!,
      OPENAI_ORGANIZATION_ID: new sst.Secret("OPENAI_ORGANIZATION_ID").value!,
      RESEND_API_KEY: new sst.Secret("RESEND_API_KEY").value!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: new sst.Secret("NEXT_PUBLIC_SUPABASE_ANON_KEY").value!,
      SUPABASE_SERVICE_ROLE_KEY: new sst.Secret("SUPABASE_SERVICE_ROLE_KEY").value!,
      SUPABASE_URL: new sst.Secret("SUPABASE_URL").value!,
      APP_URL: new sst.Secret("APP_URL").value!,
      STRIPE_SECRET_KEY: new sst.Secret("STRIPE_SECRET_KEY").value!,
      STRIPE_WEBHOOK_SECRET: new sst.Secret("STRIPE_WEBHOOK_SECRET").value!,
      YOOKASSA_SHOP_ID: new sst.Secret("YOOKASSA_SHOP_ID").value!,
      YOOKASSA_API_KEY: new sst.Secret("YOOKASSA_API_KEY").value!,
      IDEMPOTENCE_KEY: new sst.Secret("IDEMPOTENCE_KEY").value!,
      API_TOKEN: new sst.Secret("API_TOKEN").value!,
      GENERATION_QUALITY: new sst.Secret("GENERATION_QUALITY").value!,
      GRAPH_API_TOKEN:
        "EAANkZAStxEvQBPCqSkDExtqH3ZAiPsHV46NNGfjCnqJdgZCtxq7kIPQLSH25iRQs5GL8OEsZCjyDtWtNib9UvGM0QZAeMNGt3urrFA1BxyHOUur1MP0ZAM129q9uz03D4GRKrd6YpxnG3u2YDF1upK47gtTRCghJna3PcSlKtodZBBGVVrWsTp2ZC1o4T7LzE6uUzhAZCAj37pd1oNb6rdjse8LEQbFHFZBc7YtPkMElwiZCpanZCamhRyTwaZA3l0wrgcZC0ZD",
      ENVIRONMENT: process.env.ENVIRONMENT || "development",
      ...overrides,
    });

    const messageQueue = new sst.aws.Queue("MessageQueue", {
      fifo: true,
    });
    messageQueue.subscribe({
      handler: "packages/functions/src/response.handler",
      environment: sharedEnv(),
      timeout: "5 minutes",
    });

    const api = new sst.aws.ApiGatewayV2("WaWebhook");

    const handler = {
      handler: "packages/functions/src/webhook.handler",
      environment: sharedEnv({ SQS_QUEUE_URL: messageQueue.url }),
      link: [messageQueue],
    };
    api.route("GET /", handler);
    api.route("POST /", handler);

    new sst.aws.Function("ChatMessageHandler", {
      handler: "packages/functions/src/chat.handler",
      environment: sharedEnv({
        SQS_QUEUE_URL: messageQueue.url,
      }),
      link: [messageQueue],
      url: true,
      timeout: "5 minutes",
    });
  },
});
