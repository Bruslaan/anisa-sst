import {SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import type {APIGatewayProxyEventV2, APIGatewayProxyResult} from "aws-lambda";
import {
    isAWhatsappMessage,
    extractWAMessage,
    getMediaURL,
    downloadMediaToStream,
    streamToBase64,
    uploadBase64Image,
    Types,
    Whatsapp,
    getBusinessPhoneNumberId, Supabase,
} from "@ANISA/core";
import {Resource} from "sst";
import {handleInteractiveMessage} from "@ANISA/core/interactive-message";
import getOrCreateUser = Supabase.getOrCreateUser;
import sendMessage = Whatsapp.sendMessage;
import {detectLanguage, translate} from "@ANISA/core/i18n";
import sendInteractiveButtons = Whatsapp.sendInteractiveButtons;

const sqsClient = new SQSClient({region: process.env.AWS_REGION || "eu-central-1"});

const verifyWebhook = (params: Record<string, string | undefined> | null) =>
    params?.["hub.mode"] === "subscribe" &&
    params?.["hub.verify_token"] === process.env.WEBHOOK_VERIFY_TOKEN;

const processImageMedia = async (imageId: string) => {
    const imageUrl = await getMediaURL(imageId);
    const base64Image = await downloadMediaToStream(imageUrl);
    const stream = await streamToBase64(base64Image);
    const {publicUrl} = await uploadBase64Image(stream as string, "images");
    return publicUrl;
};

const getMediaUrl = async (waMessage: any) => {
    switch (waMessage.type) {
        case "image":
            return waMessage.image?.id ? await processImageMedia(waMessage.image.id) : undefined;
        case "audio":
            return waMessage.audio?.id;
        default:
            return undefined;
    }
};

const createPayload = (waMessage: any, parsedBody: any, mediaUrl?: string): Types.AnisaPayload => ({
    id: waMessage.id,
    userId: waMessage.from,
    type: waMessage.type,
    text: waMessage.type === "image" ? waMessage.image?.caption : waMessage.text?.body,
    provider: "whatsapp",
    whatsapp: parsedBody,
    ...(mediaUrl && {mediaUrl}),
});

const sendToQueue = async (payload: Types.AnisaPayload) =>
    sqsClient.send(new SendMessageCommand({
        QueueUrl: Resource.MessageQueue.url,
        MessageBody: JSON.stringify(payload),
        MessageGroupId: payload.userId,
        MessageDeduplicationId: payload.id,
    }));

const markAsRead = async (parsedBody: any, messageId: string) => {
    const businessPhoneNumberId = getBusinessPhoneNumberId(parsedBody);
    if (businessPhoneNumberId) {
        await Whatsapp.markAsRead(businessPhoneNumberId, messageId);
    }
};

const handleMessage = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    try {
        const parsedBody = JSON.parse(event.body || "{}");

        if (!isAWhatsappMessage(parsedBody) || !Resource.MessageQueue.url) {
            return {statusCode: 200, body: ""};
        }


        const waMessage = extractWAMessage(parsedBody);

        console.info("1. Received WhatsApp message:", waMessage.from, waMessage);

        const user = await getOrCreateUser(waMessage.from);
        if (waMessage.type === "interactive") {
            console.debug("Interactive message", waMessage.from);
            const businessPhoneNumberId = getBusinessPhoneNumberId(parsedBody);
            if (businessPhoneNumberId) {
                await handleInteractiveMessage(waMessage, businessPhoneNumberId, user);
            }
            return {statusCode: 200, body: JSON.stringify({message: "Message processed successfully"})};
        }

        if (user.credits! <= 0) {
            const language = detectLanguage(waMessage.from);
            const businessPhoneNumberId = getBusinessPhoneNumberId(parsedBody);
            if (!businessPhoneNumberId) {
                return {statusCode: 200, body: JSON.stringify({message: "Message processed successfully"})};
            }
            await sendMessage(
                businessPhoneNumberId,
                {
                    ...waMessage, text: {
                        body: translate('noCredits', language)
                    }
                },
            );

            await sendInteractiveButtons({
                business_phone_number_id: businessPhoneNumberId,
                message: waMessage,
                header: translate('creditsRequiredHeader', language),
                body: translate('refillQuestion', language),
                footer: translate('buttonProceed', language),
                buttons: [
                    {
                        id: "refill_credits",
                        title: translate('yesRefill', language)
                    },
                    {
                        id: "not_now",
                        title: translate('notNow', language)
                    },
                ],
            });
            return {statusCode: 200, body: JSON.stringify({message: "Message processed successfully"})};
        }


        const mediaUrl = await getMediaUrl(waMessage);
        const payload = createPayload(waMessage, parsedBody, mediaUrl);

        await sendToQueue(payload);
        await markAsRead(parsedBody, waMessage.id);
        console.info("2. Message sent to SQS");

        return {statusCode: 200, body: JSON.stringify({message: "Message processed successfully"})};
    } catch (error) {
        console.error("Webhook error:", error);
        return {statusCode: 200, body: ""};
    }
};

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const {method} = event.requestContext.http;
    const {queryStringParameters: params} = event;

    if (method === "GET") {
        return verifyWebhook(params || null)
            ? {statusCode: 200, body: params?.["hub.challenge"] || ""}
            : {statusCode: 403, body: "Forbidden"};
    }

    return method === "POST" ? await handleMessage(event) : {statusCode: 200, body: "Method Not Allowed"};
};
