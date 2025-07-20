import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  downloadMediaToStream,
  extractWAMessage,
  getMediaURL,
  isAWhatsappMessage,
  streamToBase64,
} from '@ANISA/core/whatsapp/helper';
import { AnisaPayload } from '@ANISA/core/types';
import { uploadBase64Image } from '@ANISA/core/supabase/actions';
import { WhatsappMessage } from '@ANISA/core/whatsapp/wa-types';

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'test';
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});

const handleWebhookVerification = (
    event: APIGatewayProxyEvent
): APIGatewayProxyResult => {
  const { queryStringParameters } = event;
  const mode = queryStringParameters?.['hub.mode'];
  const token = queryStringParameters?.['hub.verify_token'];
  const challenge = queryStringParameters?.['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    return {
      statusCode: 200,
      body: challenge || '',
    };
  }

  return {
    statusCode: 403,
    body: 'Forbidden',
  };
};

const processImageMedia = async (
    waMessage: WhatsappMessage
): Promise<string | undefined> => {
  if (waMessage.type !== 'image' || !waMessage.image?.id) {
    return undefined;
  }

  try {
    const imageUrl = await getMediaURL(waMessage.image.id);
    console.log('Image URL:', imageUrl);

    const base64Image = await downloadMediaToStream(imageUrl);
    const stream = await streamToBase64(base64Image);
    const { publicUrl } = await uploadBase64Image(stream as string, 'images');

    console.log('Media URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Failed to process image media:', error);
    throw error;
  }
};

const handleWhatsAppMessage = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let parsedBody;

  try {
    parsedBody = JSON.parse(event.body || '{}');
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return {
      statusCode: 400,
      body: 'Invalid JSON format',
    };
  }

  if (!isAWhatsappMessage(parsedBody)) {
    console.error('Received invalid message format');
    return {
      statusCode: 400,
      body: 'Invalid message format',
    };
  }

  if (!SQS_QUEUE_URL) {
    console.error('SQS_QUEUE_URL is not defined');
    return {
      statusCode: 500,
      body: 'Internal Server Error: SQS_QUEUE_URL is not defined',
    };
  }

  try {
    const waMessage = extractWAMessage(parsedBody);

    const sqsPayload: AnisaPayload = {
      id: waMessage.id,
      type: waMessage.type as 'audio' | 'image' | 'text',
      text: waMessage.text?.body,
      provider: 'whatsapp',
      whatsapp: parsedBody,
    };
    const mediaUrl = await processImageMedia(waMessage);
    if (mediaUrl) {
      sqsPayload.mediaUrl = [mediaUrl];
    }

    const sqsCommand = new SendMessageCommand({
      QueueUrl: SQS_QUEUE_URL,
      MessageBody: JSON.stringify(sqsPayload),
    });

    await sqsClient.send(sqsCommand);
    console.log(
        'WhatsApp message sent to SQS queue v1:',
        JSON.stringify(sqsPayload)
    );

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
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
};

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'GET') {
    return handleWebhookVerification(event);
  }

  if (event.httpMethod === 'POST') {
    return handleWhatsAppMessage(event);
  }

  return {
    statusCode: 405,
    body: 'Method Not Allowed',
  };
};
