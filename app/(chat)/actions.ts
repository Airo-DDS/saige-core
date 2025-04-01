'use server';

import type { Message } from 'ai';
import { cookies } from 'next/headers';
import { openai } from '@/lib/openai';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';

export type VisibilityType = 'private' | 'public';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = cookies();
  cookieStore.set('chat-model', model);
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Generate a short title (under 80 characters) based on this user message.',
        },
        {
          role: 'user',
          content: messageContent,
        },
      ],
      temperature: 0.7,
      max_tokens: 60,
    });

    return completion.choices[0]?.message?.content || 'New Chat';
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
