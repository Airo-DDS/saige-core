import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getAllUsers, getChatsByUserId } from '@/lib/db/queries';
import { format } from 'date-fns'; // For date formatting
import { Markdown } from '@/components/markdown'; // Assuming Markdown component exists for rendering

// Define admin user IDs (ensure this matches middleware.ts)
const ADMIN_USER_IDS = [
  'user_2vrKh36Izrt2Vs33UQSzxNzTSMY', // deren@airodental.com
  'user_2vofoneXbHH2FnGkeNVgfz1lbBK', // haloweavedev@gmail.com
];

export default async function UserMonitorPage(props: {
  params: Promise<{ userId: string }>;
}) {
  const params = await props.params;
  const { userId } = params;

  const authObject = await auth();
  const adminUserId = authObject.userId;

  // Double-check auth within the component
  if (!adminUserId || !ADMIN_USER_IDS.includes(adminUserId)) {
    redirect('/');
  }

  // Validate the target userId exists
  const allUsers = await getAllUsers(); // Fetch users again for validation
  const targetUser = allUsers.find((user) => user.id === userId);

  if (!targetUser) {
    notFound();
  }

  // Fetch chats and their messages for the target user
  const chats = await getChatsByUserId({ userId });

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Chat History for {targetUser.email}</CardTitle>
          <CardDescription>Displaying {chats.length} chat(s).</CardDescription>
        </CardHeader>
        <CardContent>
          {chats.length === 0 ? (
            <p>This user has no chat history.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {chats.map((chat) => (
                <AccordionItem value={chat.id} key={chat.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                      <span>{chat.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(chat.createdAt), 'PPP p')}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pl-4 border-l ml-2">
                      {chat.messages && chat.messages.length > 0 ? (
                        chat.messages.map((message) => (
                          <div key={message.id} className="text-sm">
                            <p className="font-semibold capitalize">
                              {message.role}
                              <span className="text-xs text-muted-foreground ml-2 font-normal">
                                {format(new Date(message.createdAt), 'p')}
                              </span>
                            </p>
                            {/* Render message content */}
                            <div className="prose prose-sm dark:prose-invert max-w-none mt-1">
                              <Markdown>{message.content}</Markdown>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">
                          No messages in this chat.
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
