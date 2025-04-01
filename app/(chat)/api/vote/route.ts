import { auth } from '@clerk/nextjs/server';
import {
  getChatById,
  getVotesByMessageIds,
  voteMessage,
} from '@/lib/db/queries';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  const messageIds = searchParams.get('messageIds'); // Comma-separated message IDs

  if (!chatId && !messageIds) {
    return new Response('chatId or messageIds is required', { status: 400 });
  }

  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (chatId) {
    const chat = await getChatById({ id: chatId });

    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    if (chat.userId !== userId) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  // Get votes for message IDs
  if (messageIds) {
    const messageIdsArray = messageIds.split(',');
    const votes = await getVotesByMessageIds({ messageIds: messageIdsArray });
    return Response.json(votes, { status: 200 });
  }

  return new Response('Invalid request', { status: 400 });
}

export async function PATCH(request: Request) {
  const {
    chatId,
    messageId,
    isUpvoted,
  }: { chatId: string; messageId: string; isUpvoted: boolean } =
    await request.json();

  if (!chatId || !messageId || isUpvoted === undefined) {
    return new Response('messageId and isUpvoted are required', {
      status: 400,
    });
  }

  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new Response('Chat not found', { status: 404 });
  }

  if (chat.userId !== userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  await voteMessage({
    chatId,
    messageId,
    isUpvoted,
  });

  return new Response('Message voted', { status: 200 });
}
