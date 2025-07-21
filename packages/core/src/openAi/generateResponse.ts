import {client} from './client';
import {
    EasyInputMessage,
    ResponseUsage,
} from 'openai/resources/responses/responses';

import * as console from 'node:console';
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
    try {
        const latestPrompt = messageHistory[messageHistory.length - 1]
            ?.content as string;
        if (!latestPrompt) {
            throw new Error('No prompt provided in message history.');
        }

        console.log('Generating response with gpt-4.1-nano');
        console.log('Message history', messageHistory);

        const response = await client().responses.create({
            model: 'gpt-4.1-nano',
            tools: [analyze_image_tool, edit_image_tool, generate_image_tool, search_in_web_tool],
            input: [
                {
                    role: 'system',
                    content:
                        'You are Anisa, a helpful assistant specialized in image processing. When users mention editing, modifying, or working with images, use the appropriate image tools. Consider the conversation context and recent images when responding. Always assume that you have the images.',
                },
                ...messageHistory,
            ],
        });

        if (response?.output?.[0]?.type === 'function_call') {
            const functionCall = response.output[0];
            console.log('Function call detected:', functionCall.name);

            if (process.env.DEBUG) {
                console.debug(`DEBUG mode: Skipping ${functionCall.name} execution`);
                return {
                    type: 'text',
                    content: `DEBUG mode: Skipped function call ${functionCall.name}`,
                    total_tokens: response.usage?.total_tokens,
                    cost: calculateCostText(response.usage),
                };
            }

            switch (functionCall.name) {
                case 'edit_image':
                    console.log('Executing edit_image tool');
                    return await generateImageFromUrls(latestPrompt, imageUrls || []);

                case 'analyze_image':
                    console.log('Executing analyze_image tool');
                    return await analyzeImageHandler(latestPrompt, imageUrls || []);

                case 'generate_image':
                    console.log('Executing generate_image tool');
                    return await generateImageHandler(latestPrompt);

                case "search_in_web":
                    console.warn('Executing search_in_web tool');
                    return await searchInWebHandler(latestPrompt);

                default:
                    console.warn('Unknown function call:', functionCall.name);
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
    } catch (error) {
        console.error('Error generating response:', error);
        throw new Error(`Failed to generate response: ${error}`);
    }
};

export const calculateCostText = (usage?: ResponseUsage) => {
    if (!usage) {
        return 0;
    }
    console.log('Tokens:', usage.total_tokens);
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    return (0.1 / 1000000) * inputTokens + (0.4 / 1000000) * outputTokens;
};
