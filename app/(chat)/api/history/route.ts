import { auth } from '@clerk/nextjs/server';
import { getChatsByUserId } from '@/lib/db/queries';

export async function GET() {
  const session = await auth();
  const userId = session.userId;

  if (!userId) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  const chats = await getChatsByUserId({ userId });
  return Response.json(chats);
}
