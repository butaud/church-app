import type { ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function AppProviders({ children }: { children: ReactNode }) {
  if (!clerkKey || !convex) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-gray-600">
        App is not configured. Set VITE_CLERK_PUBLISHABLE_KEY and
        VITE_CONVEX_URL.
      </div>
    );
  }
  return (
    <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
