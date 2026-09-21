import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getErrorMessage } from "../lib/errors";

const UNCATEGORIZED = "uncategorized";

type SlotDoc = {
  _id: Id<"feastSlots">;
  name: string;
  numberRequested?: number;
  allowExtraSignups: boolean;
  categoryId?: Id<"feastCategories">;
  sortOrder: number;
  signups: { _id: Id<"feastSignups">; quantity: number }[];
};

type CategoryDoc = { _id: Id<"feastCategories">; name: string; sortOrder: number };

type Column = { id: string; name: string | null; slotIds: string[] };

function buildColumns(categories: CategoryDoc[], slots: SlotDoc[]): Column[] {
  const byCategory = new Map<string, SlotDoc[]>();
  byCategory.set(UNCATEGORIZED, []);
  for (const c of categories) byCategory.set(c._id, []);
  for (const s of slots) {
    const key = s.categoryId ?? UNCATEGORIZED;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(s);
  }
  const cols: Column[] = [
    {
      id: UNCATEGORIZED,
      name: null,
      slotIds: byCategory
        .get(UNCATEGORIZED)!
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => s._id),
    },
  ];
  for (const c of categories) {
    cols.push({
      id: c._id,
      name: c.name,
      slotIds: (byCategory.get(c._id) ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => s._id),
    });
  }
  return cols;
}

export function FeastSlotEditor({
  eventId,
  categories,
  slots,
}: {
  eventId: Id<"feastEvents">;
  categories: CategoryDoc[];
  slots: SlotDoc[];
}) {
  const slotMap = new Map(slots.map((s) => [s._id, s]));
  const [columns, setColumns] = useState<Column[]>(() =>
    buildColumns(categories, slots),
  );
  useEffect(() => {
    setColumns(buildColumns(categories, slots));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(categories), JSON.stringify(slots.map((s) => [s._id, s.categoryId, s.sortOrder]))]);

  const reorderSlots = useMutation(api.feasts.reorderSlots);
  const createCategory = useMutation(api.feasts.createCategory);
  const renameCategory = useMutation(api.feasts.renameCategory);
  const deleteCategory = useMutation(api.feasts.deleteCategory);
  const createSlot = useMutation(api.feasts.createSlot);
  const updateSlot = useMutation(api.feasts.updateSlot);
  const deleteSlot = useMutation(api.feasts.deleteSlot);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<Id<"feastSlots"> | null>(
    null,
  );
  const impact = useQuery(
    api.feasts.slotDeletionImpact,
    confirmDeleteSlot ? { slotId: confirmDeleteSlot } : "skip",
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function findColumnOf(slotId: string, cols: Column[]): Column | undefined {
    return cols.find((c) => c.slotIds.includes(slotId));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    setColumns((cols) => {
      const fromCol = findColumnOf(activeId, cols);
      const toCol = cols.find((c) => c.id === overId) ?? findColumnOf(overId, cols);
      if (!fromCol || !toCol || fromCol.id === toCol.id) return cols;

      const fromIds = fromCol.slotIds.filter((id) => id !== activeId);
      const overIndex = toCol.slotIds.indexOf(overId);
      const toIds = [...toCol.slotIds];
      if (overIndex >= 0) {
        toIds.splice(overIndex, 0, activeId);
      } else {
        toIds.push(activeId);
      }

      return cols.map((c) => {
        if (c.id === fromCol.id) return { ...c, slotIds: fromIds };
        if (c.id === toCol.id) return { ...c, slotIds: toIds };
        return c;
      });
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    let finalColumns = columns;
    const fromCol = findColumnOf(activeId, columns);
    if (fromCol && activeId !== overId) {
      const overInSameCol = fromCol.slotIds.includes(overId);
      if (overInSameCol) {
        const oldIndex = fromCol.slotIds.indexOf(activeId);
        const newIndex = fromCol.slotIds.indexOf(overId);
        const reordered = arrayMove(fromCol.slotIds, oldIndex, newIndex);
        finalColumns = columns.map((c) =>
          c.id === fromCol.id ? { ...c, slotIds: reordered } : c,
        );
        setColumns(finalColumns);
      }
    }

    const order = finalColumns.flatMap((col) =>
      col.slotIds.map((slotId, index) => ({
        slotId: slotId as Id<"feastSlots">,
        categoryId: col.id === UNCATEGORIZED ? undefined : (col.id as Id<"feastCategories">),
        sortOrder: index,
      })),
    );
    try {
      await reorderSlots({ order });
    } catch {
      // ignore; next query update will resync
    }
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {columns.map((col) => (
          <div key={col.id} className="rounded-md border border-gray-200 p-3">
            {col.name !== null ? (
              <div className="mb-2 flex items-center justify-between">
                <input
                  defaultValue={col.name}
                  className="rounded border border-gray-300 px-2 py-1 text-sm font-medium"
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== col.name) {
                      renameCategory({
                        categoryId: col.id as Id<"feastCategories">,
                        name: value,
                      });
                    }
                  }}
                />
                <button
                  onClick={() =>
                    deleteCategory({ categoryId: col.id as Id<"feastCategories"> })
                  }
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete category
                </button>
              </div>
            ) : (
              columns.length > 1 && (
                <p className="mb-2 text-xs text-gray-400">Uncategorized</p>
              )
            )}

            <DroppableColumn id={col.id}>
              <SortableContext items={col.slotIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {col.slotIds.map((slotId) => {
                    const slot = slotMap.get(slotId as Id<"feastSlots">);
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
            </DroppableColumn>

            <AddSlotForm
              onAdd={(name) =>
                createSlot({
                  eventId,
                  categoryId: col.id === UNCATEGORIZED ? undefined : (col.id as Id<"feastCategories">),
                  name,
                  allowExtraSignups: false,
                })
              }
            />
          </div>
        ))}
      </DndContext>

      <div className="flex items-center gap-2">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          onClick={async () => {
            if (!newCategoryName.trim()) return;
            await createCategory({ eventId, name: newCategoryName.trim() });
            setNewCategoryName("");
          }}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
        >
          Add category
        </button>
      </div>

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

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="min-h-[2rem]">
      {children}
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
    <div className="mt-2 flex items-center gap-2">
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
