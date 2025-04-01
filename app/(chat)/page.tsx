import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { generateUUID } from '@/lib/utils';

export default async function Page() {
  const id = generateUUID();

  return <Chat key={id} id={id} initialMessages={[]} />;
}
