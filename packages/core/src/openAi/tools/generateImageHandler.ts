import {FunctionTool} from 'openai/resources/responses/responses';
import {client} from '../client';
import {uploadBase64Image} from '../../supabase/actions';
import {ResponseStructureOutput} from '../types';

export const generate_image_tool: FunctionTool = {
    strict: false,
    type: 'function',
    name: 'generate_image',
    description:
        'This Function is called to generate images based on a prompt. Assume we have the image urls even if not provided in the context window.',
    parameters: {
        type: 'object',
        properties: {
            prompt: {
                type: 'string',
                description: 'The prompt to generate the image from.',
            },
            image_urls: {
                type: 'array',
                items: {
                    type: 'string',
                    format: 'uri',
                    description: 'Optional image URLs to use as context for generation.',
                },
                description:
                    'Optional image URLs to provide context for the image generation.',
            },
        },
        additionalProperties: false,
        required: ['prompt'],
    },
};

export const generateImageHandler = async (
    prompt: string
): Promise<ResponseStructureOutput> => {
    if (!prompt || prompt.trim() === '') {
        throw new Error('Prompt is required for image generation.');
    }

    const response = await client().images.generate({
        model: 'gpt-image-1',
        prompt: 'draw ' + prompt,
        n: 1,
        quality: 'low',
        size: 'auto',
    });

    const image_base64 = response?.data?.[0]?.b64_json;
    const {publicUrl} = await uploadBase64Image(image_base64!, 'images');

    return {
        type: 'image',
        image_url: publicUrl,
        total_tokens: response.usage?.total_tokens,
        cost: 0.06,
    };
};
