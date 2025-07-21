import { WhatsappMessagePayload } from '@ANISA/core/whatsapp/wa-types';

export module Types {
  export interface BatchItemFailure {
    itemIdentifier: string;
  }

  export type AnisaPayload = {
    id: string;
    userId: string;
    text?: string | undefined;
    mediaUrl?: string[];
    type: 'audio' | 'image' | 'text';
    provider: 'whatsapp' | 'telegram';
    whatsapp?: WhatsappMessagePayload;
    answer?: {
      id: string;
      text: string;
      mediaUrl?: string;
      type: 'audio' | 'image' | 'text';
    };
  };

  export const parseAnisaPayload = (
    body: string | AnisaPayload
  ): AnisaPayload => {
    try {
      let message: AnisaPayload;
      console.log('Parsing message body:', body);
      if (typeof body === 'string') {
        message = JSON.parse(body);
      } else if (typeof body === 'object' && body !== null) {
        message = body as AnisaPayload;
      } else {
        throw new Error('Message body is not a string or a valid object.');
      }

      if (!message.id || !message.type || !message.provider) {
        throw new Error('Missing required fields: id, type, or provider');
      }

      const validTypes = ['audio', 'image', 'text'];
      if (!validTypes.includes(message.type)) {
        throw new Error(
          `Invalid message type: ${message.type}. Must be one of ${validTypes.join(', ')}`
        );
      }
      const validProviders = ['whatsapp', 'telegram'];
      if (!validProviders.includes(message.provider)) {
        throw new Error(
          `Invalid message provider: ${message.provider}. Must be one of ${validProviders.join(', ')}`
        );
      }

      console.log('Parsed message is:', message);

      return message;
    } catch (error: unknown) {
      console.error('Error parsing message body:', body, error);
      if (error instanceof Error) {
        throw new Error(`Invalid message format: ${error.message}`);
      }
      throw new Error('Invalid message format due to an unknown error.');
    }
  };
}
