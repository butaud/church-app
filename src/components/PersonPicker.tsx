import { useMemo, useState, type KeyboardEvent } from "react";
import type { Doc } from "../../convex/_generated/dataModel";

type PersonOption = {
  value: string;
  label: string;
  searchText: string;
  isInvite: boolean;
};

// Type-to-filter person chooser. Values are "user:<id>" or "invite:<id>".
export function PersonPicker({
  users,
  invites,
  value,
  onChange,
}: {
  users: Doc<"users">[] | undefined;
  invites: Doc<"invites">[] | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const options = useMemo<PersonOption[]>(() => {
    const userOptions = (users ?? []).map((u) => ({
      value: `user:${u._id}`,
      label: u.name,
      searchText: `${u.name} ${u.email}`.toLowerCase(),
      isInvite: false,
    }));
    const inviteOptions = (invites ?? []).map((inv) => ({
      value: `invite:${inv._id}`,
      label: inv.displayName ?? inv.email,
      searchText: `${inv.displayName ?? ""} ${inv.email}`.toLowerCase(),
      isInvite: true,
    }));
    return [...userOptions, ...inviteOptions].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [users, invites]);

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? options.filter((o) => o.searchText.includes(q)) : options;
  }, [options, filter]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = matches[highlighted];
      if (option) onChange(option.value);
    }
  }

  return (
    <div>
      <input
        type="text"
        autoFocus
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setHighlighted(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type a name to search"
        className="mb-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <ul className="max-h-60 overflow-y-auto rounded border border-gray-200">
        {users === undefined || invites === undefined ? (
          <li className="px-2 py-1 text-sm text-gray-400">Loading…</li>
        ) : matches.length === 0 ? (
          <li className="px-2 py-1 text-sm text-gray-400">No matches</li>
        ) : (
          matches.map((o, i) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onChange(o.value)}
                onMouseEnter={() => setHighlighted(i)}
                className={`block w-full px-2 py-1 text-left text-sm ${
                  o.value === value
                    ? "bg-gray-900 text-white"
                    : i === highlighted
                      ? "bg-gray-100"
                      : ""
                }`}
              >
                {o.label}
                {o.isInvite && (
                  <span
                    className={`ml-1 ${o.value === value ? "text-gray-300" : "text-gray-400"}`}
                  >
                    (invited)
                  </span>
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
