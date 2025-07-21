import {client} from './client';
import {EasyInputMessage, ResponseUsage} from 'openai/resources/responses/responses';
import {ResponseStructureOutput} from "./types";
import {analyze_image_tool, analyzeImageHandler} from "./tools/analyzeImageHandler";
import {edit_image_tool} from "./tools/editImageHandler";
import {generate_image_tool, generateImageHandler} from "./tools/generateImageHandler";
import {generateImageFromUrls} from "./generateImages";
import {search_in_web_tool, searchInWebHandler} from "./tools/webSearch";

export const generateResponse = async (
    messageHistory: EasyInputMessage[] = [],
    imageUrls?: string[]
): Promise<ResponseStructureOutput> => {
    const latestPrompt = messageHistory[messageHistory.length - 1]?.content as string;
    if (!latestPrompt) {
        throw new Error('No prompt provided in message history.');
    }

    const response = await client().responses.create({
        model: 'gpt-4.1-nano',
        tools: [analyze_image_tool, edit_image_tool, generate_image_tool, search_in_web_tool],
        input: [
            {
                role: 'system',
                content: 'You are Anisa, a helpful assistant specialized in image processing. When users mention editing, modifying, or working with images, use the appropriate image tools. Consider the conversation context and recent images when responding. Always assume that you have the images.',
            },
            ...messageHistory,
        ],
    });

    if (response?.output?.[0]?.type === 'function_call') {
        const functionCall = response.output[0];
        
        if (process.env.DEBUG) {
            return {
                type: 'text',
                content: `DEBUG mode: Skipped function call ${functionCall.name}`,
                total_tokens: response.usage?.total_tokens,
                cost: calculateCostText(response.usage),
            };
        }

        switch (functionCall.name) {
            case 'edit_image':
                return generateImageFromUrls(latestPrompt, imageUrls || []);
            case 'analyze_image':
                return analyzeImageHandler(latestPrompt, imageUrls || []);
            case 'generate_image':
                return generateImageHandler(latestPrompt);
            case "search_in_web":
                return searchInWebHandler(latestPrompt);
            default:
                return {
                    type: 'text',
                    content: `Unknown function call: ${functionCall.name}`,
                    total_tokens: response.usage?.total_tokens,
                    cost: calculateCostText(response.usage),
                };
        }
    }

    return {
        type: 'text',
        content: response.output_text || '',
        total_tokens: response.usage?.total_tokens,
        cost: calculateCostText(response.usage),
    };
};

export const calculateCostText = (usage?: ResponseUsage) => {
    if (!usage) return 0;
    return (0.1 / 1000000) * (usage.input_tokens || 0) + (0.4 / 1000000) * (usage.output_tokens || 0);
};
