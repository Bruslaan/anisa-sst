/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
    app(input) {
        return {
            name: "anisa-ai",
            removal: input?.stage === "production" ? "retain" : "remove",
            home: "aws",
            region: "us-east-1",
        };
    },
    async run() {
        const openAiApiKey = new sst.Secret("OPENAI_API_KEY");
        const webhookVerifyToken = new sst.Secret("WEBHOOK_VERIFY_TOKEN");
        const graphApiToken = new sst.Secret("GRAPH_API_TOKEN");
        const openAiProjectId = new sst.Secret("OPENAI_PROJECT_ID");
        const openAiOrganizationId = new sst.Secret("OPENAI_ORGANIZATION_ID");
        const resendApiKey = new sst.Secret("RESEND_API_KEY");
        const nextPublicSupabaseAnonKey = new sst.Secret("NEXT_PUBLIC_SUPABASE_ANON_KEY");
        const supabaseServiceRoleKey = new sst.Secret("SUPABASE_SERVICE_ROLE_KEY");
        const supabaseUrl = new sst.Secret("SUPABASE_URL");
        const appUrl = new sst.Secret("APP_URL");
        const stripeSecretKey = new sst.Secret("STRIPE_SECRET_KEY");
        const stripeWebhookSecret = new sst.Secret("STRIPE_WEBHOOK_SECRET");
        const yookassaShopId = new sst.Secret("YOOKASSA_SHOP_ID");
        const yookassaApiKey = new sst.Secret("YOOKASSA_API_KEY");
        const idempotenceKey = new sst.Secret("IDEMPOTENCE_KEY");
        const apiToken = new sst.Secret("API_TOKEN");
        const generationQuality = new sst.Secret("GENERATION_QUALITY");

        const messageQueue = new sst.aws.Queue("MessageQueue", {
            fifo: true
        });
        messageQueue.subscribe("packages/functions/src/response.handler");

        const mediaQueue = new sst.aws.Queue("MediaQueue", {
            fifo: true
        });
        mediaQueue.subscribe("packages/functions/src/media.handler");

        console.log("Ruslan", openAiApiKey.value!)

        new sst.aws.Function("WhatsAppWebhook", {
            handler: "packages/functions/src/webhook.handler",
            environment: {
                OPENAI_API_KEY: openAiApiKey.value!,
                SQS_QUEUE_URL: messageQueue.url,
                ENVIRONMENT: process.env.ENVIRONMENT || "development",
                SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey.value!,
                SUPABASE_URL: supabaseUrl.value!,
                GRAPH_API_TOKEN: graphApiToken.value!,
                WEBHOOK_VERIFY_TOKEN: webhookVerifyToken.value!,
            },
            link: [messageQueue],
        });

        new sst.aws.Function("ResponseGenerator", {
            handler: "packages/functions/src/response.handler",
            timeout: "5 minutes",
            environment: {
                SQS_QUEUE_URL: mediaQueue.url,
                ENVIRONMENT: process.env.ENVIRONMENT || "development",
                GRAPH_API_TOKEN: graphApiToken.value!,
                OPENAI_API_KEY: openAiApiKey.value!,
                OPENAI_PROJECT_ID: openAiProjectId.value!,
                SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey.value!,
                SUPABASE_URL: supabaseUrl.value!,
                OPENAI_ORGANIZATION_ID: openAiOrganizationId.value!,
                RESEND_API_KEY: resendApiKey.value!,
                NEXT_PUBLIC_SUPABASE_ANON_KEY: nextPublicSupabaseAnonKey.value!,
                APP_URL: appUrl.value!,
                STRIPE_SECRET_KEY: stripeSecretKey.value!,
                STRIPE_WEBHOOK_SECRET: stripeWebhookSecret.value!,
                YOOKASSA_SHOP_ID: yookassaShopId.value!,
                YOOKASSA_API_KEY: yookassaApiKey.value!,
                IDEMPOTENCE_KEY: idempotenceKey.value!,
                API_TOKEN: apiToken.value!,
                GENERATION_QUALITY: generationQuality.value!,
            },
            link: [mediaQueue],
        });

        new sst.aws.Function("MediaGenerator", {
            handler: "packages/functions/src/media.handler",
            timeout: "15 minutes",
            memory: "2048 MB",
            environment: {
                OPENAI_API_KEY: openAiApiKey.value!,
                ENVIRONMENT: process.env.ENVIRONMENT || "development",
                GRAPH_API_TOKEN: graphApiToken.value!,
                OPENAI_PROJECT_ID: openAiProjectId.value!,
                SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey.value!,
                SUPABASE_URL: supabaseUrl.value!,
                OPENAI_ORGANIZATION_ID: openAiOrganizationId.value!,
                RESEND_API_KEY: resendApiKey.value!,
                NEXT_PUBLIC_SUPABASE_ANON_KEY: nextPublicSupabaseAnonKey.value!,
                APP_URL: appUrl.value!,
                STRIPE_SECRET_KEY: stripeSecretKey.value!,
                STRIPE_WEBHOOK_SECRET: stripeWebhookSecret.value!,
                YOOKASSA_SHOP_ID: yookassaShopId.value!,
                YOOKASSA_API_KEY: yookassaApiKey.value!,
                IDEMPOTENCE_KEY: idempotenceKey.value!,
                API_TOKEN: apiToken.value!,
                GENERATION_QUALITY: generationQuality.value!,
            },
        });

        const api = new sst.aws.ApiGatewayV2("WhatsAppApi");
        api.route("GET /", "packages/functions/src/webhook.handler");
        api.route("POST /", "packages/functions/src/webhook.handler");

    },
});