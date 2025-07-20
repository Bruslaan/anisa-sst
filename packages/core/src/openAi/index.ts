import { client as Client } from './client';
import { imageGenerationTool as ImageGenerationTool, imageGenerationToolName as ImageGenerationToolName } from './custom-tools';
import { generateAiResponse as GenerateAiResponse, generateImage as GenerateImage } from './generateAiResponse';
import { generateImageFromUrls as GenerateImageFromUrls } from './generateImages';

export module OpenAi {
  export const client = Client;
  export const imageGenerationTool = ImageGenerationTool;
  export const imageGenerationToolName = ImageGenerationToolName;
  export const generateAiResponse = GenerateAiResponse;
  export const generateImage = GenerateImage;
  export const generateImageFromUrls = GenerateImageFromUrls;
}