'use client';

import { useEffect } from 'react';

interface DataStreamHandlerProps {
  id: string;
}

export function DataStreamHandler({ id }: DataStreamHandlerProps) {
  useEffect(() => {
    const setupEventSource = async () => {
      try {
        console.log('Setting up data stream for chat ID:', id);

        // Create a real EventSource connection to the server
        const eventSource = new EventSource(`/api/stream?chatId=${id}`);

        // Handle incoming messages
        eventSource.onmessage = (event) => {
          try {
            console.log('Received SSE data:', event.data);
            const data = JSON.parse(event.data);
            // Process the streaming data
            console.log('Parsed SSE data:', data);
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };

        // Handle connection errors
        eventSource.onerror = (error) => {
          console.error('EventSource error:', error);
          eventSource.close();
        };

        return () => {
          console.log('Closing EventSource connection');
          eventSource.close();
        };
      } catch (error) {
        console.error('Error setting up data stream:', error);
      }
    };

    setupEventSource();
  }, [id]);

  // This component doesn't render anything visible
  return null;
}
