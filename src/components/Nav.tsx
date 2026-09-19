import { NavLink } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded-md ${
    isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-200"
  }`;

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pendingRequests = useQuery(
    api.users.listPendingRequests,
    isAdmin ? {} : "skip",
  );
  const pendingCount = pendingRequests?.length ?? 0;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/volunteering" className={linkClass}>
            Volunteering
          </NavLink>
          <NavLink to="/feasts" className={linkClass}>
            Feasts
          </NavLink>
          {isAdmin && (
            <NavLink to="/manage" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                Manage
                {pendingCount > 0 && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {pendingCount}
                  </span>
                )}
              </span>
            </NavLink>
          )}
        </div>
        <UserButton />
      </div>
    </nav>
  );
}
