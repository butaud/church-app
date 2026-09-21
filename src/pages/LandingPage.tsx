import { SignInButton, SignUpButton } from "@clerk/react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../lib/usePageTitle";

export function LandingPage() {
  usePageTitle();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">
        Emmanuel Church
      </h1>
      <p className="max-w-sm text-gray-600">
        Create an account to view prayer requests and sign up for
        volunteering opportunities and feasts.
      </p>
      <div className="flex gap-3">
        <SignInButton mode="modal">
          <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100">
            Create account
          </button>
        </SignUpButton>
      </div>
      <Link to="/privacy" className="text-xs text-gray-400 hover:underline">
        Privacy policy
      </Link>
    </div>
  );
}
