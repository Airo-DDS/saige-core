import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { auth } from '@clerk/nextjs/server';
import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import type { DBMessage } from '@/lib/db/queries';
import type { Attachment, UIMessage } from 'ai';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const { userId } = await auth();

  if (chat.visibility === 'private') {
    if (!userId) {
      return notFound();
    }

    if (userId !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  function convertToUIMessages(
    messages: Array<DBMessage & { vote: any }>,
  ): Array<UIMessage> {
    return messages.map((message) => {
      // Handle attachments with proper type checking
      const attachments = message.attachments
        ? (message.attachments as unknown as Array<Attachment>)
        : [];

      return {
        id: message.id,
        parts: message.parts as UIMessage['parts'],
        role: message.role as UIMessage['role'],
        // Note: content will soon be deprecated in @ai-sdk/react
        content: '',
        createdAt: message.createdAt,
        experimental_attachments: attachments,
      };
    });
  }

  return (
    <Chat id={chat.id} initialMessages={convertToUIMessages(messagesFromDb)} />
  );
}
