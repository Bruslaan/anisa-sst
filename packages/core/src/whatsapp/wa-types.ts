type AudioMessage = {
  mime_type: string;
  sha256: string;
  id: string;
  voice: true;
};

type ImageMessage = {
  caption: string;
  mime_type: string;
  sha256: string;
  id: string;
};

export interface WhatsappMessage {
  interactive?: {
    button_reply: {
      id: string;
    };
  };
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  audio?: AudioMessage;
  image?: ImageMessage;
  type: string;
}

export interface WhatsappMessagePayload {
  entry: Array<{
    changes: Array<{
      value: {
        metadata: {
          phone_number_id: string;
        };
        messages: Array<WhatsappMessage>;
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
      };
    }>;
    id: string;
  }>;
  object: string;
}
