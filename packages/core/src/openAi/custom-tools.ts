import { FunctionTool } from 'openai/resources/responses/responses';

export const imageGenerationToolName = 'image_generation';

export const imageGenerationTool: FunctionTool = {
  strict: false,
  type: 'function',
  name: 'image_generation',
  description: 'Generate an image based on a text prompt.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The text prompt to generate the image from.',
      },
      size: {
        type: 'string',
        enum: ['256x256', '512x512', '1024x1024'],
        default: '512x512',
        description: 'The size of the generated image.',
      },
    },
    required: ['prompt'],
  },
};
