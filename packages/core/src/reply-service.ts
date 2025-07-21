import {extractWAMessage, getBusinessPhoneNumberId, reply, sendImage} from './whatsapp/helper';
import {Types} from './types';

export module ReplyService {
    export const replyToProvider = async (message: Types.AnisaPayload) => {
        if (message.provider !== 'whatsapp') {
            throw new Error(`Unsupported message provider: ${message.provider}`);
        }
        return replyToWhatsapp(message);
    };

    const replyToWhatsapp = async (message: Types.AnisaPayload) => {
        const {whatsapp, answer} = message;
        if (!whatsapp || !answer) {
            throw new Error('Missing whatsapp message or answer in payload');
        }

        const whatsappMessage = extractWAMessage(whatsapp);
        const businessPhoneId = getBusinessPhoneNumberId(whatsapp);
        
        if (!businessPhoneId) {
            throw new Error('Business phone number ID not found in the message');
        }

        if (answer.type === 'text') {
            return reply({
                from_business_phone_number_id: businessPhoneId,
                referenceMessage: whatsappMessage,
                answer: answer.text,
            });
        }
        
        if (answer.type === 'image' && answer.mediaUrl) {
            return sendImage(businessPhoneId, whatsappMessage, answer.mediaUrl, answer.text);
        }
        
        throw new Error(`Unsupported message type for reply: ${answer.type}`);
    };
}
