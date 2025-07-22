import { client } from "./client";
import {
  EasyInputMessage,
  ResponseUsage,
} from "openai/resources/responses/responses";
import { ResponseStructureOutput } from "./types";
import {
  analyze_image_tool,
  analyzeImageHandler,
} from "./tools/analyzeImageHandler";
import {
  edit_image_tool,
  generateImageFromUrls,
} from "./tools/editImageHandler";
import {
  generate_image_tool,
  generateImageHandler,
} from "./tools/generateImageHandler";
import { search_in_web_tool, searchInWebHandler } from "./tools/webSearch";

export const generateResponse = async (
  messageHistory: EasyInputMessage[] = [],
  imageUrls?: string[]
): Promise<ResponseStructureOutput> => {
  const latestPrompt = messageHistory[messageHistory.length - 1]
    ?.content as string;
  if (!latestPrompt) {
    throw new Error("No prompt provided in message history.");
  }

  const response = await client().responses.create({
    model: "gpt-4.1-nano",
    tools: [
      analyze_image_tool,
      edit_image_tool,
      generate_image_tool,
      search_in_web_tool,
    ],
    input: [
      {
        role: "system",
        content:
          "You are Anisa, a helpful AI assistant. You specialize in image processing and generation, but can also help with general questions and web searches when needed. For image tasks: use analyze_image to understand images, edit_image to modify existing images, and generate_image to create new images. For current information or research: use search_in_web. Only use tools when explicitly needed - respond directly for simple conversations.",
      },
      ...messageHistory,
    ],
  });

  if (response?.output?.[0]?.type === "function_call") {
    const functionCall = response.output[0];

    if (process.env.ANISA_DEBUG === "true") {
      console.log("DEBUG mode: Function call skipped", functionCall.name, functionCall.arguments);
      return {
        type: "text",
        content: `DEBUG mode: Skipped function call ${functionCall.name}`,
        total_tokens: response.usage?.total_tokens,
        cost: calculateCostText(response.usage),
      };
    }

    try {
      switch (functionCall.name) {
        case "edit_image":
          return await generateImageFromUrls(latestPrompt, imageUrls || []);
        case "analyze_image":
          return await analyzeImageHandler(latestPrompt, imageUrls || []);
        case "generate_image":
          return await generateImageHandler(latestPrompt);
        case "search_in_web":
          return await searchInWebHandler(latestPrompt);
        default:
          return {
            type: "text",
            content: `Sorry, I don't know how to handle that request. Please try rephrasing.`,
            total_tokens: response.usage?.total_tokens,
            cost: calculateCostText(response.usage),
          };
      }
    } catch (toolError) {
      return {
        type: "text",
        content:
          "I encountered an issue processing your request. Please try again or rephrase your question.",
        total_tokens: response.usage?.total_tokens || 0,
        cost: calculateCostText(response.usage),
      };
    }
  }

  return {
    type: "text",
    content: response.output_text || "",
    total_tokens: response.usage?.total_tokens,
    cost: calculateCostText(response.usage),
  };
};

export const calculateCostText = (usage?: ResponseUsage) => {
  if (!usage) return 0;
  return (
    (0.1 / 1000000) * (usage.input_tokens || 0) +
    (0.4 / 1000000) * (usage.output_tokens || 0)
  );
};
