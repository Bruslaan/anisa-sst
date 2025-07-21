import {Supabase} from "./supabase";
import {ResponseStructureOutput} from "./openAi/types";
import {buildContextualHistory} from "./utils/contextOptimizer";
import {generateResponse} from "./openAi/generateResponse";

export type AnisaPayload = {
    userId: string;
    prompt?: string;
    imageUrl?: string;
};

const createMessage = (
    userId: string,
    role: 'user' | 'assistant',
    content?: string,
    imageUrl?: string
): Supabase.Message => ({
    user_id: userId,
    role,
    content: content ?? "",
    media_url: imageUrl ? {url: imageUrl, type: 'image'} : undefined,
    created_at: new Date().toISOString(),
});


export const askAnisa = async (payload: AnisaPayload): Promise<ResponseStructureOutput> => {
    try {
        const {userId, prompt, imageUrl} = payload;
        if (!userId) throw new Error('User ID is required.');
        
        const userMessage = createMessage(userId, 'user', prompt, imageUrl);
        await Supabase.saveMessageToDatabase(userId, userMessage);

        if (!prompt) {
            return {type: 'text', content: '', total_tokens: 0, cost: 0};
        }

        const previousMessages = await Supabase.getMessageHistory(userId, 8);
        const {messageHistory, imageUrls} = buildContextualHistory(previousMessages);
        const aiResponse = await generateResponse(messageHistory, imageUrls);

        const aiContent = aiResponse.image_url
            ? `Generated an image based on: "${prompt}". Image available for further editing or analysis.`
            : aiResponse.content;
            
        await Supabase.saveMessageToDatabase(userId, createMessage(
            userId, 'assistant', aiContent, aiResponse.image_url
        ));

        return aiResponse;
    } catch (error) {
        return {type: 'text', content: 'An error occurred while processing your request.', total_tokens: 0, cost: 0};
    }
};


export namespace Anisa {
    export const askAnisaFn = askAnisa;
}
