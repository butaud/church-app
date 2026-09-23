import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getErrorMessage } from "../lib/errors";
import { PersonPicker } from "../components/PersonPicker";

export function FeastAssignDialog({
  slotId,
  onClose,
}: {
  slotId: Id<"feastSlots">;
  onClose: () => void;
}) {
  const users = useQuery(api.users.listUsers);
  const invites = useQuery(api.users.listInvites);
  const assignUser = useMutation(api.feasts.adminAssignUser);
  const assignInvite = useMutation(api.feasts.adminAssignInvite);

  const [selection, setSelection] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!selection) return;
    setError(null);
    setSubmitting(true);
    try {
      if (selection.startsWith("user:")) {
        const userId = selection.slice("user:".length) as Id<"users">;
        await assignUser({ slotId, userId, quantity, note: note || undefined });
      } else {
        const inviteId = selection.slice("invite:".length) as Id<"invites">;
        await assignInvite({ slotId, inviteId, quantity, note: note || undefined });
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Could not assign"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
        <h3 className="mb-3 text-base font-semibold text-gray-900">
          Assign someone
        </h3>

        <label className="mb-1 block text-xs text-gray-600">Person</label>
        <div className="mb-3">
          <PersonPicker
            users={users}
            invites={invites}
            value={selection}
            onChange={setSelection}
          />
        </div>

        <label className="mb-1 block text-xs text-gray-600">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="mb-3 w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />

        <label className="mb-1 block text-xs text-gray-600">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mb-3 h-20 w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />

        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !selection}
            className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
