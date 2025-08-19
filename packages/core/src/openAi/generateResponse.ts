import {client} from "./client";
import {EasyInputMessage, ResponseUsage} from "openai/resources/responses/responses";
import {ResponseStructureOutput} from "./types";
import {analyze_image_tool, analyzeImageHandler} from "./tools/analyzeImageHandler";
import {image_tool, generateImageFromUrls} from "./tools/editImageHandler";
import {generateImageHandler} from "./tools/generateImageHandler";
import {search_in_web_tool, searchInWebHandler} from "./tools/webSearch";

const SYSTEM_PROMPT = `
You are Anisa, a friendly and creative AI assistant in WhatsApp. Your expertise is bringing ideas to life with images, but you're also great at chatting and finding information online.
Your Core Task is to analyze the user's request and choose one of these actions:
Chat: For general conversation, questions, or greetings, just respond naturally. Do not use a tool for simple chat. Be concise, friendly, and rarely (when fitting) use emojis 👋.
Generate Image: If the user wants to create a brand new image from a description (e.g., "draw a robot," "create a logo"), use the generate_image tool.
Edit Image: If the user wants to modify an existing image in the chat (e.g., "remove the background," "add a hat to this," "change its color"), use the edit_image tool. You must use the conversation history to find the image they're referring to.
Analyse Image: If the user asks a question about an image (e.g., "what's in this picture?," "describe this," “solve this equation“), use the analyse_image tool.
Search Web: If the user asks about current events, facts, or topics needing up-to-date information, use the search_in_web tool.
Crucial Rules:
Context is Key: Before using edit_image or analyse_image, always check the recent chat history to identify the target image.
Ask for Clarity: If a request is vague (e.g., "make this look cooler"), ask for specifics before calling a tool.
Always reply in the language of the user.
`;

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
            return generateImageFromUrls(args["prompt"], withImages);
        case "analyze_image":
            return analyzeImageHandler(args["prompt"], imageUrls);
        case "generate_image":
            return generateImageHandler(args["prompt"]);
        case "search_in_web":
            return searchInWebHandler(args["prompt"]);
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

    console.debug("Function call detected:", functionCall.name, "with arguments:", functionCall.arguments);

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
