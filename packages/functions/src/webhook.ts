import {SendMessageCommand, SQSClient} from '@aws-sdk/client-sqs';
import type {APIGatewayProxyEventV2, APIGatewayProxyResult} from 'aws-lambda';
import {
    isAWhatsappMessage,
    extractWAMessage,
    getMediaURL,
    downloadMediaToStream,
    streamToBase64,
    uploadBase64Image,
    type WhatsappMessage, Types, Whatsapp, getBusinessPhoneNumberId
} from "@ANISA/core";
import {Resource} from "sst";

const sqsClient = new SQSClient({region: process.env.AWS_REGION || 'eu-central-1'});
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

const handleWebhookVerification = (event: APIGatewayProxyEventV2): APIGatewayProxyResult => {
    const {queryStringParameters: params} = event;
    return params?.['hub.mode'] === 'subscribe' && params?.['hub.verify_token'] === WEBHOOK_VERIFY_TOKEN
        ? {statusCode: 200, body: params?.['hub.challenge'] || ''}
        : {statusCode: 403, body: 'Forbidden'};
};

const processImageMedia = async (waMessage: WhatsappMessage): Promise<string | undefined> => {
    if (waMessage.type !== 'image' || !waMessage.image?.id) return undefined;

    const imageUrl = await getMediaURL(waMessage.image.id);
    const base64Image = await downloadMediaToStream(imageUrl);
    const stream = await streamToBase64(base64Image);
    const {publicUrl} = await uploadBase64Image(stream as string, 'images');

    return publicUrl;
};

const handleWhatsAppMessage = async (
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
    try {
        const parsedBody = JSON.parse(event.body || '{}');
        
        if (!isAWhatsappMessage(parsedBody) || !Resource.MessageQueue.url) {
            return {
                statusCode: !isAWhatsappMessage(parsedBody) ? 200 : 200,
                body: !isAWhatsappMessage(parsedBody) ? 'Invalid message format' : 'Internal Server Error',
            };
        }

        const waMessage = extractWAMessage(parsedBody);
        const mediaUrl = await processImageMedia(waMessage);

        const sqsPayload: Types.AnisaPayload = {
            id: waMessage.id,
            userId: waMessage.from,
            type: waMessage.type as 'audio' | 'image' | 'text',
            text: waMessage.text?.body,
            provider: 'whatsapp',
            whatsapp: parsedBody,
            ...(mediaUrl && {mediaUrl: [mediaUrl]}),
        };

        await sqsClient.send(new SendMessageCommand({
            QueueUrl: Resource.MessageQueue.url,
            MessageBody: JSON.stringify(sqsPayload),
            MessageGroupId: waMessage.id,
            MessageDeduplicationId: waMessage.id,
        }));

        const businessPhoneNumberId = getBusinessPhoneNumberId(parsedBody);
        businessPhoneNumberId && await Whatsapp.markAsRead(businessPhoneNumberId, waMessage.id);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Message processed successfully',
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error('Failed to process WhatsApp message:', error);
        return {
            statusCode: event.body ? 200 : 200,
            body: event.body ? 'Internal Server Error' : 'Invalid JSON format',
        };
    }
};

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const method = event.requestContext.http.method;
    return method === 'GET' ? handleWebhookVerification(event)
        : method === 'POST' ? await handleWhatsAppMessage(event)
            : {statusCode: 200, body: 'Method Not Allowed'};
};
