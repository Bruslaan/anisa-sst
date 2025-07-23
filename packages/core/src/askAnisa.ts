import {Supabase} from "./supabase";
import {ResponseStructureOutput} from "./openAi/types";
import {buildContextualHistory} from "./utils/contextOptimizer";
import {generateResponse} from "./openAi/generateResponse";
import {transcribeAudio as transcribeAudioFn} from "./openAi/transcribe-audio";

export type AnisaPayload = {
    userId: string;
    prompt?: string;
    imageUrl?: string;
};

const createMessage = (
    userId: string,
    role: "user" | "assistant" | "developer",
    content = "",
    imageUrl?: string
): Supabase.Message => ({
    user_id: userId,
    role,
    content,
    media_url: imageUrl ? {url: imageUrl, type: "image"} : undefined,
    created_at: new Date().toISOString(),
});

const saveMessages = async (userId: string, messages: Supabase.Message[]) => 
    Promise.all(messages.map(msg => Supabase.saveMessageToDatabase(userId, msg)));

const prepareMessages = (userId: string, prompt?: string, imageUrl?: string) => {
    const userMessage = createMessage(userId, "user", prompt, imageUrl);
    const messages = [userMessage];
    
    if (imageUrl) {
        const developerMessage = createMessage(userId, "developer", "* User uploaded an image, take it into account *");
        messages.unshift(developerMessage);
    }
    
    return messages;
};

const getResponseContent = (aiResponse: ResponseStructureOutput, prompt?: string) => 
    aiResponse.image_url 
        ? `Generated an image based on: "${prompt}". Image available for further editing or analysis.`
        : aiResponse.content;

const errorResponse: ResponseStructureOutput = {
    type: "text",
    content: "An error occurred while processing your request.",
    total_tokens: 0,
    cost: 0,
};

export const askAnisa = async ({userId, prompt, imageUrl}: AnisaPayload): Promise<ResponseStructureOutput> => {
    try {
        if (!userId) throw new Error("User ID is required.");
        
        const messages = prepareMessages(userId, prompt, imageUrl);
        await saveMessages(userId, messages);
        
        const previousMessages = await Supabase.getMessageHistory(userId, 8);
        const {messageHistory, imageUrls} = buildContextualHistory(previousMessages);
        
        const aiResponse = await generateResponse(messageHistory, imageUrls);
        const aiContent = getResponseContent(aiResponse, prompt);
        
        const assistantMessage = createMessage(userId, "assistant", aiContent, aiResponse.image_url);
        await Supabase.saveMessageToDatabase(userId, assistantMessage);
        
        return aiResponse;
    } catch (error) {
        console.error("Error in askAnisa:", userId, error);
        return errorResponse;
    }
};

export namespace Anisa {
    export const askAnisaFn = askAnisa;
    export const transcribeAudio = transcribeAudioFn;
}
