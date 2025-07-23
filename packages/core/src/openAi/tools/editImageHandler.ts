import {
    FunctionTool,
    ResponseInputContent,
} from 'openai/resources/responses/responses';
import {client} from '../client';
import {uploadBase64Image} from '../../supabase/actions';
import {ResponseStructureOutput} from '../types';

export const image_tool: FunctionTool = {
    strict: false,
    type: 'function',
    name: 'edit_image',
    description:
        'This Function is called to edit or generate images based on a prompt. It can modify existing images or generate new ones based on the provided prompt and image URLs.',
    parameters: {
        type: 'object',
        properties: {
            prompt: {
                type: 'string',
                description: 'The prompt to generate or edit the image from.',
            },
        },
        additionalProperties: false,
        required: ['prompt'],
    },
};

async function downloadImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Failed to download image from ${url}: ${response.statusText}`
        );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
}

export const generateImageFromUrls = async (
    prompt: string,
    imageUrls: string[]
): Promise<ResponseStructureOutput> => {
    if (!prompt || prompt.trim() === '') {
        throw new Error('Prompt is required for image editing.');
    }

    if (!imageUrls || imageUrls.length === 0) {
        throw new Error('No image URLs provided for editing.');
    }

    const content: ResponseInputContent[] = [
        {type: 'input_text', text: 'edit ' + prompt},
    ];

    for (const imageUrl of imageUrls) {
        const base64Image = await downloadImageAsBase64(imageUrl);
        content.push({
            type: 'input_image',
            detail: 'low',
            image_url: base64Image,
        });
    }

    const response = await client().responses.create({
        model: 'gpt-4.1',
        input: [
            {
                role: 'user',
                content,
            },
        ],
        tool_choice: "required",
        tools: [{type: 'image_generation', quality: 'medium', size: 'auto'}],
    });

    const imageData = response.output
        .filter((output) => output.type === 'image_generation_call')
        .map((output) => output.result);


    if (imageData.length > 0) {
        const imageBase64 = imageData[0];
        const {publicUrl} = await uploadBase64Image(imageBase64!, 'images');
        return {
            type: 'image',
            image_url: publicUrl,
            total_tokens: response.usage?.total_tokens,
            cost: response.usage ? response.usage.total_tokens * 0.000002 : undefined,
        };
    } else {
        throw new Error('No image generated from the request');
    }
};
