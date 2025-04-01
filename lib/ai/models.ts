// This file will be refactored to remove AI SDK dependencies

// Define available chat models
export interface ChatModel {
  id: string;
  name: string;
  description?: string;
  maxTokens?: number;
}

export const CHAT_MODELS: ChatModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable model for dental assistant training.',
    maxTokens: 4096,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast model for basic queries.',
    maxTokens: 4096,
  },
];

export const DEFAULT_CHAT_MODEL = 'gpt-4o';
