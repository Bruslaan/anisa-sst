import { SQSEvent, SQSRecord } from 'aws-lambda';
import {Types, ReplyService, Anisa} from "@ANISA/core";

export const handler = async (event: SQSEvent): Promise<{ batchItemFailures: Types.BatchItemFailure[] }> => {
    const results = await Promise.allSettled(event.Records.map(processMessage));
    
    const failedMessageIdentifiers = results
        .map((result, index) => result.status === 'rejected' ? event.Records[index]?.messageId : null)
        .filter((id): id is string => id !== null);

    return {
        batchItemFailures: failedMessageIdentifiers.map(id => ({ itemIdentifier: id }))
    };
};

const processMessage = async (record: SQSRecord): Promise<void> => {
    const message = Types.parseAnisaPayload(record.body);
    
    switch (message.type) {
        case 'text':
            return handleTextMessage(message);
        case 'audio':
        case 'image':
            throw new Error(`${message.type} processing not implemented yet`);
        default:
            throw new Error(`Unsupported message type: ${message.type}`);
    }
};

const handleTextMessage = async (message: Types.AnisaPayload) => {
    if (!message.text?.trim()) return;

    const responseText = await Anisa.askAnisaFn({
        userId: message.userId,
        prompt: message.text,
        imageUrl: message.mediaUrl?.[0]
    });

    message.answer = {
        id: `ans-${message.id}-${Date.now()}`,
        text: responseText.content ?? "",
        type: responseText.type,
        mediaUrl: responseText.image_url || undefined,
    };

    await ReplyService.replyToProvider(message);
};
