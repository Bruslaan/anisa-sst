import { SQSEvent, SQSRecord } from 'aws-lambda';
import {Types, ReplyService, Anisa, Logger} from "@ANISA/core";

export const handler = async (event: SQSEvent): Promise<{ batchItemFailures: Types.BatchItemFailure[] }> => {
    Logger.info('Response handler started', { 
        batchSize: event.Records.length 
    });

    const results = await Promise.allSettled(event.Records.map(processMessage));
    
    const failedMessageIdentifiers = results
        .map((result, index) => result.status === 'rejected' ? event.Records[index]?.messageId : null)
        .filter((id): id is string => id !== null);

    Logger.info('Response handler completed', { 
        batchSize: event.Records.length,
        successCount: results.length - failedMessageIdentifiers.length,
        failureCount: failedMessageIdentifiers.length,
        failedIds: failedMessageIdentifiers
    });

    return {
        batchItemFailures: failedMessageIdentifiers.map(id => ({ itemIdentifier: id }))
    };
};

const processMessage = async (record: SQSRecord): Promise<void> => {
    const message = Types.parseAnisaPayload(record.body);
    const traceId = message.userId;
    
    const logger = Logger.createContextLogger({
        traceId,
        userId: message.userId,
        messageId: message.id,
        messageType: message.type,
        sqsMessageId: record.messageId
    });

    logger.info('Processing SQS message', { 
        step: 'start',
        messageType: message.type 
    });
    
    try {
        switch (message.type) {
            case 'text':
                await handleTextMessage(message, logger);
                break;
            case 'audio':
            case 'image':
                logger.error('Message type not implemented', { 
                    step: 'error',
                    messageType: message.type 
                });
                throw new Error(`${message.type} processing not implemented yet`);
            default:
                logger.error('Unsupported message type', { 
                    step: 'error',
                    messageType: message.type 
                });
                throw new Error(`Unsupported message type: ${message.type}`);
        }

        logger.info('SQS message processed successfully', { 
            step: 'completed' 
        });
    } catch (error) {
        logger.error('Failed to process SQS message', { 
            step: 'error' 
        }, error as Error);
        throw error;
    }
};

const handleTextMessage = async (message: Types.AnisaPayload, logger: ReturnType<typeof Logger.createContextLogger>) => {
    if (!message.text?.trim()) {
        logger.info('Skipping empty text message', { 
            step: 'skip_empty' 
        });
        return;
    }

    logger.info('Processing text message', { 
        step: 'ai_request_start',
        hasImage: !!message.mediaUrl?.[0],
        textLength: message.text.length 
    });

    const startTime = Date.now();
    const responseText = await Anisa.askAnisaFn({
        userId: message.userId,
        prompt: message.text,
        imageUrl: message.mediaUrl?.[0]
    });
    const aiProcessingTime = Date.now() - startTime;

    logger.info('AI response received', { 
        step: 'ai_response_received',
        responseType: responseText.type,
        responseLength: responseText.content?.length || 0,
        hasImageUrl: !!responseText.image_url,
        processingTimeMs: aiProcessingTime,
        totalTokens: responseText.total_tokens,
        cost: responseText.cost
    });

    // Append token and cost info to response text
    const costInfo = responseText.total_tokens && responseText.cost 
        ? `\n\n_📊 ${responseText.total_tokens} tokens • $${responseText.cost.toFixed(4)}_`
        : '';

    message.answer = {
        id: `ans-${message.id}-${Date.now()}`,
        text: (responseText.content ?? "") + costInfo,
        type: responseText.type,
        mediaUrl: responseText.image_url || undefined,
    };

    logger.info('Sending reply to provider', { 
        step: 'reply_start',
        answerId: message.answer.id,
        answerType: message.answer.type 
    });

    await ReplyService.replyToProvider(message);

    logger.info('Reply sent successfully', { 
        step: 'reply_sent' 
    });
};
