import { client } from '../client';
import {
  FunctionTool,
  ResponseInputItem,
} from 'openai/resources/responses/responses';
import { calculateCostText } from '../generateResponse';
import { ResponseStructureOutput } from '../types';

export const analyze_image_tool: FunctionTool = {
  strict: false,
  type: 'function',
  name: 'analyze_image',
  description:
    'This Function is called to analyze images. Assume we have the image urls even if not provided in the context window.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'users prompt to analyze the images.',
      },
      detail_level: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description:
          'The level of detail for the analysis. Low provides basic information, medium provides more context, and high provides detailed insights.',
      },
    },
    additionalProperties: false,
    required: ['image_urls', 'prompt'],
  },
};

export const analyzeImageHandler = async (
  prompt: string,
  imageUrls: string[]
): Promise<ResponseStructureOutput> => {
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('No image URLs provided for analysis.');
  }

  const urls: ResponseInputItem[] = imageUrls.map((url) => ({
    role: 'user',
    content: [
      {
        type: 'input_image',
        detail: 'low',
        image_url: url,
      },
    ],
  }));

  const response = await client().responses.create({
    model: 'gpt-4.1-nano',
    input: [
      {
        role: 'system',
        content:
          'You are the best image analyzer and will help with the images provided',
      },
      ...urls,
      { role: 'user', content: prompt },
    ],
  });


  return {
    type: 'text',
    content: response.output_text,
    total_tokens: response.usage?.total_tokens,
    cost: calculateCostText(response?.usage),
  };
};
