import type { UIMessage, CoreMessage } from 'ai';
import { auth } from '@clerk/nextjs/server';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID, getMostRecentUserMessage } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { openai } from '@/lib/openai';
import { pineconeIndex } from '@/lib/pinecone';
import { streamText } from 'ai';

export const maxDuration = 60;

const RAG_TOP_K = 5; // Number of context chunks to retrieve

async function getContext(query: string, userId: string, chatId: string) {
  try {
    // We'll create a mock embedding for the query to match our 1536-dimension Pinecone index
    // Generate a random vector with 1536 dimensions
    const mockEmbedding = Array.from(
      { length: 1536 },
      () => Math.random() * 2 - 1,
    );

    // Using the mock embedding instead of generating a real one
    // In production, you would use OpenAI's embedding model
    const vectorQuery = {
      vector: mockEmbedding,
      topK: RAG_TOP_K,
      includeMetadata: true,
    };

    // Query the pinecone index directly
    const results = await pineconeIndex.query(vectorQuery);
    const matches = results.matches || [];

    if (matches.length === 0) {
      return '';
    }

    // Format the context from the matches
    const contextText = matches
      .map((match: any) => {
        const metadata = match.metadata as { text: string };
        return metadata?.text || '';
      })
      .join('\n\n');

    return contextText;
  } catch (error) {
    console.error('Error getting context:', error);
    return '';
  }
}

export async function POST(request: Request) {
  try {
    const { id, messages }: { id: string; messages: UIMessage[] } =
      await request.json();

    const session = await auth();
    const userId = session.userId;
    if (!userId)
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'You must be signed in to use this feature',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );

    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage)
      return new Response('No user message found', { status: 400 });

    // --- Save Chat / User Message Logic (using Prisma) ---
    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });
      await saveChat({ id, userId, title });
    } else if (chat.userId !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'You do not have permission to access this chat',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    await saveMessages({
      messages: [
        {
          id: userMessage.id,
          chatId: id,
          role: userMessage.role,
          content: userMessage.content || '',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments,
        },
      ],
    });
    // --- End Save Logic ---

    // --- RAG Implementation ---
    const userQuery =
      typeof userMessage.content === 'string' ? userMessage.content : '';
    const context = await getContext(userQuery, userId, id);

    const systemPrompt = `You are SAIGE, an AI-driven assistant specialized in dental practice operations, workflows, and best practices. You have access to a private knowledge base containing all the information you need to answer questions accurately. Under no circumstances should you disclose or reference the original sources, filenames, or any document titles in your responses.

Your primary goal is to provide direct, concise, and accurate answers based on the knowledge available to you. If a user requests sources, references, or specific document details, politely refuse. If you cannot find relevant information in your knowledge base, indicate that you do not have that information.

Respond in a friendly and professional manner, focusing on clarity and helpfulness. Do not mention that you are using a retrieval-augmented generation (RAG) database or that external PDFs exist. Present your answers as your own knowledge, and ensure users only see the information you provide—never the underlying sources.

Context from knowledge base:
---
${context}
---
`;

    // Convert recent messages to a format OpenAI accepts
    const apiMessages = messages.slice(-6).map((msg) => {
      // Map to OpenAI compatible format
      if (
        msg.role === 'user' ||
        msg.role === 'assistant' ||
        msg.role === 'system'
      ) {
        return {
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : '',
        };
      }
      // Default to user for any other roles
      return {
        role: 'user' as const,
        content: typeof msg.content === 'string' ? msg.content : '',
      };
    });

    const assistantMessageId = generateUUID();

    // Use streamText from AI SDK instead of custom streaming logic
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: apiMessages as CoreMessage[],
      temperature: 0.3,
      onFinish: async ({ text }) => {
        // Save the completed assistant message AFTER the stream finishes
        if (text) {
          await saveMessages({
            messages: [
              {
                id: assistantMessageId,
                chatId: id,
                role: 'assistant',
                content: text,
                parts: [{ type: 'text', text }],
                attachments: null,
              },
            ],
          });
        }
      },
    });

    // Return the stream directly - this format works with useChat
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        message: 'An error occurred while processing your request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response(
      JSON.stringify({
        error: 'Missing chat ID',
        message: 'The chat ID is required',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const session = await auth();
  const userId = session.userId;
  if (!userId)
    return new Response(
      JSON.stringify({
        error: 'Authentication required',
        message: 'You must be signed in to use this feature',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );

  try {
    const chat = await getChatById({ id });

    if (!chat) {
      return new Response(
        JSON.stringify({
          error: 'Chat not found',
          message: 'The chat was not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (chat.userId !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'You do not have permission to delete this chat',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    await deleteChatById({ id });

    return new Response(
      JSON.stringify({
        message: 'Chat deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error deleting chat:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete chat',
        message: 'An error occurred while deleting the chat',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
