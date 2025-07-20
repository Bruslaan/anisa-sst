import { client } from './client';
import { uploadBase64Image } from '../supabase/actions';
import {
  imageGenerationTool,
  imageGenerationToolName,
} from './custom-tools';

type ToolCall = {
  (
    // eslint-disable-next-line no-unused-vars
    functionName: string,
    // eslint-disable-next-line no-unused-vars
    functionArguments: Record<string, unknown>
  ): void | Promise<void>;
};

export const generateAiResponse = async (
  message: string,
  toolCall?: ToolCall
) => {
  const response = await client().responses.create({
    model: 'gpt-4o-mini',
    input: message,
    tools: [{ type: 'web_search_preview' }, imageGenerationTool],
  });

  // check if function call was triggered
  if (response?.output?.[0]?.type === 'function_call') {
    const functionName = response.output[0].name;

    switch (functionName) {
      case 'web_search_preview':
        return response.output_text + '\n\n' + response.usage?.total_tokens;
      case imageGenerationToolName:
        if (!toolCall) {
          console.error('No toolCall function provided for image generation');
          return 'Image generation tool call not available';
        }
        console.log(`AI response needs a function call for image_gen`);
        toolCall('image_generator', JSON.parse(response.output[0].arguments));
        return `Generating image... ${response.usage?.total_tokens}`;
      default:
        console.error('Unknown function called:', functionName);
        return 'Unknown function call';
    }
  }

  // how many tokens were used
  console.log(
    `AI response generated with ${response.usage?.total_tokens} tokens`
  );
  return response.output_text + '\n\n' + response.usage?.total_tokens;
};

export const generateImage = async (prompt: string) => {
  const response = await client().images.generate({
    model: 'gpt-image-1',
    prompt: 'draw ' + prompt,
    n: 1,
    quality: 'medium',
    size: '1024x1024',
  });

  const image_base64 = response?.data?.[0]?.b64_json;
  const { publicUrl } = await uploadBase64Image(image_base64!, 'images');

  console.log(
    `AI response generated with ${response.usage?.total_tokens} tokens`
  );
  return publicUrl;
};
