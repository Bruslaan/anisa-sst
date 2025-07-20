import { SQSEvent } from 'aws-lambda';
import {Types, ReplyService, OpenAi} from "@ANISA/core";

export const handler = async (
    event: SQSEvent
): Promise<{ batchItemFailures: Types.BatchItemFailure[] }> => {
    console.log(
        `Attempting to generate ${event.Records.length} images concurrently.`
    );

    // Store the whole batch into this array
    const processingPromises = event.Records.map((sqsMessage) => {
        const anisaPayload: Types.AnisaPayload = Types.parseAnisaPayload(sqsMessage.body);
        return processImageGeneration(anisaPayload);
    });

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

const processImageGeneration = async (message: Types.AnisaPayload): Promise<void> => {
    const startTime = Date.now();

    console.log(
        `Processing ${message.provider} ${message.type} message: ${message.id}`
    );

    // im not throwing an error here, because this will push the message back to SQS
    // we just want to drop this message if it has no text content
    if (message.text === undefined || message.text.trim() === '') {
        console.error(
            `Message ${message.id} has no text content to generate an image. Skipping processing.`
        );
        return;
    }

    let imageUrl: string;

    console.log(
        `Generating image for message ${message.id} with text: ${message.text} with mediaUrl: ${message.mediaUrl}`
    );
    if (message.mediaUrl && message.mediaUrl.length > 0) {
        console.log(
            `Generating image with prompt and ${message.mediaUrl.length} reference images`
        );
        imageUrl = await OpenAi.generateImageFromUrls(message.text, message.mediaUrl);
    } else {
        console.log(`Generating image with text prompt only`);
        imageUrl = await OpenAi.generateImage(message.text);
    }

    const aiResponseTime = Date.now() - startTime;
    console.log(
        `AI response for ${message.id} (SQS ID: ${message}) generated in ${aiResponseTime}ms.`
    );

    message.answer = {
        id: `ans-${message.id}-${Date.now()}`,
        text: imageUrl,
        type: 'image',
    };

    const replyStartTime = Date.now();
    await ReplyService.replyToProvider(message);
    const replyTime = Date.now() - replyStartTime;
    console.log(`Replied to provider for ${message.id}  in ${replyTime}ms.`);
    console.log(
        `Text message ${message.id} processed successfully. Total time for handler: ${Date.now() - startTime}ms`
    );
};
