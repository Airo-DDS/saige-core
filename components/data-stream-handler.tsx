// Placeholder data-stream-handler component
import { ReactNode } from 'react';

export interface DataStreamProps {
  children: ReactNode;
  isLoading?: boolean;
  onData?: (data: any) => void;
}

export function DataStreamHandler({ children }: DataStreamProps) {
  return <>{children}</>;
}
