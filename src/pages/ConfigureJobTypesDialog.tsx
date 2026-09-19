import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function ConfigureJobTypesDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const jobTypes = useQuery(api.volunteering.listJobTypes);
  const createJobType = useMutation(api.volunteering.createJobType);
  const updateJobType = useMutation(api.volunteering.updateJobType);
  const deleteJobType = useMutation(api.volunteering.deleteJobType);

  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: Id<"jobTypes">;
    name: string;
    signups: { date: string; userName: string }[];
  } | null>(null);
  const impact = useQuery(
    api.volunteering.jobTypeDeletionImpact,
    confirmDelete ? { jobTypeId: confirmDelete.id } : "skip",
  );

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Configure volunteer jobs
          </h2>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Close
          </button>
        </div>

        <div className="space-y-2">
          {jobTypes?.map((jt) => (
            <div
              key={jt._id}
              className="flex items-center gap-2 rounded-md border border-gray-200 p-2"
            >
              <input
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                defaultValue={jt.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== jt.name) {
                    updateJobType({
                      jobTypeId: jt._id,
                      name,
                      capacity: jt.capacity,
                    });
                  }
                }}
              />
              <input
                type="number"
                min={1}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                defaultValue={jt.capacity}
                onBlur={(e) => {
                  const capacity = Number(e.target.value);
                  if (capacity >= 1 && capacity !== jt.capacity) {
                    updateJobType({ jobTypeId: jt._id, name: jt.name, capacity });
                  }
                }}
              />
              <button
                onClick={() =>
                  setConfirmDelete({ id: jt._id, name: jt.name, signups: [] })
                }
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-gray-200 pt-4">
          <input
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="New job name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
            value={newCapacity}
            onChange={(e) => setNewCapacity(Number(e.target.value))}
          />
          <button
            onClick={async () => {
              if (!newName.trim()) return;
              await createJobType({ name: newName.trim(), capacity: newCapacity });
              setNewName("");
              setNewCapacity(1);
            }}
            className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
          >
            Add
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-2 text-base font-semibold text-gray-900">
              Delete "{confirmDelete.name}"?
            </h3>
            {impact === undefined ? (
              <p className="text-sm text-gray-500">Checking existing signups...</p>
            ) : impact.length > 0 ? (
              <div className="mb-3 text-sm text-gray-700">
                <p className="mb-1">
                  This will also delete these upcoming signups:
                </p>
                <ul className="list-disc pl-5">
                  {impact.map((s, i) => (
                    <li key={i}>
                      {s.userName} — {s.date}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mb-3 text-sm text-gray-600">
                There are no upcoming signups for this job.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteJobType({ jobTypeId: confirmDelete.id });
                  setConfirmDelete(null);
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
