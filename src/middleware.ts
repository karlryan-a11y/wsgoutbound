import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/inngest(.*)",
  "/api/admin/(.*)",
  "/api/campaign/(.*)/progress",
  "/api/campaign/(.*)/cancel",
])

export default clerkMiddleware(async (auth, req) => {
  // Let public API routes through without any Clerk processing
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }
  await auth.protect()
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
