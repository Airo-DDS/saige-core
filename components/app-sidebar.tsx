'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar() {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Saige
              </span>
            </Link>
            <SignedIn>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit"
                    onClick={() => {
                      setOpenMobile(false);
                      router.push('/');
                      router.refresh();
                    }}
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">New Chat</TooltipContent>
              </Tooltip>
            </SignedIn>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SignedIn>
          <SidebarHistory />
        </SignedIn>
        <SignedOut>
          <div className="p-4 text-center text-sm text-muted-foreground">
            Please{' '}
            <Link href="/sign-in" className="underline">
              Sign In
            </Link>{' '}
            to view chat history.
          </div>
        </SignedOut>
      </SidebarContent>
      <SidebarFooter>
        <SignedIn>
          <div className="flex justify-center p-2">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </SignedIn>
      </SidebarFooter>
    </Sidebar>
  );
}
