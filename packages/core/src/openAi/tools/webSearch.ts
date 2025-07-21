import { FunctionTool } from 'openai/resources/responses/responses';
import { client } from '../client';
import { uploadBase64Image } from '../../supabase/actions';
import { ResponseStructureOutput } from '../types';
import {analyze_image_tool} from "./analyzeImageHandler";
import {edit_image_tool} from "./editImageHandler";
import {generate_image_tool} from "./generateImageHandler";

export const search_in_web_tool: FunctionTool = {
  strict: true,
  type: 'function',
  name: 'search_in_web',
  description: 'Search the web for current information, news, facts, or research. Use only when the user asks for recent information, current events, or specific factual data that requires real-time search.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'A clear, specific search query focusing on the key information needed.',
      },
    },
    additionalProperties: false,
    required: ['prompt'],
  },
};

export const searchInWebHandler = async (
  prompt: string
): Promise<ResponseStructureOutput> => {
  if (!prompt?.trim()) {
    throw new Error('Search query is required for web search.');
  }

  try {
    const response = await client().responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      tool_choice: "required",
      input: `Search the web for: ${prompt.trim()}`,
    });

    if (!response.output_text) {
      throw new Error('No search results returned');
    }

    const inputCost = (response.usage?.input_tokens || 0) * (0.15 / 1000000);
    const outputCost = (response.usage?.output_tokens || 0) * (0.6 / 1000000);
    
    return {
      type: 'text',
      content: response.output_text,
      total_tokens: response.usage?.total_tokens || 0,
      cost: inputCost + outputCost,
    };
  } catch (error) {
    return {
      type: 'text',
      content: 'Unable to search the web at this time. Please try rephrasing your question or ask me something I might know from my training.',
      total_tokens: 0,
      cost: 0,
    };
  }
};
