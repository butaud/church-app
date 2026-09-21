import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { usePageTitle } from "../lib/usePageTitle";
import { getErrorMessage } from "../lib/errors";
import { formatDateLong, toDateStr } from "../lib/sundays";
import { FeastSlotEditor } from "./FeastSlotEditor";
import { FeastSlotViewer } from "./FeastSlotViewer";

export function FeastEventPage({ isAdmin }: { isAdmin: boolean }) {
  const { eventId } = useParams();
  const data = useQuery(
    api.feasts.getEvent,
    eventId ? { eventId: eventId as Id<"feastEvents"> } : "skip",
  );
  const me = useQuery(api.users.getMe);

  usePageTitle(data?.event.title ?? "Feasts");

  const [editMode, setEditMode] = useState(false);

  if (data === undefined || me === undefined) return null;
  if (data === null) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <p className="text-sm text-gray-500">Event not found.</p>
      </div>
    );
  }

  const { event, categories, slots } = data;
  const myUserId = me.status === "active" ? me.user._id : null;
  const isPast = event.date < toDateStr(new Date());

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500">
            {formatDateLong(event.date)}
            {event.time && ` at ${event.time}`}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditMode((m) => !m)}
            className="shrink-0 rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
          >
            {editMode ? "Done editing" : "Edit event"}
          </button>
        )}
      </div>

      {event.description && (
        <p className="text-sm text-gray-800">{event.description}</p>
      )}

      {isAdmin && !editMode && <NotifyMembersButton eventId={event._id} lastNotifiedAt={event.lastNotifiedAt} />}

      {editMode ? (
        <>
          <EventEditForm event={event} />
          <FeastSlotEditor eventId={event._id} categories={categories} slots={slots} />
        </>
      ) : (
        <FeastSlotViewer
          categories={categories}
          slots={slots}
          myUserId={myUserId}
          isAdmin={isAdmin}
          isPast={isPast}
        />
      )}
    </div>
  );
}

function NotifyMembersButton({
  eventId,
  lastNotifiedAt,
}: {
  eventId: Id<"feastEvents">;
  lastNotifiedAt?: number;
}) {
  const notify = useAction(api.feastEmail.notifyMembersOfEvent);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleSend() {
    setError(null);
    setSending(true);
    try {
      await notify({ eventId });
      setConfirming(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not send"));
    } finally {
      setSending(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-700">Email all members about this event?</span>
        <button
          onClick={handleSend}
          disabled={sending}
          className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Send
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={sending}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setConfirming(true)}
        className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
      >
        Notify all members
      </button>
      {lastNotifiedAt && (
        <span className="text-xs text-gray-400">
          Last sent {new Date(lastNotifiedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

function EventEditForm({
  event,
}: {
  event: {
    _id: Id<"feastEvents">;
    title: string;
    date: string;
    time: string;
    description: string;
    reminderEnabled: boolean;
  };
}) {
  const navigate = useNavigate();
  const updateEvent = useMutation(api.feasts.updateEvent);
  const deleteEvent = useMutation(api.feasts.deleteEvent);

  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time);
  const [description, setDescription] = useState(event.description);
  const [reminderEnabled, setReminderEnabled] = useState(event.reminderEnabled);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const impact = useQuery(
    api.feasts.eventDeletionImpact,
    confirmDelete ? { eventId: event._id } : "skip",
  );

  async function handleSave() {
    setError(null);
    try {
      await updateEvent({
        eventId: event._id,
        title,
        date,
        time,
        description,
        reminderEnabled,
      });
    } catch (err) {
      setError(getErrorMessage(err, "Could not save"));
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-3">
      <div>
        <label className="mb-1 block text-xs text-gray-600">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-600">Time</label>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="6:00 PM"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-gray-600">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-20 w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={reminderEnabled}
          onChange={(e) => setReminderEnabled(e.target.checked)}
        />
        Email a reminder to signed-up people at 8am the day before
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-sm text-red-600 hover:underline"
        >
          Delete event
        </button>
        <button
          onClick={handleSave}
          className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
        >
          Save
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-2 text-base font-semibold text-gray-900">
              Delete "{event.title}"?
            </h3>
            {impact === undefined ? (
              <p className="text-sm text-gray-500">Checking existing signups...</p>
            ) : impact.signupCount > 0 ? (
              <p className="mb-3 text-sm text-gray-700">
                This will also delete {impact.signupCount} signup
                {impact.signupCount === 1 ? "" : "s"}.
              </p>
            ) : (
              <p className="mb-3 text-sm text-gray-600">
                There are no signups for this event.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteEvent({ eventId: event._id });
                  navigate("/feasts");
                }}
                className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
