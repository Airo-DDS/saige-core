'use client';

import type { UIMessage, TextPart } from 'ai';
import { Markdown } from './markdown';

interface MessageProps {
  message: UIMessage;
  isLoading?: boolean;
}

export function Message({ message, isLoading }: MessageProps) {
  // Diagnostic logging to see the exact message structure
  console.log('Message component received:', {
    id: message.id,
    role: message.role,
    content: message.content,
    hasContent: !!message.content,
    contentType: typeof message.content,
    parts: message.parts,
    hasParts:
      !!message.parts &&
      Array.isArray(message.parts) &&
      message.parts.length > 0,
  });

  const isUser = message.role === 'user';

  // Extract the message content, handling all possible formats
  const getMessageContent = () => {
    // If message.content is a non-empty string, use it
    if (typeof message.content === 'string' && message.content.trim() !== '') {
      console.log('Using content string:', message.content);
      return message.content;
    }

    // If message has parts with text, use the first text part
    if (
      message.parts &&
      Array.isArray(message.parts) &&
      message.parts.length > 0
    ) {
      // Filter for text parts and make sure they have content
      const textParts = message.parts
        .filter((part): part is TextPart => part.type === 'text')
        .filter(
          (part) => typeof part.text === 'string' && part.text.trim() !== '',
        );

      console.log('Text parts found:', textParts.length);

      if (textParts.length > 0) {
        console.log('Using part text:', textParts[0].text);
        return textParts[0].text;
      }
    }

    // Fallback to empty string if no content found
    console.log('No content found in message');
    return '';
  };

  const messageContent = getMessageContent();

  // Don't render empty messages
  if (!messageContent && !isLoading) {
    console.log('Skipping empty message:', message.id);
    return null;
  }

  console.log(
    'Rendering message with content:',
    messageContent ? messageContent.substring(0, 50) + '...' : 'empty',
  );

  return (
    <div
      data-testid={`message-${message.role}`}
      className="w-full mx-auto max-w-3xl px-4 group"
      data-role={message.role}
    >
      <div className={`flex gap-4 w-full ${isUser ? 'justify-end' : ''}`}>
        {!isUser && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
            <span className="font-bold text-xs">AI</span>
          </div>
        )}

        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : ''}`}>
          {messageContent && (
            <div
              data-testid="message-content"
              className={`${
                isUser
                  ? 'bg-primary text-primary-foreground px-3 py-2 rounded-xl'
                  : ''
              }`}
            >
              <Markdown>{messageContent}</Markdown>
            </div>
          )}

          {isLoading && (
            <div className="h-4 w-5 mt-1">
              <div className="flex space-x-1 animate-pulse">
                <div className="h-2 w-2 bg-gray-400 rounded-full" />
                <div className="h-2 w-2 bg-gray-400 rounded-full" />
                <div className="h-2 w-2 bg-gray-400 rounded-full" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
