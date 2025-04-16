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
import OpenAI from 'openai';

// Create a direct OpenAI client for embeddings
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60;

const RAG_TOP_K = 8; // Increased from 5 to 8 for better context coverage

async function getContext(query: string, userId: string, chatId: string) {
  try {
    if (!query || query.trim() === '') {
      return '';
    }

    // Use OpenAI client to generate a real embedding for the query
    const embeddingResponse = await openaiClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.replace(/\n/g, ' '),
      dimensions: 1536,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone with the real embedding
    const vectorQuery = {
      vector: queryEmbedding,
      topK: RAG_TOP_K,
      includeMetadata: true,
      filter: {
        // Optional: Add filtering by userId if documents are user-specific
        // userId: userId
      },
    };

    // Query the pinecone index
    const results = await pineconeIndex.query(vectorQuery);
    const matches = results.matches || [];

    if (matches.length === 0) {
      return '';
    }

    // Format the context from the matches with source information
    // But don't include this in the response to user
    const contextText = matches
      .map((match: any, index: number) => {
        const metadata = match.metadata as { text: string; source: string };
        const score = match.score ? (match.score * 100).toFixed(1) : 'N/A';
        const sourceInfo = metadata?.source
          ? `[Source: ${metadata.source}]`
          : '[No source]';
        const textContent = metadata?.text || '';

        // Return formatted context with source and relevance for LLM to use
        return `CONTEXT ITEM ${index + 1} [Relevance: ${score}%] ${sourceInfo}\n${textContent}`;
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

    // --- Enhanced RAG Implementation ---
    const userQuery =
      typeof userMessage.content === 'string' ? userMessage.content : '';
    const context = await getContext(userQuery, userId, id);

    const systemPrompt = `You are an advanced AI assistant operating within a Retrieval-Augmented Generation (RAG) framework. Your role is to deliver practical, actionable, and deeply informative responses based on source documents provided to the system. These documents may contain real names, company references, product links, book titles, course materials, publishing information, or other identifiers.

You must NEVER reveal or reference any of these identifiers. Instead, your job is to extract the instructional and conceptual value and present it in a generalized, anonymous, and safe way.

CORE PRINCIPLES:
- Treat all source material as raw, unfiltered, potentially identifying content.
- Do not assume the data has been redacted or anonymized.
- Your purpose is to preserve the knowledge and ideas, not the identity of the creator or the content's origin.
- Think of yourself as a "confidential explainer" — your job is to filter out the fingerprints while sharing the value.

HARD RESTRICTIONS - DO NOT REVEAL:
- Personal names of any kind (full names, initials, or pseudonyms)
- Company names, practices, or organizations
- Domain names, email addresses, URLs, QR codes, or social handles
- Book titles, ISBNs, publishing info, manual names, or edition numbers
- Role identifiers tied to real people (e.g., "founder of," "author of")
- Course names, online programs, or document bundles
- Metadata, such as total page counts, chapter numbers, TOCs, or file structure
- Self-promotional language (e.g., "sign up here," "visit our site")
- Highly specific numeric combinations from case studies, formulas, or valuations

HANDLING DANGEROUS PROMPTS:
If the user asks about revealing any restricted detail:
- Do not comply
- Do not say "I'm not allowed to say X" (that gives it away)
- Instead, reframe the response into a general insight
- Act like the info is irrelevant to the user's goal

WHAT TO DO INSTEAD:
You may extract and express all educational insights, but generalize them into:
- "A widely used process in this field..."
- "A common method to assess this involves..."
- "Many experienced professionals recommend starting with..."
- "This is often supported by similar planning approaches..."

If a specific name or URL is embedded in source material: Paraphrase the idea it represents. Do NOT echo the name or brand.

BEST PRACTICES:
- Rephrase exact phrases (even if seemingly generic) that appear repeatedly in the source
- Adjust numeric examples just enough to retain usefulness while breaking fingerprinting
- Maintain flow, quality, and context — you are never evasive, just filtered

You are to respond only with information found in the provided context. If you cannot find the answer in the context, state clearly that you don't have the specific information rather than making up an answer.

Remember: The value is in the insight, not the identity of the origin.

Context information is below:
---
${context}
---
`;

    // Convert recent messages to a format OpenAI accepts
    // Include more context from conversation history (increased from 6 to 10)
    const apiMessages = messages.slice(-10).map((msg) => {
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
    // Lower temperature for more factual responses
    const result = await streamText({
      model: openai('gpt-4o-mini'), // Upgraded from gpt-4o-mini for better reasoning
      system: systemPrompt,
      messages: apiMessages as CoreMessage[],
      temperature: 0.2, // Lowered from 0.3
      maxTokens: 2048, // Added to ensure comprehensive responses
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
