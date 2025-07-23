import {SQSEvent, SQSRecord} from "aws-lambda";
import {Types, ReplyService, Anisa, Whatsapp} from "@ANISA/core";

export const handler = async (
    event: SQSEvent
): Promise<{ batchItemFailures: Types.BatchItemFailure[] }> => {

    console.info("Response Handler received SQS events:", event.Records.length);
    const results = await Promise.allSettled(event.Records.map(processMessage));

    const failedMessageIdentifiers = results
        .map((result, index) =>
            result.status === "rejected" ? event.Records[index]?.messageId : null
        )
        .filter((id): id is string => id !== null);


    console.info("Failed messages send back to the que. amount:", failedMessageIdentifiers.length);


    return {
        batchItemFailures: []
    }
    // return {
    //     batchItemFailures: failedMessageIdentifiers.map((id) => ({
    //         itemIdentifier: id,
    //     })),
    // };
};

const processMessage = async (record: SQSRecord): Promise<void> => {

    const message = Types.parseAnisaPayload(record.body);

    console.info("ProcessMessage called with:", message.userId, message);
    try {
        switch (message.type) {
            case "text":
                await handleTextMessage(message);
                break;
            case "audio":
                await handleAudioMessage(message);
                break;
            case "image":
                await handleTextMessage(message);
                break;
            default:
                console.error("Unsupported message type:", message.userId, message.type);
                throw new Error(`Unsupported message type: ${message.type}`);
        }

    } catch (error) {
        console.error("ProcessMessage errored with:", message.userId, error);
        throw error;
    }
};

const handleAudioMessage = async (
    message: Types.AnisaPayload,
) => {
    if (!message.mediaUrl) {
        throw new Error("Audio message missing mediaId");
    }

    console.info("handleAudioMessage called", message.userId);

    try {
        const transcribedText = await Whatsapp.downloadAndDeleteAudio(
            message.mediaUrl,
            async (audioFilePath: string) => {
                console.info("Audio file path", audioFilePath);
                const transcription = await Anisa.transcribeAudio(audioFilePath);
                return transcription;
            }
        );

        console.info("Transcription result:", message.userId, transcribedText);

        const textMessage: Types.AnisaPayload = {
            ...message,
            type: "text",
            text: transcribedText,
            mediaUrl: undefined, // Clear mediaUrl as it's not needed for text messages
        };

        await handleTextMessage(textMessage);
    } catch (error) {
        console.error("handleAudioMessage errored with:", message.userId, error);
        throw error;
    }
};

const handleTextMessage = async (
    message: Types.AnisaPayload,
) => {

    const responseText = await Anisa.askAnisaFn({
        userId: message.userId,
        prompt: message.text,
        imageUrl: message.mediaUrl,
    });

    console.info("Ai response:", message.userId, responseText);


    const costInfo =
        responseText.total_tokens && responseText.cost
            ? `\n\n_📊 ${
                responseText.total_tokens
            } tokens • $${responseText.cost.toFixed(4)}_`
            : "";

    message.answer = {
        id: `ans-${message.id}-${Date.now()}`,
        text: (responseText.content ?? "") + costInfo,
        type: responseText.type,
        mediaUrl: responseText.image_url || undefined,
    };


    await ReplyService.replyToProvider(message);
    console.info("Reply to provider", message.userId, message);
};
