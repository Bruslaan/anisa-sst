import {SQSEvent, SQSRecord} from "aws-lambda";
import {Types, ReplyService, Anisa, Whatsapp} from "@ANISA/core";

const transcribeAudio = async (message: Types.AnisaPayload) => {
    if (!message.mediaUrl) throw new Error("Audio message missing mediaId");

    const transcribedText = await Whatsapp.downloadAndDeleteAudio(
        message.mediaUrl,
        (audioFilePath: string) => Anisa.transcribeAudio(audioFilePath)
    );

    return {...message, type: "text" as const, text: transcribedText, mediaUrl: undefined};
};

const generateResponse = async (message: Types.AnisaPayload) => {
    const response = await Anisa.askAnisaFn({
        userId: message.userId,
        prompt: message.text,
        imageUrl: message.mediaUrl,
    });

    const costInfo = response.total_tokens && response.cost
        ? `\n\n_📊 ${response.total_tokens} tokens • $${response.cost.toFixed(4)}_`
        : "";

    return {
        ...message,
        answer: {
            id: `ans-${message.id}-${Date.now()}`,
            text: (response.content ?? "") + costInfo,
            type: response.type,
            mediaUrl: response.image_url || undefined,
        }
    };
};

const processMessage = async (record: SQSRecord) => {
    const message = Types.parseAnisaPayload(record.body);

    const processedMessage = message.type === "audio"
        ? await transcribeAudio(message)
        : message;

    const messageWithResponse = await generateResponse(processedMessage);
    await ReplyService.replyToProvider(messageWithResponse);
};

export const handler = async (event: SQSEvent) => {
    console.info("Processing", event.Records.length, "messages");

    const results = await Promise.allSettled(
        event.Records.map(processMessage)
    );

    const failures = results
        .map((result, index) =>
            result.status === "rejected" ? event.Records[index]?.messageId : null
        )

    console.info("Failed:", failures.length);

    return {
        batchItemFailures: []
    };
};
