import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define admin user IDs
const ADMIN_USER_IDS = [
  'user_2vrKh36Izrt2Vs33UQSzxNzTSMY', // deren@airodental.com
  'user_2vofoneXbHH2FnGkeNVgfz1lbBK', // haloweavedev@gmail.com
];

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  // '/', // Keep root public
  '/chat(.*)', // Protect specific chat pages
  // '/api/(.*)', // Keep API routes protected as before (or adjust if needed)
]);

// Define public routes that should not be protected
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

// Define admin-only routes
const isAdminRoute = createRouteMatcher(['/monitor(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Don't apply protection to public routes
  if (isPublicRoute(req)) {
    return;
  }

  // Handle admin routes
  if (isAdminRoute(req)) {
    const authObject = await auth();
    if (!authObject.userId || !ADMIN_USER_IDS.includes(authObject.userId)) {
      // Redirect non-admins to the homepage
      const homeUrl = new URL('/', req.url);
      return NextResponse.redirect(homeUrl);
    }
    // Allow access for admins
    return;
  }

  // Protect other routes that need authentication
  if (isProtectedRoute(req)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)', // Exclude static files
    '/', // Include root
    '/(api|trpc)(.*)', // Include API routes
    '/monitor(.*)', // Include monitor routes
  ],
};
