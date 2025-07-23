import {client} from "./client";
import {EasyInputMessage, ResponseUsage} from "openai/resources/responses/responses";
import {ResponseStructureOutput} from "./types";
import {analyze_image_tool, analyzeImageHandler} from "./tools/analyzeImageHandler";
import {image_tool, generateImageFromUrls} from "./tools/editImageHandler";
import {generateImageHandler} from "./tools/generateImageHandler";
import {search_in_web_tool, searchInWebHandler} from "./tools/webSearch";

const SYSTEM_PROMPT = "You are Anisa, a helpful AI assistant. You specialize in image processing and generation, but can also help with general questions and web searches when needed. For image tasks: use edit_image to modify or generate based on existing images or to create new images. For current information or research: use search_in_web. Only use tools when explicitly needed - respond directly for simple conversations.";

const TOOLS = [image_tool, search_in_web_tool, analyze_image_tool];

const calculateCost = (usage?: ResponseUsage) =>
    usage ? (0.1 / 1000000) * (usage.input_tokens || 0) + (0.4 / 1000000) * (usage.output_tokens || 0) : 0;

const createResponse = (content: string, usage?: ResponseUsage): ResponseStructureOutput => ({
    type: "text",
    content,
    total_tokens: usage?.total_tokens,
    cost: calculateCost(usage),
});

const getDebugResponse = (functionCall: any, imageUrls?: string[], usage?: ResponseUsage) =>
    createResponse(
        `DEBUG mode: Skipped function call ${functionCall.name} with arguments: ${functionCall.arguments} ${imageUrls?.join(", ") || ""}`,
        usage
    );

const getErrorResponse = (usage?: ResponseUsage) =>
    createResponse(
        "I encountered an issue processing your request. Please try again or rephrase your question.",
        usage
    );

const getUnknownToolResponse = (usage?: ResponseUsage) =>
    createResponse(
        "Sorry, I don't know how to handle that request. Please try rephrasing.",
        usage
    );

const executeTool = async (functionCall: any, prompt: string, imageUrls: string[] = []) => {
    const args = JSON.parse(functionCall.arguments);

    switch (functionCall.name) {
        case "edit_image":
            const withImages = args["needed_image_urls"] ? imageUrls : [];
            return generateImageFromUrls(prompt, withImages);
        case "analyze_image":
            return analyzeImageHandler(prompt, imageUrls);
        case "generate_image":
            return generateImageHandler(prompt);
        case "search_in_web":
            return searchInWebHandler(prompt);
        default:
            return null;
    }
};

export const generateResponse = async (
    messageHistory: EasyInputMessage[] = [],
    imageUrls: string[] = []
): Promise<ResponseStructureOutput> => {
    const latestPrompt = messageHistory[messageHistory.length - 1]?.content as string;
    if (!latestPrompt) throw new Error("No prompt provided in message history.");

    const response = await client().responses.create({
        model: "gpt-4.1-nano",
        tools: TOOLS,
        input: [
            {role: "system", content: SYSTEM_PROMPT},
            ...messageHistory,
        ],
    });

    const functionCall = response?.output?.[0];
    if (functionCall?.type !== "function_call") {
        return createResponse(response.output_text || "", response.usage);
    }

    if (process.env.ANISA_DEBUG === "true") {
        return getDebugResponse(functionCall, imageUrls, response.usage);
    }

    try {
        const result = await executeTool(functionCall, latestPrompt, imageUrls);
        return result || getUnknownToolResponse(response.usage);
    } catch (error) {
        return getErrorResponse(response.usage);
    }
};

export const calculateCostText = calculateCost;
