import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define routes that require authentication
const isProtectedRoute = createRouteMatcher([
  // '/', // Removed - Let's make root public initially
  '/chat(.*)', // Protect specific chat pages
  '/api/(.*)', // Protect most API routes (adjust as needed)
]);

// Define public routes that should not be protected
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware((auth, req) => {
  // Don't apply protection to public routes
  if (isPublicRoute(req)) {
    return;
  }

  // Protect routes that need authentication
  if (isProtectedRoute(req)) {
    auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)', // Exclude static files
    '/', // Include root
    '/(api|trpc)(.*)', // Include API routes
  ],
};
