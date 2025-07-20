export default $config({
    app(input) {
        return {
            name: "aws-cluster-autoscaling",
            removal: input?.stage === "production" ? "retain" : "remove",
            home: "aws",
            region: "us-east-1",
        };
    },
    async run() {
        const messageQueue = new sst.aws.Queue("MessageQueue", {
            fifo: true
        });
        messageQueue.subscribe("packages/functions/src/response.handler");

        const mediaQueue = new sst.aws.Queue("MediaQueue", {
            fifo: true
        });
        mediaQueue.subscribe("packages/functions/src/media.handler");


        // // Lambda Functions
        const webhookReceiver = new sst.aws.Function("WhatsAppWebhook", {
            handler: "packages/functions/src/webhook.handler",
            environment: {
                SQS_QUEUE_URL: messageQueue.queueUrl,
                ENVIRONMENT: process.env.ENVIRONMENT || "development",
                SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
                SUPABASE_URL: process.env.SUPABASE_URL!,
                GRAPH_API_TOKEN: process.env.GRAPH_API_TOKEN!,
            },
            bind: [messageQueue],
        });
        new sst.aws.Function("ResponseGenerator", {
            handler: "packages/functions/src/response.handler",
            timeout: "5 minutes",
            environment: {
                SQS_QUEUE_URL: mediaQueue.queueUrl,
                ENVIRONMENT: process.env.ENVIRONMENT || "development",
                GRAPH_API_TOKEN: process.env.GRAPH_API_TOKEN!,
                OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
                OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID!,
                SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
                SUPABASE_URL: process.env.SUPABASE_URL!,
                OPENAI_ORGANIZATION_ID: process.env.OPENAI_ORGANIZATION_ID!,
            },
            bind: [mediaQueue],
        });

        new sst.aws.Function("MediaGenerator", {
            handler: "packages/functions/src/media.handler",
            timeout: "15 minutes",
            memory: "2048 MB",
            environment: {
                OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
                ENVIRONMENT: process.env.ENVIRONMENT || "development",
                GRAPH_API_TOKEN: process.env.GRAPH_API_TOKEN!,
                OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID!,
                SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
                SUPABASE_URL:  process.env.SUPABASE_URL!,
                OPENAI_ORGANIZATION_ID: process.env.OPENAI_ORGANIZATION_ID!,
            },
        });

        const api = new sst.aws.ApiGatewayV2("WhatsAppApi");
        api.route("GET /", webhookReceiver.name);
        api.route("POST /", webhookReceiver.name);

    },
});