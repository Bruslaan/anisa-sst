import * as console from 'node:console';
import {Supabase} from "./supabase";
import Message = Supabase.Message;
import {ResponseStructureOutput} from "./openAi/types";
import saveMessageToDatabase = Supabase.saveMessageToDatabase;
import getMessageHistory = Supabase.getMessageHistory;
import {buildContextualHistory} from "./utils/contextOptimizer";
import {generateResponse} from "./openAi/generateResponse";

export type AnisaPayload = {
    userId: string;
    prompt?: string;
    imageUrl?: string;
};

const CONTEXT_WINDOW = 8;

const validatePayload = (payload: AnisaPayload): void => {
    if (!payload.userId) {
        throw new Error('User ID is required.');
    }
};

const createMessage = (
    userId: string,
    role: 'user' | 'assistant',
    content?: string,
    imageUrl?: string
): Message => ({
    user_id: userId,
    role,
    content: content ?? "",
    media_url: imageUrl ? {url: imageUrl, type: 'image'} : undefined,
    created_at: new Date().toISOString(),
});


export const askAnisa = async (
    payload: AnisaPayload
): Promise<ResponseStructureOutput> => {
    try {
        const {userId, prompt, imageUrl} = payload;
        validatePayload(payload);
        const userMessage = createMessage(userId, 'user', prompt, imageUrl);
        await saveMessageToDatabase(userId, userMessage);

        // if there is no prompt its maybe just an image that we upload into the history
        if (!prompt) {
            return {
                type: 'text',
                content: '',
                total_tokens: 0,
                cost: 0,
            };
        }

        const previousMessages = await getMessageHistory(userId, CONTEXT_WINDOW);
        const {messageHistory, imageUrls, contextSummary} =
            buildContextualHistory(previousMessages);

        console.log(`Context: ${contextSummary}`);
        const aiResponse = await generateResponse(messageHistory, imageUrls);

        const aiContent = aiResponse.image_url
            ? `Generated an image based on: "${prompt}". Image available for further editing or analysis.`
            : aiResponse.content;
        const assistantMessage = createMessage(
            userId,
            'assistant',
            aiContent,
            aiResponse.image_url
        );
        await saveMessageToDatabase(userId, assistantMessage);

        return aiResponse;
    } catch (error) {
        console.error('Error in askAnisa:', error);
        return {
            type: 'text',
            content: 'An error occurred while processing your request.',
            total_tokens: 0,
            cost: 0,
        };
    }
};


export module Anisa {
    export type Payload = AnisaPayload;
    export type Response = ResponseStructureOutput;
    export const askAnisaFn = askAnisa;
}
