// Placeholder data-stream-handler component
import type { ReactNode } from 'react';

export interface DataStreamDelta {
  type: string;
  content?: string;
  data?: any;
}

export interface DataStreamProps {
  children: ReactNode;
  isLoading?: boolean;
  onData?: (data: DataStreamDelta) => void;
}

export function DataStreamHandler({ children }: DataStreamProps) {
  return <>{children}</>;
}
