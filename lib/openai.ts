import { createOpenAI } from '@ai-sdk/openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

// Use AI SDK's OpenAI provider
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict', // Use strict mode for OpenAI API
});

export default openai;
