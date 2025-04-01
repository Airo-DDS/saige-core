'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useId } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import { toast } from 'sonner';

export function Chat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
}) {
  const { mutate } = useSWRConfig();
  const instanceId = useId();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
  } = useChat({
    id,
    body: { id },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: () => `${instanceId}-${generateUUID()}`,
    onFinish: () => {
      mutate('/api/history');

      setMessages((prevMessages) => {
        const uniqueIds = new Set();
        return prevMessages.filter((msg) => {
          if (uniqueIds.has(msg.id)) return false;
          uniqueIds.add(msg.id);
          return true;
        });
      });
    },
    onError: () => {
      toast.error('An error occured, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <ChatHeader chatId={id} />

      <Messages
        chatId={id}
        status={status}
        votes={votes}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
      />

      <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        <MultimodalInput
          chatId={id}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          status={status}
          stop={stop}
          attachments={attachments}
          setAttachments={setAttachments}
          messages={messages}
          setMessages={setMessages}
          append={append}
        />
      </form>
    </div>
  );
}
