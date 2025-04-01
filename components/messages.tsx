'use client';

import type { UIMessage } from 'ai';
import { memo } from 'react';
import type { Vote } from '@/lib/db/schema';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { Overview } from './overview';
import { Message } from './message';
import type { UseChatHelpers } from '@ai-sdk/react';

export interface MessagesProps {
  chatId: string;
  status: UseChatHelpers['status'];
  votes: Array<Vote> | undefined;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
}

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
}: MessagesProps) {
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
    >
      {messages.length === 0 && <Overview />}

      {messages.map((message) => (
        <Message key={message.id} message={message} isLoading={false} />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-pulse">Thinking...</div>
          </div>
        )}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
    </div>
  );
}

export const Messages = memo(PureMessages);
