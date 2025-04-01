'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignedIn, SignedOut } from '@clerk/nextjs';

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
              <span className="text-xl font-semibold px-2 hover:bg-sidebar-accent/50 text-primary rounded-md cursor-pointer transition-colors">
                Saige
              </span>
            </Link>
            <SignedIn>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="p-2 h-fit text-primary hover:text-primary/80 hover:bg-primary/10"
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
          <div className="p-4 text-center text-sm text-sidebar-foreground">
            Please{' '}
            <Link
              href="/sign-in"
              className="underline text-primary font-medium"
            >
              Sign In
            </Link>{' '}
            to view chat history.
          </div>
        </SignedOut>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-3 text-xs text-center text-sidebar-foreground/70">
          Saige - Dental AI Assistant
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
