import { SignOutButton } from "@clerk/react";
import { usePageTitle } from "../lib/usePageTitle";

export function PendingPage({ denied }: { denied: boolean }) {
  usePageTitle(denied ? "Request Denied" : "Pending Approval");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">
        {denied ? "Account request denied" : "Account request pending"}
      </h1>
      <p className="max-w-sm text-gray-600">
        {denied
          ? "An administrator has denied this account request. Contact the church office if you believe this is a mistake."
          : "An administrator needs to approve your account before you can access this app."}
      </p>
      <SignOutButton>
        <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100">
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}
