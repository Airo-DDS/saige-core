'use server';

import type { Message } from 'ai';
import { generateText } from 'ai';
import { openai } from '@/lib/openai';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';

export type VisibilityType = 'private' | 'public';

export async function saveChatModelAsCookie(model: string) {
  // Just return a value for now - we'll handle cookies client-side
  // This avoids the server action cookie API incompatibility
  return { model };
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  // Extract content from message
  const messageContent =
    typeof message.content === 'string' ? message.content : '';

  try {
    // Use the generateText function from AI SDK
    const { text } = await generateText({
      model: openai('gpt-3.5-turbo'),
      system:
        'Generate a short title (under 80 characters) based on this user message.',
      prompt: messageContent,
      temperature: 0.7,
      maxTokens: 60,
    });

    return text || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const message = await getMessageById({ id });

  if (!message) {
    console.error(`Message with id ${id} not found for deletion.`);
    return;
  }

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  try {
    await updateChatVisiblityById({ chatId, visibility });
    return { success: true };
  } catch (error) {
    console.error('Error updating chat visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}
