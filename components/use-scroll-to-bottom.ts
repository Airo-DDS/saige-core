'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useScrollToBottom<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return [containerRef, bottomRef] as const;
}
