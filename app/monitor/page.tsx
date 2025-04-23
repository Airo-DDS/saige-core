import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getAllUsers } from '@/lib/db/queries';
import { format } from 'date-fns'; // For date formatting

// Define admin user IDs (ensure this matches middleware.ts)
const ADMIN_USER_IDS = [
  'user_2vrKh36Izrt2Vs33UQSzxNzTSMY', // deren@airodental.com
  'user_2vofoneXbHH2FnGkeNVgfz1lbBK', // haloweavedev@gmail.com
];

export default async function MonitorPage() {
  const authObject = await auth();
  const userId = authObject.userId;

  // Double-check auth within the component (middleware should handle primary guarding)
  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    redirect('/');
  }

  const users = await getAllUsers();

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Registered At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link
                      href={`/monitor/${user.id}`}
                      className="text-primary hover:underline"
                    >
                      {user.email}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), 'PPP p')}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
