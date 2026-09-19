import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getErrorMessage } from "../lib/errors";

export function ManagePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 p-4">
      <PrayerListEditor />
      <AccountsSection />
      <PendingRequestsSection />
      <InvitesSection />
    </div>
  );
}

function PrayerListEditor() {
  const items = useQuery(api.prayers.getPrayerList);
  const update = useMutation(api.prayers.updatePrayerList);
  const [draft, setDraft] = useState<string | null>(null);

  const text = draft ?? (items ?? []).join("\n");

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Prayer list
      </h2>
      <p className="mb-2 text-xs text-gray-500">
        One item per line. Supports **bold**, *italic*, and [text](url) links.
      </p>
      <textarea
        className="h-40 w-full rounded-md border border-gray-300 p-2 text-sm"
        value={text}
        onChange={(e) => setDraft(e.target.value)}
      />
      <button
        onClick={async () => {
          await update({ items: text.split("\n") });
          setDraft(null);
        }}
        className="mt-2 rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
      >
        Save
      </button>
    </section>
  );
}

function AccountsSection() {
  const users = useQuery(api.users.listUsers);
  const removeUser = useMutation(api.users.removeUser);
  const setUserRole = useMutation(api.users.setUserRole);

  async function handleSetRole(userId: Id<"users">, role: "admin" | "member") {
    try {
      await setUserRole({ userId, role });
    } catch (err) {
      alert(getErrorMessage(err, "Could not change role"));
    }
  }

  async function handleRemove(userId: Id<"users">, name: string) {
    if (!confirm(`Remove ${name}'s account?`)) return;
    try {
      await removeUser({ userId });
    } catch (err) {
      alert(getErrorMessage(err, "Could not remove account"));
    }
  }

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">Accounts</h2>
      <ul className="space-y-1">
        {users?.map((u) => (
          <li
            key={u._id}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <span>
              {u.name}{" "}
              <span className="text-gray-500">
                ({u.email}
                {u.role === "admin" ? ", admin" : ""})
              </span>
            </span>
            <div className="flex gap-3">
              {u.role === "admin" ? (
                <button
                  onClick={() => handleSetRole(u._id, "member")}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Remove admin
                </button>
              ) : (
                <button
                  onClick={() => handleSetRole(u._id, "admin")}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Make admin
                </button>
              )}
              <button
                onClick={() => handleRemove(u._id, u.name)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {users?.length === 0 && (
          <p className="text-sm text-gray-500">No accounts yet.</p>
        )}
      </ul>
    </section>
  );
}

function PendingRequestsSection() {
  const requests = useQuery(api.users.listPendingRequests);
  const approve = useMutation(api.users.approveRequest);
  const deny = useMutation(api.users.denyRequest);

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Pending approval requests
      </h2>
      <ul className="space-y-1">
        {requests?.map((r) => (
          <li
            key={r._id}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <span>
              {r.name} <span className="text-gray-500">({r.email})</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => approve({ requestId: r._id })}
                className="text-sm text-green-700 hover:underline"
              >
                Approve
              </button>
              <button
                onClick={() => deny({ requestId: r._id })}
                className="text-sm text-red-600 hover:underline"
              >
                Deny
              </button>
            </div>
          </li>
        ))}
        {requests?.length === 0 && (
          <p className="text-sm text-gray-500">No pending requests.</p>
        )}
      </ul>
    </section>
  );
}

function InvitesSection() {
  const invites = useQuery(api.users.listInvites);
  const createInvite = useMutation(api.users.createInvite);
  const revokeInvite = useMutation(api.users.revokeInvite);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Outstanding invites
      </h2>
      <ul className="mb-3 space-y-1">
        {invites?.map((inv) => (
          <li
            key={inv._id}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <span>{inv.email}</span>
            <button
              onClick={() => revokeInvite({ inviteId: inv._id })}
              className="text-sm text-red-600 hover:underline"
            >
              Revoke
            </button>
          </li>
        ))}
        {invites?.length === 0 && (
          <p className="text-sm text-gray-500">No outstanding invites.</p>
        )}
      </ul>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="email@example.com"
          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          onClick={async () => {
            setError(null);
            try {
              await createInvite({ email });
              setEmail("");
            } catch (err) {
              setError(getErrorMessage(err, "Could not invite"));
            }
          }}
          className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
        >
          Invite
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </section>
  );
}
