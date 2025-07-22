import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import {
  isAWhatsappMessage,
  extractWAMessage,
  getMediaURL,
  downloadMediaToStream,
  streamToBase64,
  uploadBase64Image,
  type WhatsappMessage,
  Types,
  Whatsapp,
  getBusinessPhoneNumberId,
  Logger,
} from "@ANISA/core";
import { Resource } from "sst";

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "eu-central-1",
});
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

const handleWebhookVerification = (
  event: APIGatewayProxyEventV2
): APIGatewayProxyResult => {
  const { queryStringParameters: params } = event;
  const isValid =
    params?.["hub.mode"] === "subscribe" &&
    params?.["hub.verify_token"] === WEBHOOK_VERIFY_TOKEN;

  Logger.info("Webhook verification request", {
    mode: params?.["hub.mode"],
    tokenValid: params?.["hub.verify_token"] === WEBHOOK_VERIFY_TOKEN,
    result: isValid ? "success" : "forbidden",
  });

  return isValid
    ? { statusCode: 200, body: params?.["hub.challenge"] || "" }
    : { statusCode: 403, body: "Forbidden" };
};

const processImageMedia = async (
  waMessage: WhatsappMessage,
  logger: ReturnType<typeof Logger.createContextLogger>
): Promise<string | undefined> => {
  if (waMessage.type !== "image" || !waMessage.image?.id) return undefined;

  logger.info("Processing image media", {
    step: "start",
    imageId: waMessage.image.id,
  });

  try {
    const imageUrl = await getMediaURL(waMessage.image.id);
    logger.info("Retrieved media URL", {
      step: "media_url_retrieved",
    });

    const base64Image = await downloadMediaToStream(imageUrl);
    logger.info("Downloaded media stream", {
      step: "media_downloaded",
    });

    const stream = await streamToBase64(base64Image);
    logger.info("Converted to base64", {
      step: "base64_converted",
    });

    const { publicUrl } = await uploadBase64Image(stream as string, "images");
    logger.info("Uploaded image to Supabase", {
      step: "uploaded",
      publicUrl,
    });

    return publicUrl;
  } catch (error) {
    logger.error(
      "Failed to process image media",
      {
        step: "error",
        imageId: waMessage.image.id,
      },
      error as Error
    );
    throw error;
  }
};

const handleWhatsAppMessage = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
  let logger: ReturnType<typeof Logger.createContextLogger> | undefined;

  try {
    const parsedBody = JSON.parse(event.body || "{}");

    if (!isAWhatsappMessage(parsedBody) || !Resource.MessageQueue.url) {
      Logger.info("Skipping non-WhatsApp message or missing SQS URL", {
        isWhatsappMessage: isAWhatsappMessage(parsedBody),
        hasSqsUrl: !!Resource.MessageQueue.url,
      });
      return {
        statusCode: 200,
        body: "",
      };
    }

    const waMessage = extractWAMessage(parsedBody);
    const traceId = waMessage.from;

    logger = Logger.createContextLogger({
      traceId,
      userId: waMessage.from,
      messageId: waMessage.id,
      messageType: waMessage.type,
    });

    logger.info("Processing WhatsApp message", {
      step: "start",
      messageType: waMessage.type,
      hasText: !!waMessage.text?.body,
      hasImage: waMessage.type === "image",
    });

    const mediaUrl =
      waMessage.type === "image"
        ? await processImageMedia(waMessage, logger)
        : waMessage.type === "audio"
        ? waMessage.audio?.id
        : undefined;

    const sqsPayload: Types.AnisaPayload = {
      id: waMessage.id,
      userId: waMessage.from,
      type: waMessage.type as "audio" | "image" | "text",
      text: waMessage.text?.body,
      provider: "whatsapp",
      whatsapp: parsedBody,
      ...(mediaUrl && { mediaUrl }),
    };

    logger.info("Sending message to SQS", {
      step: "sqs_send",
      queueUrl: Resource.MessageQueue.url,
    });

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: Resource.MessageQueue.url,
        MessageBody: JSON.stringify(sqsPayload),
        MessageGroupId: waMessage.id,
        MessageDeduplicationId: waMessage.id,
      })
    );

    logger.info("Message sent to SQS successfully", {
      step: "sqs_sent",
    });

    const businessPhoneNumberId = getBusinessPhoneNumberId(parsedBody);
    if (businessPhoneNumberId) {
      logger.info("Marking message as read", {
        step: "mark_read",
        businessPhoneNumberId,
      });
      await Whatsapp.markAsRead(businessPhoneNumberId, waMessage.id);
      logger.info("Message marked as read", {
        step: "marked_read",
      });
    }

    logger.info("WhatsApp message processed successfully", {
      step: "completed",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Message processed successfully",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    if (logger) {
      logger.error(
        "Failed to process WhatsApp message",
        {
          step: "error",
        },
        error as Error
      );
    } else {
      Logger.error("Failed to process WhatsApp message", {}, error as Error);
    }
    return {
      statusCode: 200,
      body: "",
    };
  }
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResult> => {
  const method = event.requestContext.http.method;
  return method === "GET"
    ? handleWebhookVerification(event)
    : method === "POST"
    ? await handleWhatsAppMessage(event)
    : { statusCode: 200, body: "Method Not Allowed" };
};
