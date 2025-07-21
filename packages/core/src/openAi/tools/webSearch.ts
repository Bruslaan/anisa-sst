import { FunctionTool } from 'openai/resources/responses/responses';
import { client } from '../client';
import { uploadBase64Image } from '../../supabase/actions';
import { ResponseStructureOutput } from '../types';
import {analyze_image_tool} from "./analyzeImageHandler";
import {edit_image_tool} from "./editImageHandler";
import {generate_image_tool} from "./generateImageHandler";

export const search_in_web_tool: FunctionTool = {
  strict: false,
  type: 'function',
  name: 'search_in_web',
  description:
    'This Function is called to search the web for information. It can be used to find answers, gather data, or retrieve content from the internet.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The search query or prompt to find information on the web.',
      },
    },
    additionalProperties: false,
    required: ['prompt'],
  },
};

export const searchInWebHandler = async (
  prompt: string
): Promise<ResponseStructureOutput> => {
  if (!prompt || prompt.trim() === '') {
    throw new Error('Prompt is required for web search.');
  }

  const response = await client().responses.create({
    model: "gpt-4o-mini",
    tools: [ { type: "web_search_preview" } ],
    tool_choice: "required",
    input: prompt,
  });


  console.log(
    `AI response generated with ${response.usage?.total_tokens} tokens`
  );
  return {
    type: 'text',
    content: response.output_text,
    total_tokens: response.usage?.total_tokens,
    cost: 0.01,
  };
};
