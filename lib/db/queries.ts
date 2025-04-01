import 'server-only';
import type { Message, Vote } from '@prisma/client';
import prisma from '@/lib/prisma';

// Export types to use in the app
export type DBMessage = Message;
export type DBVote = Vote;

export type VisibilityType = 'private' | 'public';

// Chat related functions
export async function getChatById({ id }: { id: string }) {
  try {
    return await prisma.chat.findUnique({
      where: { id },
    });
  } catch (error) {
    console.error('Failed to get chat by id from database', error);
    throw error;
  }
}

export async function getChatsByUserId({ userId }: { userId: string }) {
  try {
    return await prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Failed to get chats by user from database', error);
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: { id: string; userId: string; title: string }) {
  try {
    // Ensure the User exists, or create if syncing Clerk users
    await prisma.user.upsert({
      where: { id: userId },
      update: {}, // No update needed if user exists
      create: {
        id: userId,
        email: `user-${userId}@example.com`, // Placeholder email, should be updated with actual email
      },
    });

    return await prisma.chat.create({
      data: {
        id,
        userId,
        title,
      },
    });
  } catch (error) {
    console.error('Failed to save chat in database', error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // Prisma cascading delete will handle related messages/votes
    return await prisma.chat.delete({
      where: { id },
    });
  } catch (error) {
    console.error('Failed to delete chat by id from database', error);
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  try {
    return await prisma.chat.update({
      where: { id: chatId },
      data: { visibility },
    });
  } catch (error) {
    console.error('Failed to update chat visibility in database', error);
    throw error;
  }
}

// Message related functions
export async function saveMessages({
  messages,
}: {
  messages: Array<{
    id: string;
    chatId: string;
    role: string;
    content: string;
    parts?: any;
    attachments?: any;
  }>;
}) {
  try {
    const savedMessages = [];
    for (const msg of messages) {
      const savedMsg = await prisma.message.create({
        data: {
          id: msg.id,
          chatId: msg.chatId,
          role: msg.role,
          content: msg.content,
          parts: msg.parts || undefined,
          attachments: msg.attachments || undefined,
        },
      });
      savedMessages.push(savedMsg);
    }
    return savedMessages;
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await prisma.message.findMany({
      where: { chatId: id },
      orderBy: { createdAt: 'asc' },
      include: { vote: true },
    });
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await prisma.message.findUnique({
      where: { id },
      include: { vote: true },
    });
  } catch (error) {
    console.error('Failed to get message by id from database', error);
    throw error;
  }
}

/**
 * Delete all messages in a chat that were created after a specific timestamp
 * This is used to delete messages after editing a previous message
 */
export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    // First delete related votes to avoid foreign key constraints
    await prisma.vote.deleteMany({
      where: {
        chatId,
        message: {
          createdAt: {
            gte: timestamp,
          },
        },
      },
    });

    // Then delete the messages
    return await prisma.message.deleteMany({
      where: {
        chatId,
        createdAt: {
          gte: timestamp,
        },
      },
    });
  } catch (error) {
    console.error(
      'Failed to delete messages after timestamp from database',
      error,
    );
    throw error;
  }
}

// Vote related functions
export async function voteMessage({
  messageId,
  chatId,
  isUpvoted,
}: {
  messageId: string;
  chatId: string;
  isUpvoted: boolean;
}) {
  try {
    return await prisma.vote.upsert({
      where: { messageId },
      update: { isUpvoted },
      create: {
        messageId,
        chatId,
        isUpvoted,
      },
    });
  } catch (error) {
    console.error('Failed to vote on message in database', error);
    throw error;
  }
}

export async function getVotesByMessageIds({
  messageIds,
}: {
  messageIds: string[];
}) {
  try {
    return await prisma.vote.findMany({
      where: {
        messageId: {
          in: messageIds,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get votes by message ids from database', error);
    throw error;
  }
}

export async function getVotesByChatId({ chatId }: { chatId: string }) {
  try {
    return await prisma.vote.findMany({
      where: { chatId },
    });
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

// Note: Document and Suggestion models are not implemented in the schema
// These functions are placeholders and have been removed from the code
// that depends on them.

// Placeholder function for document saving - actual implementation would use a Document model
export async function saveDocument({
  id,
  title,
  content,
  kind,
  userId,
}: {
  id: string;
  title: string;
  content: string;
  kind: string;
  userId: string;
}) {
  console.log('Placeholder saveDocument called with:', {
    id,
    title,
    kind,
    userId,
  });
  // In a real implementation, this would save to the database
  return { id, title, content, kind, userId, createdAt: new Date() };
}
