import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { FeastSignupDialog } from "./FeastSignupDialog";
import { FeastAssignDialog } from "./FeastAssignDialog";

type Signup = {
  _id: Id<"feastSignups">;
  userId?: Id<"users">;
  inviteId?: Id<"invites">;
  quantity: number;
  note?: string;
  name: string;
  isPendingInvite: boolean;
};

type SlotDoc = {
  _id: Id<"feastSlots">;
  name: string;
  numberRequested?: number;
  allowExtraSignups: boolean;
  categoryId?: Id<"feastCategories">;
  signups: Signup[];
};

type CategoryDoc = { _id: Id<"feastCategories">; name: string; sortOrder: number };

export function FeastSlotViewer({
  categories,
  slots,
  myUserId,
  isAdmin,
  isPast,
}: {
  categories: CategoryDoc[];
  slots: SlotDoc[];
  myUserId: Id<"users"> | null;
  isAdmin: boolean;
  isPast: boolean;
}) {
  const groups: { id: string; name: string | null; slots: SlotDoc[] }[] = [
    { id: "uncategorized", name: null, slots: slots.filter((s) => !s.categoryId) },
    ...categories.map((c) => ({
      id: c._id,
      name: c.name,
      slots: slots.filter((s) => s.categoryId === c._id),
    })),
  ].filter((g) => g.slots.length > 0);

  if (groups.length === 0) {
    return <p className="text-sm text-gray-500">No signup slots yet.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id}>
          {group.name && (
            <h3 className="mb-1 text-sm font-medium text-gray-700">{group.name}</h3>
          )}
          <div className="space-y-2">
            {group.slots.map((slot) => (
              <SlotRow
                key={slot._id}
                slot={slot}
                myUserId={myUserId}
                isAdmin={isAdmin}
                isPast={isPast}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SlotRow({
  slot,
  myUserId,
  isAdmin,
  isPast,
}: {
  slot: SlotDoc;
  myUserId: Id<"users"> | null;
  isAdmin: boolean;
  isPast: boolean;
}) {
  const signUp = useMutation(api.feasts.signUpForSlot);
  const updateSignup = useMutation(api.feasts.updateSignup);
  const cancelSignup = useMutation(api.feasts.cancelFeastSignup);

  const [signingUp, setSigningUp] = useState(false);
  const [editingSignup, setEditingSignup] = useState<Signup | null>(null);
  const [assigning, setAssigning] = useState(false);

  const total = slot.signups.reduce((sum, s) => sum + s.quantity, 0);
  const isFull =
    slot.numberRequested !== undefined && total >= slot.numberRequested;
  const iAmSignedUp = slot.signups.some((s) => s.userId === myUserId);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium">{slot.name}</span>
        {slot.numberRequested !== undefined && (
          <span className="text-xs text-gray-500">
            {total} / {slot.numberRequested}
          </span>
        )}
      </div>

      {slot.signups.length > 0 && (
        <ul className="mb-2 space-y-1">
          {slot.signups.map((s) => (
            <li
              key={s._id}
              className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1 text-sm"
            >
              <span>
                {s.name}
                {s.quantity > 1 && ` (${s.quantity})`}
                {s.isPendingInvite && (
                  <span className="ml-1 text-gray-400">(invited)</span>
                )}
                {s.note && (
                  <span className="ml-1 text-gray-500">— {s.note}</span>
                )}
              </span>
              {(s.userId === myUserId || isAdmin) && !isPast && (
                <button
                  onClick={() => setEditingSignup(s)}
                  className="shrink-0 text-xs text-gray-600 hover:underline"
                >
                  Edit
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isPast && !iAmSignedUp && myUserId && (!isFull || slot.allowExtraSignups) && (
        <button
          onClick={() => setSigningUp(true)}
          className="w-full rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          {isFull ? "Sign up anyway" : "Sign up"}
        </button>
      )}

      {isAdmin && !isPast && (
        <button
          onClick={() => setAssigning(true)}
          className="mt-1 w-full rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          Assign someone
        </button>
      )}

      {signingUp && (
        <FeastSignupDialog
          title={`Sign up for ${slot.name}`}
          submitLabel="Sign up"
          onSubmit={async (quantity, note) => {
            await signUp({ slotId: slot._id, quantity, note: note || undefined });
          }}
          onClose={() => setSigningUp(false)}
        />
      )}

      {editingSignup && (
        <FeastSignupDialog
          title={`Edit signup for ${slot.name}`}
          submitLabel="Save"
          initialQuantity={editingSignup.quantity}
          initialNote={editingSignup.note ?? ""}
          onSubmit={async (quantity, note) => {
            await updateSignup({
              signupId: editingSignup._id,
              quantity,
              note: note || undefined,
            });
          }}
          onCancelSignup={async () => {
            await cancelSignup({ signupId: editingSignup._id });
          }}
          onClose={() => setEditingSignup(null)}
        />
      )}

      {assigning && (
        <FeastAssignDialog slotId={slot._id} onClose={() => setAssigning(false)} />
      )}
    </div>
  );
}
