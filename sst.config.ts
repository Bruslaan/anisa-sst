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
        const secrets = {
            openAiApiKey: new sst.Secret("OPENAI_API_KEY"),
            webhookVerifyToken: new sst.Secret("WEBHOOK_VERIFY_TOKEN"),
            graphApiToken: new sst.Secret("GRAPH_API_TOKEN"),
            openAiProjectId: new sst.Secret("OPENAI_PROJECT_ID"),
            openAiOrganizationId: new sst.Secret("OPENAI_ORGANIZATION_ID"),
            resendApiKey: new sst.Secret("RESEND_API_KEY"),
            nextPublicSupabaseAnonKey: new sst.Secret("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
            supabaseServiceRoleKey: new sst.Secret("SUPABASE_SERVICE_ROLE_KEY"),
            supabaseUrl: new sst.Secret("SUPABASE_URL"),
            appUrl: new sst.Secret("APP_URL"),
            stripeSecretKey: new sst.Secret("STRIPE_SECRET_KEY"),
            stripeWebhookSecret: new sst.Secret("STRIPE_WEBHOOK_SECRET"),
            yookassaShopId: new sst.Secret("YOOKASSA_SHOP_ID"),
            yookassaApiKey: new sst.Secret("YOOKASSA_API_KEY"),
            idempotenceKey: new sst.Secret("IDEMPOTENCE_KEY"),
            apiToken: new sst.Secret("API_TOKEN"),
            generationQuality: new sst.Secret("GENERATION_QUALITY"),
        };

        const getSharedEnv = (overrides?: any) => ({
            WEBHOOK_VERIFY_TOKEN: secrets.webhookVerifyToken.value!,
            OPENAI_API_KEY: secrets.openAiApiKey.value!,
            OPENAI_PROJECT_ID: secrets.openAiProjectId.value!,
            OPENAI_ORGANIZATION_ID: secrets.openAiOrganizationId.value!,
            RESEND_API_KEY: secrets.resendApiKey.value!,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: secrets.nextPublicSupabaseAnonKey.value!,
            SUPABASE_SERVICE_ROLE_KEY: secrets.supabaseServiceRoleKey.value!,
            SUPABASE_URL: secrets.supabaseUrl.value!,
            APP_URL: secrets.appUrl.value!,
            STRIPE_SECRET_KEY: secrets.stripeSecretKey.value!,
            STRIPE_WEBHOOK_SECRET: secrets.stripeWebhookSecret.value!,
            YOOKASSA_SHOP_ID: secrets.yookassaShopId.value!,
            YOOKASSA_API_KEY: secrets.yookassaApiKey.value!,
            IDEMPOTENCE_KEY: secrets.idempotenceKey.value!,
            API_TOKEN: secrets.apiToken.value!,
            GENERATION_QUALITY: secrets.generationQuality.value!,
            GRAPH_API_TOKEN: secrets.graphApiToken.value!,
            ENVIRONMENT: process.env.ENVIRONMENT || "development",
            ...overrides,
        });

        const mediaQueue = new sst.aws.Queue("MediaQueue", {
            fifo: true,
        });
        mediaQueue.subscribe({
            handler: "packages/functions/src/media.handler",
            environment: getSharedEnv(),
            timeout: "10 minutes",
        });

        const messageQueue = new sst.aws.Queue("MessageQueue", {
            fifo: true,
        })
        messageQueue.subscribe({
            handler: "packages/functions/src/response.handler",
            environment: getSharedEnv(),
            link: [mediaQueue],
            timeout: "5 minutes",
        });

        const api = new sst.aws.ApiGatewayV2("WaWebhook");

        const handler = {
            handler: "packages/functions/src/webhook.handler",
            environment: getSharedEnv({SQS_QUEUE_URL: messageQueue.url}),
            link: [messageQueue],
        };
        api.route("GET /", handler);
        api.route("POST /", handler);


        new sst.aws.Function("ChatMessageHandler", {
            handler: "packages/functions/src/chat.handler",
            environment: getSharedEnv({
                SQS_QUEUE_URL: messageQueue.url,
                MEDIA_QUEUE_URL: mediaQueue.url,
            }),
            link: [messageQueue],
            url: true,
            timeout: "5 minutes",
        })

    },
});
