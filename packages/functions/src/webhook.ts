import {SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import type {APIGatewayProxyEventV2, APIGatewayProxyResult} from "aws-lambda";
import {
    isAWhatsappMessage,
    extractWAMessage,
    getMediaURL,
    downloadMediaToStream,
    streamToBase64,
    uploadBase64Image,
    type WhatsappMessage,
    Types,
    Whatsapp,
    getBusinessPhoneNumberId,
} from "@ANISA/core";
import {Resource} from "sst";

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || "eu-central-1",
});
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

const handleWebhookVerification = (
    event: APIGatewayProxyEventV2
): APIGatewayProxyResult => {
    const {queryStringParameters: params} = event;
    const isValid =
        params?.["hub.mode"] === "subscribe" &&
        params?.["hub.verify_token"] === WEBHOOK_VERIFY_TOKEN;


    return isValid
        ? {statusCode: 200, body: params?.["hub.challenge"] || ""}
        : {statusCode: 403, body: "Forbidden"};
};

const processImageMedia = async (
    waMessage: WhatsappMessage,
): Promise<string | undefined> => {
    console.info("Processing image media for message:", waMessage.id);
    if (waMessage.type !== "image" || !waMessage.image?.id) return undefined;
    try {
        const imageUrl = await getMediaURL(waMessage.image.id);
        const base64Image = await downloadMediaToStream(imageUrl);
        const stream = await streamToBase64(base64Image);
        const {publicUrl} = await uploadBase64Image(stream as string, "images");
        return publicUrl;
    } catch (error) {
        console.error("Failed to process image media:", error);
        throw error;
    }
};

const handleWhatsAppMessage = async (
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
    try {
        const parsedBody = JSON.parse(event.body || "{}");

        if (!isAWhatsappMessage(parsedBody) || !Resource.MessageQueue.url) {
            return {
                statusCode: 200,
                body: "",
            };
        }

        const waMessage = extractWAMessage(parsedBody);
        console.info("Received WhatsApp message:", waMessage);

        const mediaUrl =
            waMessage.type === "image"
                ? await processImageMedia(waMessage)
                : waMessage.type === "audio"
                    ? waMessage.audio?.id
                    : undefined;

        const sqsPayload: Types.AnisaPayload = {
            id: waMessage.id,
            userId: waMessage.from,
            type: waMessage.type as "audio" | "image" | "text",
            text: waMessage.type === "image" ? waMessage.image?.caption : waMessage.text?.body,
            provider: "whatsapp",
            whatsapp: parsedBody,
            ...(mediaUrl && {mediaUrl}),
        };

        await sqsClient.send(
            new SendMessageCommand({
                QueueUrl: Resource.MessageQueue.url,
                MessageBody: JSON.stringify(sqsPayload),
                MessageGroupId: waMessage.from,
                MessageDeduplicationId: waMessage.id,
            })
        );

        console.info("WhatsApp message sent to SQS");

        const businessPhoneNumberId = getBusinessPhoneNumberId(parsedBody);
        if (businessPhoneNumberId) {
            await Whatsapp.markAsRead(businessPhoneNumberId, waMessage.id);
        }

        console.info("WhatsApp message marked as read");

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Message processed successfully",
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error("failed to handle wa message in webhook", error);
        return {
            statusCode: 200,
            body: "",
        };
    }
};

export const handler = async (
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
    const method = event.requestContext.http.method;
    return method === "GET"
        ? handleWebhookVerification(event)
        : method === "POST"
            ? await handleWhatsAppMessage(event)
            : {statusCode: 200, body: "Method Not Allowed"};
};
