import { client } from './client';
import { uploadBase64Image } from '../supabase/actions';
import { ResponseInputContent } from 'openai/resources/responses/responses';

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
): Promise<string> => {
  const content: ResponseInputContent[] = [
    { type: 'input_text', text: 'edit ' + prompt },
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
    tools: [{ type: 'image_generation', quality: 'medium', size: '1024x1536' }],
  });

  const imageData = response.output
    .filter((output) => output.type === 'image_generation_call')
    .map((output) => output.result);

  // log tokes needed
  console.log(
    `Image generation from URLs used ${response.usage?.total_tokens} tokens`
  );
  
  if (imageData.length > 0) {
    const imageBase64 = imageData[0];
    const { publicUrl } = await uploadBase64Image(imageBase64!, 'images');
    return publicUrl;
  } else {
    throw new Error('No image generated from the request');
  }
};
