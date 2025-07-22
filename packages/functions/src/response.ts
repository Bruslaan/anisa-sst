import { SQSEvent, SQSRecord } from "aws-lambda";
import { Types, ReplyService, Anisa, Logger, Whatsapp } from "@ANISA/core";

export const handler = async (
  event: SQSEvent
): Promise<{ batchItemFailures: Types.BatchItemFailure[] }> => {

  const results = await Promise.allSettled(event.Records.map(processMessage));

  const failedMessageIdentifiers = results
    .map((result, index) =>
      result.status === "rejected" ? event.Records[index]?.messageId : null
    )
    .filter((id): id is string => id !== null);


  return {
    batchItemFailures: failedMessageIdentifiers.map((id) => ({
      itemIdentifier: id,
    })),
  };
};

const processMessage = async (record: SQSRecord): Promise<void> => {

  if (true){

    return
  }

  const message = Types.parseAnisaPayload(record.body);
  const traceId = message.userId;

  const logger = Logger.createContextLogger({
    traceId,
    userId: message.userId,
    messageId: message.id,
    messageType: message.type,
    sqsMessageId: record.messageId,
  });


  try {
    switch (message.type) {
      case "text":
        await handleTextMessage(message, logger);
        break;
      case "audio":
        await handleAudioMessage(message, logger);
        break;
      case "image":
        await handleTextMessage(message, logger);
        break;
      default:

        throw new Error(`Unsupported message type: ${message.type}`);
    }


  } catch (error) {
    logger.error(
      "Failed to process SQS message",
      {
        step: "error",
      },
      error as Error
    );
    throw error;
  }
};

const handleAudioMessage = async (
  message: Types.AnisaPayload,
  logger: ReturnType<typeof Logger.createContextLogger>
) => {
  if (!message.mediaUrl) {
    logger.error("Audio message missing mediaId", {
      step: "error",
    });
    throw new Error("Audio message missing mediaId");
  }


  try {
    const transcribedText = await Whatsapp.downloadAndDeleteAudio(
      message.mediaUrl,
      async (audioFilePath: string) => {


        const transcription = await Anisa.transcribeAudio(audioFilePath);



        return transcription;
      }
    );

    // Create a new message with the transcribed text and pass it to handleTextMessage
    const textMessage: Types.AnisaPayload = {
      ...message,
      type: "text",
      text: transcribedText,
    };



    await handleTextMessage(textMessage, logger);
  } catch (error) {
    logger.error(
      "Failed to process audio message",
      {
        step: "error",
      },
      error as Error
    );
    throw error;
  }
};

const handleTextMessage = async (
  message: Types.AnisaPayload,
  logger: ReturnType<typeof Logger.createContextLogger>
) => {



  const startTime = Date.now();
  const responseText = await Anisa.askAnisaFn({
    userId: message.userId,
    prompt: message.text,
    imageUrl: message.mediaUrl,
  });
  const aiProcessingTime = Date.now() - startTime;


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
};
