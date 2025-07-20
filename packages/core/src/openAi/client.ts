import OpenAI from 'openai';

export const client = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing env.OPENAI_API_KEY');
  }
  if (!process.env.OPENAI_PROJECT_ID) {
    throw new Error('Missing env.OPENAI_PROJECT_ID');
  }
  if (!process.env.OPENAI_ORGANIZATION_ID) {
    throw new Error('Missing env.OPENAI_ORGANIZATION_ID');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    project: process.env.OPENAI_PROJECT_ID,
    organization: process.env.OPENAI_ORGANIZATION_ID,
    timeout: 60 * 1000, // 60s
    maxRetries: 3,
  });

}
