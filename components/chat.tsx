'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useId, useEffect } from 'react';
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

  console.log('Chat component initial render with:', {
    id,
    initialMessagesCount: initialMessages?.length || 0,
  });

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
        console.log('onFinish: Deduplicating messages', {
          count: prevMessages.length,
        });
        const uniqueIds = new Set();
        return prevMessages.filter((msg) => {
          if (uniqueIds.has(msg.id)) return false;
          uniqueIds.add(msg.id);
          return true;
        });
      });
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('An error occured, please try again!');
    },
  });

  // Track message changes
  useEffect(() => {
    console.log('Messages state updated:', {
      count: messages.length,
      roles: messages.map((m) => m.role),
      lastMessageRole:
        messages.length > 0 ? messages[messages.length - 1].role : 'none',
      contentTypes: messages.map((m) => typeof m.content),
      status,
    });
  }, [messages, status]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  // Debugging function to log full message details
  const logMessageDetails = () => {
    console.log('DETAILED MESSAGE DEBUG:');
    messages.forEach((msg, i) => {
      console.log(`Message ${i + 1}:`, {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        parts: msg.parts,
      });
    });
  };

  // Add a button to trigger debugging (only in dev)
  const isDevEnvironment = process.env.NODE_ENV === 'development';

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <ChatHeader chatId={id} />

      {isDevEnvironment && (
        <button
          onClick={logMessageDetails}
          className="mx-auto my-2 px-3 py-1 bg-gray-100 text-gray-800 text-xs rounded"
          type="button"
        >
          Debug Messages
        </button>
      )}

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
