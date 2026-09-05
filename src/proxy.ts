import { clerkMiddleware } from "@clerk/nextjs/server";

// Attaches the Clerk session to every request. Authorization is not done here:
// each page, route and server action that reads tenant data calls
// requireLocalUser, so a route can never be protected by path matching alone.
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
