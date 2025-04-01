import { auth } from '@clerk/nextjs/server';

// Placeholder function to satisfy the import
async function getSuggestionsByDocumentId({
  documentId,
}: { documentId: string }) {
  return [
    {
      id: 'suggestion-1',
      documentId,
      originalText: 'Original text',
      suggestedText: 'Suggested text',
      description: 'Description',
      isResolved: false,
      userId: '',
      createdAt: new Date(),
    },
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  if (suggestion.userId !== session.userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  return Response.json(suggestions, { status: 200 });
}
