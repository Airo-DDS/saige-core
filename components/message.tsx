'use client';

import type { UIMessage, TextPart } from 'ai';
import { Markdown } from './markdown';

interface MessageProps {
  message: UIMessage;
  isLoading?: boolean;
}

export function Message({ message, isLoading }: MessageProps) {
  const isUser = message.role === 'user';

  // If there are no parts and no content, and not loading, don't render
  if (!message.parts?.length && !message.content && !isLoading) {
    return null;
  }

  // For user messages, we can simply use the content directly
  if (isUser) {
    const userContent =
      typeof message.content === 'string'
        ? message.content
        : message.parts
            ?.filter((part): part is TextPart => part.type === 'text')
            .map((part) => part.text)
            .join('\n') || '';

    return (
      <div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group py-2"
        data-role={message.role}
      >
        <div className="flex gap-4 w-full justify-end">
          <div className="flex flex-col gap-2 items-end">
            <div
              data-testid="message-content"
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl shadow-sm"
            >
              <Markdown>{userContent}</Markdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For assistant messages, iterate through parts
  return (
    <div
      data-testid={`message-${message.role}`}
      className="w-full mx-auto max-w-3xl px-4 group py-2"
      data-role={message.role}
    >
      <div className="flex gap-4 w-full">
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-primary/20 bg-primary/5 text-primary">
          <span className="font-bold text-xs">AI</span>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {/* If loading and no content yet, show loading indicator */}
          {isLoading && !message.parts?.length && !message.content && (
            <div className="h-4 w-5 mt-1">
              <div className="flex space-x-1 animate-pulse">
                <div className="h-2 w-2 bg-primary/40 rounded-full" />
                <div className="h-2 w-2 bg-primary/40 rounded-full" />
                <div className="h-2 w-2 bg-primary/40 rounded-full" />
              </div>
            </div>
          )}

          {/* Render based on message parts if available */}
          {message.parts && message.parts.length > 0 ? (
            <div className="flex flex-col gap-2 w-full">
              {message.parts.map((part, index) => {
                // Handle text parts
                if (part.type === 'text') {
                  return (
                    <div
                      key={`text-${message.id}-${index}`}
                      data-testid="message-content"
                      className="prose dark:prose-invert max-w-none"
                    >
                      <Markdown>{part.text}</Markdown>
                    </div>
                  );
                }

                // Handle tool invocations - basic display
                if (part.type === 'tool-invocation') {
                  return (
                    <div
                      key={`tool-${message.id}-${index}`}
                      className="bg-secondary/50 p-3 rounded-md text-sm my-2 border border-secondary shadow-sm"
                    >
                      <div className="font-semibold mb-1 text-primary">
                        Tool Call
                      </div>
                      <pre className="overflow-auto text-xs">
                        {JSON.stringify(part, null, 2)}
                      </pre>
                    </div>
                  );
                }

                // Any other part type - just display as JSON for now
                return (
                  <div
                    key={`other-${message.id}-${index}`}
                    className="text-sm my-2"
                  >
                    <pre className="overflow-auto text-xs bg-secondary/50 p-2 rounded border border-secondary/50">
                      {JSON.stringify(part, null, 2)}
                    </pre>
                  </div>
                );
              })}
            </div>
          ) : (
            // Fallback to message.content if no parts are available
            message.content && (
              <div
                data-testid="message-content"
                className="prose dark:prose-invert max-w-none"
              >
                <Markdown>{message.content as string}</Markdown>
              </div>
            )
          )}

          {/* Show loading indicator at the end if still loading */}
          {isLoading && message.parts?.length > 0 && (
            <div className="h-4 w-5 mt-1">
              <div className="flex space-x-1 animate-pulse">
                <div className="h-2 w-2 bg-primary/40 rounded-full" />
                <div className="h-2 w-2 bg-primary/40 rounded-full" />
                <div className="h-2 w-2 bg-primary/40 rounded-full" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
