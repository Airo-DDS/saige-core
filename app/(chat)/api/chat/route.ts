import type { UIMessage } from 'ai';
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
import type { ChatCompletionMessageParam } from 'openai/resources';

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

    const systemPrompt = `You are Saige, an AI assistant for dental practice staff training. Answer the user's question based *only* on the provided context. If the answer is not found in the context, say "I don't have information on that topic based on the provided materials." Do not make up information. Be concise and helpful.

    Context:
    ---
    ${context}
    ---
    `;

    // Prepare messages for the OpenAI API format
    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      // Include relevant chat history
      ...messages.slice(-6).map((msg) => {
        // Convert UI messages to OpenAI format
        const msgContent = typeof msg.content === 'string' ? msg.content : '';

        // Only use valid OpenAI roles
        const role =
          msg.role === 'user' ||
          msg.role === 'assistant' ||
          msg.role === 'system'
            ? msg.role
            : 'user';

        return { role, content: msgContent };
      }),
    ];
    // --- End RAG Implementation ---

    // --- Call LLM using OpenAI Stream ---
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o', // Or your preferred chat model
      messages: openaiMessages,
      stream: true,
      temperature: 0.3, // Adjust for factual recall
    });

    // Convert OpenAI stream to response format
    const responseStream = new ReadableStream({
      async start(controller) {
        let accumulatedContent = '';
        const assistantMessageId = generateUUID();

        for await (const chunk of stream) {
          const contentDelta = chunk.choices[0]?.delta?.content || '';
          if (contentDelta) {
            accumulatedContent += contentDelta;
            controller.enqueue(contentDelta);
          }
        }

        // Save the complete assistant message after the stream ends
        if (accumulatedContent) {
          const finalMessage = {
            id: assistantMessageId,
            chatId: id,
            role: 'assistant',
            content: accumulatedContent,
            parts: [{ type: 'text', text: accumulatedContent }],
            attachments: null,
          };
          try {
            await saveMessages({ messages: [finalMessage] });
            console.log('Assistant message saved successfully.');
          } catch (dbError) {
            console.error('Failed to save assistant message:', dbError);
          }
        }

        controller.close();
      },
    });

    return new Response(responseStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
    // --- End Call LLM ---
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: 'Chat ID is required',
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const session = await auth();
  const userId = session.userId;
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: 'Authentication required',
        message: 'You must be signed in to delete chats',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const chat = await getChatById({ id });

    if (!chat || chat.userId !== userId) {
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
        success: true,
        message: 'Chat deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Server Error',
        message: 'An error occurred while processing your request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
