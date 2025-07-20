import {
  extractWAMessage,
  getBusinessPhoneNumberId,
  reply,
  sendImage,
} from '@ANISA/core/whatsapp/helper';
import { Types } from '@ANISA/core/types';

export module ReplyService {
  export const replyToProvider = async (message: Types.AnisaPayload) => {
    try {
      switch (message.provider) {
        case 'whatsapp':
          return await replyToWhatsapp(message);
        default:
          throw new Error(`Unsupported message provider: ${message.provider}`);
      }
    } catch (error) {
      console.error('replyToProvider failed:', {
        error: error instanceof Error ? error.message : String(error),
        provider: message?.provider,
        hasWhatsapp: !!message?.whatsapp,
        hasAnswer: !!message?.answer,
      });
      throw error;
    }
  };

  const replyToWhatsapp = async (message: Types.AnisaPayload) => {
    try {
      if (!message.whatsapp || !message.answer) {
        throw new Error('Missing whatsapp message or answer in payload');
      }

      const { whatsapp, answer } = message;
      const whatsappMessage = extractWAMessage(whatsapp);
      const business_phone_number_id = getBusinessPhoneNumberId(whatsapp);

      if (!business_phone_number_id) {
        throw new Error('Business phone number ID not found in the message');
      }
      console.log('Replying to WhatsApp message:', answer?.text);

      switch (answer?.type) {
        case 'text':
          await reply({
            from_business_phone_number_id: business_phone_number_id,
            referenceMessage: whatsappMessage,
            answer: answer.text,
          });
          return;
        case 'image':
          console.debug('Sending image reply to WhatsApp message:', answer.text);
          await sendImage(business_phone_number_id, whatsappMessage, answer.text);
          return;
        default:
          throw new Error(`Unsupported message type for reply: ${answer.type}`);
      }
    } catch (error) {
      console.error('replyToWhatsapp failed:', {
        error: error instanceof Error ? error.message : String(error),
        answerType: message?.answer?.type,
        businessPhoneId: getBusinessPhoneNumberId(message?.whatsapp!),
        messageId:
          message?.whatsapp?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id,
      });
      throw error;
    }
  };
}
