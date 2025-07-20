import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseAnisaPayload } from '@ANISA/core/types';

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const API_TOKEN = process.env.API_TOKEN || 'default_api_token';

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'eu-central-1',
});

const handleApiRequest = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!API_TOKEN) {
        console.error('API_TOKEN is not defined');
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal Server Error: API_TOKEN is not defined',
            }),
        };
    }

    if (!token || token !== API_TOKEN) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' }),
        };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Request body is required' }),
        };
    }

    if (!SQS_QUEUE_URL) {
        console.error('SQS_QUEUE_URL is not defined');
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal Server Error: SQS_QUEUE_URL is not defined',
            }),
        };
    }

    try {
        const anisaPayload = parseAnisaPayload(event.body);

        const sqsCommand = new SendMessageCommand({
            QueueUrl: SQS_QUEUE_URL,
            MessageBody: JSON.stringify(anisaPayload),
        });

        await sqsClient.send(sqsCommand);
        console.log(
            'AnisaPayload sent to SQS queue:',
            JSON.stringify(anisaPayload)
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Message processed successfully',
                timestamp: new Date().toISOString(),
            }),
        };
    } catch (error) {
        console.error('Failed to process API request:', error);

        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

        return {
            statusCode: 400,
            body: JSON.stringify({ error: errorMessage }),
        };
    }
};

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    if (event.httpMethod === 'POST') {
        return handleApiRequest(event);
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
};
