import { NavLink } from "react-router-dom";
import { UserButton } from "@clerk/react";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded-md ${
    isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-200"
  }`;

export function Nav({ isAdmin }: { isAdmin: boolean }) {
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
              Manage
            </NavLink>
          )}
        </div>
        <UserButton />
      </div>
    </nav>
  );
}
