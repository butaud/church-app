import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getErrorMessage } from "../lib/errors";

type SlotDoc = {
  _id: Id<"feastSlots">;
  name: string;
  numberRequested?: number;
  allowExtraSignups: boolean;
  sortOrder: number;
  signups: { _id: Id<"feastSignups">; quantity: number }[];
};

export function FeastSlotEditor({
  eventId,
  slots,
}: {
  eventId: Id<"feastEvents">;
  slots: SlotDoc[];
}) {
  const slotMap = new Map(slots.map((s) => [s._id, s]));
  const [order, setOrder] = useState<Id<"feastSlots">[]>(() =>
    [...slots].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s._id),
  );
  useEffect(() => {
    setOrder([...slots].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s._id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(slots.map((s) => [s._id, s.sortOrder]))]);

  const reorderSlots = useMutation(api.feasts.reorderSlots);
  const createSlot = useMutation(api.feasts.createSlot);
  const updateSlot = useMutation(api.feasts.updateSlot);
  const deleteSlot = useMutation(api.feasts.deleteSlot);

  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<Id<"feastSlots"> | null>(
    null,
  );
  const impact = useQuery(
    api.feasts.slotDeletionImpact,
    confirmDeleteSlot ? { slotId: confirmDeleteSlot } : "skip",
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as Id<"feastSlots">);
    const newIndex = order.indexOf(over.id as Id<"feastSlots">);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(order, oldIndex, newIndex);
    setOrder(reordered);
    try {
      await reorderSlots({
        order: reordered.map((slotId, index) => ({ slotId, sortOrder: index })),
      });
    } catch {
      // ignore; next query update will resync
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {order.map((slotId) => {
              const slot = slotMap.get(slotId);
              if (!slot) return null;
              return (
                <SlotCard
                  key={slotId}
                  slot={slot}
                  onSave={(name, numberRequested, allowExtraSignups) =>
                    updateSlot({
                      slotId: slot._id,
                      name,
                      numberRequested,
                      allowExtraSignups,
                    })
                  }
                  onDelete={() => setConfirmDeleteSlot(slot._id)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <AddSlotForm
        onAdd={(name) =>
          createSlot({ eventId, name, allowExtraSignups: false })
        }
      />

      {confirmDeleteSlot && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-2 text-base font-semibold text-gray-900">
              Delete "{slotMap.get(confirmDeleteSlot)?.name}"?
            </h3>
            {impact === undefined ? (
              <p className="text-sm text-gray-500">Checking existing signups...</p>
            ) : impact.length > 0 ? (
              <div className="mb-3 text-sm text-gray-700">
                <p className="mb-1">This will also delete these signups:</p>
                <ul className="list-disc pl-5">
                  {impact.map((s, i) => (
                    <li key={i}>
                      {s.name} ({s.quantity})
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mb-3 text-sm text-gray-600">
                There are no signups for this slot.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteSlot(null)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteSlot({ slotId: confirmDeleteSlot });
                  setConfirmDeleteSlot(null);
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

function SlotCard({
  slot,
  onSave,
  onDelete,
}: {
  slot: SlotDoc;
  onSave: (name: string, numberRequested: number | undefined, allowExtraSignups: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slot._id });
  const [error, setError] = useState<string | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded border border-gray-200 bg-white p-2"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab select-none px-1 text-gray-400"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
        <input
          defaultValue={slot.name}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          onBlur={(e) => {
            const value = e.target.value.trim();
            if (value && value !== slot.name) {
              onSave(value, slot.numberRequested, slot.allowExtraSignups);
            }
          }}
        />
        <input
          type="number"
          min={1}
          placeholder="#"
          defaultValue={slot.numberRequested ?? ""}
          className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
          onBlur={(e) => {
            const raw = e.target.value.trim();
            const value = raw ? Number(raw) : undefined;
            if (value !== slot.numberRequested) {
              try {
                onSave(slot.name, value, slot.allowExtraSignups);
                setError(null);
              } catch (err) {
                setError(getErrorMessage(err, "Could not save"));
              }
            }
          }}
        />
        <button onClick={onDelete} className="text-xs text-red-600 hover:underline">
          Delete
        </button>
      </div>
      {slot.numberRequested !== undefined && (
        <label className="mt-1 flex items-center gap-1 pl-7 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={slot.allowExtraSignups}
            onChange={(e) => onSave(slot.name, slot.numberRequested, e.target.checked)}
          />
          Allow extra signups beyond the number requested
        </label>
      )}
      {error && <p className="pl-7 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function AddSlotForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New slot name"
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            onAdd(name.trim());
            setName("");
          }
        }}
      />
      <button
        onClick={() => {
          if (!name.trim()) return;
          onAdd(name.trim());
          setName("");
        }}
        className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
      >
        Add slot
      </button>
    </div>
  );
}
