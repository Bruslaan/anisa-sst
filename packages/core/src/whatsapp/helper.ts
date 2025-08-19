import {WhatsappMessage, WhatsappMessagePayload} from './wa-types';
import axios from 'axios';
import FormData from 'form-data';

const GRAPH_API_TOKEN = process.env.GRAPH_API_TOKEN;

const WA_API_VERSION = process.env.WA_VERSION || "v21.0";
export const isAWhatsappMessage = (
    unknownObject: unknown
): unknownObject is WhatsappMessagePayload => {
    if (!unknownObject || typeof unknownObject !== 'object') {
        return false;
    }

    const msg = unknownObject as WhatsappMessagePayload;

    if (!msg) {
        return false;
    }
    const entry = msg?.entry?.[0];
    const changes = entry?.changes?.[0].value as {
        statuses?: Array<{ status: string }>;
    };
    if (changes?.statuses) {
        return false;
    }

    return Boolean(
        msg.entry &&
        Array.isArray(msg.entry) &&
        msg.entry.length > 0 &&
        msg.entry?.[0]?.changes &&
        Array.isArray(msg.entry[0].changes) &&
        msg.entry[0].changes.length > 0 &&
        msg.entry[0].changes?.[0]?.value &&
        msg.entry[0].changes[0].value.messages &&
        msg.entry[0].changes[0].value.metadata &&
        msg.entry[0].changes[0].value.metadata.phone_number_id &&
        Array.isArray(msg.entry[0].changes[0].value.messages) &&
        msg.entry[0].changes[0].value.messages.length > 0
    );
};

export const getBusinessPhoneNumberId = (
    waPayload: WhatsappMessagePayload
): string | undefined => {
    return waPayload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
};

export const extractWAMessage = (
    payload: WhatsappMessagePayload
): WhatsappMessage =>
    <WhatsappMessage>payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

export const getMediaURL = async (mediaID: string) => {
    const {
        data: {url},
    } = await axios({
        method: 'GET',
        url: `https://graph.facebook.com/v21.0/${mediaID}/`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
    });

    return url;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const streamToBase64 = (stream: any) => {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer<ArrayBufferLike>) => chunks.push(chunk));
        stream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const base64String = buffer.toString('base64');
            resolve(`data:image/jpeg;base64,${base64String}`);
        });
        stream.on('error', (error: unknown) => reject(error));
    });
};

export const downloadMediaToStream = async (url: string) => {
    const mediastream = await axios({
        method: 'GET',
        url: url,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        responseType: 'stream',
    });

    return mediastream.data;
};

const markAsRead = async (
    business_phone_number_id: string,
    messageID: string
) => {
    return axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageID,
        },
    });
};

const reply = async ({
                         from_business_phone_number_id,
                         referenceMessage,
                         answer,
                     }: {
    from_business_phone_number_id: string;
    referenceMessage: WhatsappMessage;
    answer: string;
}) => {
    return axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${from_business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: {
            messaging_product: 'whatsapp',
            to: referenceMessage.from,
            text: {body: answer},
            context: {
                message_id: referenceMessage.id,
            },
        },
    });
};

const uploadMedia = async (
    business_phone_number_id: string,
    fileBuffer: Buffer,
    fileName: string,
    fileType: string = 'audio/mpeg' // Corrected MIME type
): Promise<{ id: string }> => {
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: fileType,
    });

    const response = await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${business_phone_number_id}/media`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
            ...formData.getHeaders(),
        },
        data: formData,
    });

    return {id: response.data.id};
};

const sendImage = async (
    business_phone_number_id: string,
    message: WhatsappMessage,
    image_url: string,
    caption?: string
) => {
    return axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: {
            messaging_product: 'whatsapp',
            to: message.from,
            type: 'image',
            image: {
                link: image_url,
                caption: caption || '',
            },
        },
    });
};

const sendAudio = async (
    business_phone_number_id: string,
    message: WhatsappMessage,
    id: string
) => {
    return axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        data: {
            messaging_product: 'whatsapp',
            to: message.from,
            type: 'audio',
            audio: {
                id: id,
            },
        },
    });
};

const sendMessage = async (
    business_phone_number_id: string,
    message: WhatsappMessage
) => {
    return axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: {
            messaging_product: 'whatsapp',
            to: message.from,
            text: message.text,
        },
    });
};

const replyWithCallToAction = async ({
                                         business_phone_number_id,
                                         message,
                                         header,
                                         body,
                                         footer,
                                         buttonText,
                                         url
                                     }: {
                                         business_phone_number_id: string,
                                         message: WhatsappMessage,
                                         header: string,
                                         body: string,
                                         footer: string,
                                         buttonText: string,
                                         url: string
                                     }
) => {
    return axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: {
            messaging_product: 'whatsapp',
            to: message.from,
            type: 'interactive',
            text: message.text,
            interactive: {
                type: 'cta_url',

                /* Header optional */
                header: {
                    type: 'text',
                    text: header,
                },

                /* Body optional */
                body: {
                    text: body,
                },

                /* Footer optional */
                footer: {
                    text: footer,
                },
                action: {
                    name: 'cta_url',
                    parameters: {
                        display_text: buttonText,
                        url: url,
                    },
                },
            },
        },
    });
};

const replyWithCallToAction2 = async (
    business_phone_number_id: string,
    message: WhatsappMessage,
    url: string
) => {
    const replyWithCallToActionResponse = await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: {
            messaging_product: 'whatsapp',
            to: message.from,
            type: 'template',
            text: message.text,
            template: {
                name: 'email_template',
                language: {
                    code: 'en',
                },
                components: [
                    {
                        type: 'button',
                        sub_type: 'url',
                        index: 0,
                        parameters: [
                            {
                                type: 'url',
                                url: url,
                            },
                        ],
                    },
                ],
            },
        },
    });

    return JSON.stringify(replyWithCallToActionResponse);
};

const sendInteractiveButtons = async ({
                                          business_phone_number_id,
                                          message,
                                          header,
                                          body,
                                          footer,
                                          buttons
                                      }: {
                                          business_phone_number_id: string,
                                          message: WhatsappMessage,
                                          header: string,
                                          body: string,
                                          footer: string,
                                          buttons: Array<{ id: string; title: string }>
                                      }
) => {
    return axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: {
            messaging_product: 'whatsapp',
            to: message.from,
            type: 'interactive',
            interactive: {
                type: 'button',

                header: {
                    type: 'text',
                    text: header,
                },

                body: {
                    text: body,
                },

                footer: {
                    text: footer,
                },

                action: {
                    buttons: buttons.map((button) => ({
                        type: 'reply',
                        reply: {
                            id: button.id,
                            title: button.title,
                        },
                    })),
                },
            },
        },
    });
};

const sendListMessage = async (
    business_phone_number_id: string,
    message: WhatsappMessage,
    header: string,
    body: string,
    footer: string,
    buttonText: string,
    sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
    }>
) => {
    return axios({
        method: 'POST',
        url: `https://graph.facebook.com/${WA_API_VERSION}/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: {
            messaging_product: 'whatsapp',
            to: message.from,
            type: 'interactive',
            interactive: {
                type: 'list',

                header: {
                    type: 'text',
                    text: header,
                },

                body: {
                    text: body,
                },

                footer: {
                    text: footer,
                },

                action: {
                    button: buttonText,
                    sections: sections,
                },
            },
        },
    });
};

export {
    markAsRead,
    reply,
    replyWithCallToAction2,
    replyWithCallToAction,
    sendMessage,
    sendImage,
    uploadMedia,
    sendAudio,
    sendInteractiveButtons,
    sendListMessage,
};
