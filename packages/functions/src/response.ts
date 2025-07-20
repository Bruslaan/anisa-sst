import { SQSEvent, SQSRecord } from 'aws-lambda';
import { generateAiResponse } from '@ANISA/core/openAi/generateAiResponse';
import { replyToProvider } from '@ANISA/core/reply-service';
import { AnisaPayload, BatchItemFailure, parseAnisaPayload } from '@ANISA/core/types';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'eu-central-1',
});

export const handler = async (
    event: SQSEvent
): Promise<{ batchItemFailures: BatchItemFailure[] }> => {
    console.log(
        `Attempting to process ${event.Records.length} messages concurrently.`
    );

    // Store the whole batch into this array
    const processingPromises = event.Records.map((sqsMessage) =>
        processMessage(sqsMessage)
    );

    // handle all messages concurrently
    const results = await Promise.allSettled(processingPromises);

    // failed messages will be sent back to SQS
    const failedMessageIdentifiers: string[] = [];

    results.forEach((result, index) => {
        const record = event.Records[index];
        if (result.status === 'rejected') {
            console.error(
                `Failed to process message ${record?.messageId}. Reason:`,
                result.reason
            );
            failedMessageIdentifiers.push(record?.messageId!);
        }
    });

    if (failedMessageIdentifiers.length > 0) {
        console.log(
            `${failedMessageIdentifiers.length} of ${event.Records.length} messages failed processing and will be retried.`
        );
    } else if (event.Records.length > 0) {
        console.log(
            `All ${event.Records.length} messages in the batch processed successfully.`
        );
    } else {
        console.log('No messages in the batch to process.');
    }

    return {
        batchItemFailures: failedMessageIdentifiers.map((id) => ({
            itemIdentifier: id,
        })),
    };
};

const processMessage = async (record: SQSRecord): Promise<void> => {
    const anisaPayloadMessage = parseAnisaPayload(record.body);

    console.log(
        `Processing ${anisaPayloadMessage.provider} ${anisaPayloadMessage.type} message: ${anisaPayloadMessage.id} (SQS ID: ${record.messageId})`
    );

    switch (anisaPayloadMessage.type) {
        case 'text':
            await handleTextMessage(anisaPayloadMessage, record.messageId);
            break;
        case 'audio':
            await handleAudioMessage(anisaPayloadMessage);
            break;
        case 'image':
            await handleImageMessage(anisaPayloadMessage);
            break;
        default:
            throw new Error(`Unsupported message type: ${anisaPayloadMessage.type}`);
    }
};

const handleTextMessage = async (
    message: AnisaPayload,
    sqsMessageId: string
) => {
    if (!message.text?.trim()) {
        console.warn(
            `Text message ${message.id} (SQS ID: ${sqsMessageId}) is empty or whitespace-only. Skipping AI response.`
        );
        return;
    }

    const startTime = Date.now();
    const responseText = await generateAiResponse(
        message.text,
        async (toolName: string, functionArguments: Record<string, unknown>) => {
            console.log(toolName, functionArguments);

            message.text = functionArguments.prompt as string;
            const sqsCommand = new SendMessageCommand({
                QueueUrl: SQS_QUEUE_URL,
                MessageBody: JSON.stringify(message),
            });

            await sqsClient.send(sqsCommand);
            console.log(
                'WhatsApp message sent to SQS queue v1:',
                JSON.stringify(message)
            );
        }
    );
    const aiResponseTime = Date.now() - startTime;
    console.log(
        `AI response for ${message.id} (SQS ID: ${sqsMessageId}) generated in ${aiResponseTime}ms.`
    );

    message.answer = {
        id: `ans-${message.id}-${Date.now()}`,
        text: responseText,
        type: 'text',
    };

    const replyStartTime = Date.now();
    await replyToProvider(message);
    const replyTime = Date.now() - replyStartTime;
    console.log(
        `Replied to provider for ${message.id} (SQS ID: ${sqsMessageId}) in ${replyTime}ms.`
    );
    console.log(
        `Text message ${message.id} (SQS ID: ${sqsMessageId}) processed successfully. Total time for handler: ${Date.now() - startTime}ms`
    );
};

const handleAudioMessage = async (message: AnisaPayload) => {
    if (!message.mediaUrl) {
        throw new Error(`Audio message ${message.id} missing media URL`);
    }
    console.warn(
        `Audio processing for message ${message.id} not implemented yet.`
    );
    // TODO: Implement audio processing
    throw new Error(
        `Audio processing for message ${message.id} not implemented yet`
    );
};

const handleImageMessage = async (message: AnisaPayload) => {
    if (!message.mediaUrl) {
        throw new Error(`Image message ${message.id} missing media URL`);
    }
    console.warn(
        `Image processing for message ${message.id} not implemented yet.`
    );
    // TODO: Implement image processing
    throw new Error(
        `Image processing for message ${message.id} not implemented yet`
    );
};
