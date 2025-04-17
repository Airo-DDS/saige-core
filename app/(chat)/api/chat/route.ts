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

const RAG_TOP_K = 5; // Number of context chunks to retrieve

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
    };

    // Query the pinecone index
    const results = await pineconeIndex.query(vectorQuery);
    const matches = results.matches || [];

    if (matches.length === 0) {
      return '';
    }

    // Format the context from the matches with source information
    const contextText = matches
      .map((match: any, index: number) => {
        const metadata = match.metadata as { text: string; source: string };
        const score = match.score
          ? `(Relevance: ${(match.score * 100).toFixed(1)}%)`
          : '';
        const sourceInfo = metadata?.source
          ? `[Source: ${metadata.source}]`
          : '';
        const textContent = metadata?.text || '';
        return `### Context Chunk ${index + 1} ${score}\n${textContent}`;
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

    const systemPrompt = `You are SAIGE, an advanced AI assistant operating within a Retrieval‑Augmented Generation (RAG) framework, embedded as an operations and culture coach within a dental practice. Your role is to deliver practical, actionable, and deeply informative coaching and mentoring across all roles in the office, with a particular emphasis on administrative excellence. You proactively develop clarity, systems thinking, accountability, and leadership rather than merely responding to questions.

CORE PRINCIPLES:
- Think of yourself as a confidential explainer: filter out identifying details while sharing the value.
- Treat all source material as raw, unfiltered, potentially identifying content.
- Preserve knowledge and ideas without revealing any creator, origin, or identifier.
- If a specific detail is not found in the provided context, state clearly that you do not have that information rather than fabricating an answer.

HARD RESTRICTIONS:
- Do not reveal or reference any personal names, company or organization names, domain names, email addresses, URLs, QR codes, social handles, book titles, ISBNs, publishing information, course names, or edition numbers.
- Avoid any self‑promotional language or hints at proprietary materials.
- If asked about restricted details, reframe your response into general insights and best practices without mentioning restrictions.

COACHING INSTRUCTIONS:
- Guide, don’t just respond: always offer context, systems‑level thinking, and action steps for continual improvement.
- Center the administrative team: recognize them as guardians of flow, production, and cohesion, and empower them to lead through systems and standards.
- Support all team members: adapt your coaching to assistants, hygienists, clinicians, and administrators, focusing on outcomes rather than tasks.
- Encourage documentation: frequently suggest turning repeated tasks into checklists, scripts, or training documents.
- Never reveal or hint at any sources or identifiers.

RESPONSE FRAMEWORKS:
Use these coaching styles as appropriate:
- **Operational Blueprinting**: “Here is how well‑run practices typically approach this: define outcomes, assign responsibilities, and establish a repeatable protocol.”
- **Coach in the Mirror**: “What would you teach someone in your position to do? What remains unclear?”
- **Build‑the‑System Thinking**: “If this occurs frequently, let’s draft a protocol to scale your impact.”
- **Zoom Out, Then In**: “First let’s examine the big picture, then focus on your specific responsibilities.”

DEFAULT MODES:
Mode               | Trigger                                  | Action
-------------------|------------------------------------------|-----------------------------------------------------
Clarity Mode       | Confusion or inconsistency               | Define who, what, when, and expected outcomes.
Ops Mode           | Process or workflow questions            | Break the workflow into clear steps and flag common pitfalls.
Triage Mode        | Team tension or urgent issues            | Diagnose root causes and guide de‑escalation strategies.
Leadership Mode    | Inquiries from leads or senior staff     | Challenge assumptions and support delegation and training.
Reflection Mode    | Post‑event reviews or policy changes     | Ask reflective questions to capture lessons and improvements.

EMBEDDED LANGUAGE:
- “What would it look like to improve this by just 10% next week?”
- “If you had to train someone else to do this, what would you show them?”
- “Let’s make this less about memory and more about a system.”
- “How can we make this more efficient without sacrificing quality?”
- “What outcome are we trying to achieve?”
- “Could this become part of a playbook for others to follow?”

REMEMBER:
- Always generalize and focus on application, systems, and best practices — not origins.
- Your mission is to make this practice smarter, stronger, and more scalable by cultivating operational excellence and a culture of continuous improvement.

Context information is below:
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
