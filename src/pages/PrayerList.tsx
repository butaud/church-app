import { useState } from "react";
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
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { renderInlineMarkdown } from "../lib/inlineMarkdown";
import { getErrorMessage } from "../lib/errors";

export function PrayerList({ isAdmin }: { isAdmin: boolean }) {
  const items = useQuery(api.prayers.listPrayerItems);
  const createItem = useMutation(api.prayers.createPrayerItem);
  const updateItem = useMutation(api.prayers.updatePrayerItem);
  const deleteItem = useMutation(api.prayers.deletePrayerItem);
  const reorderItems = useMutation(
    api.prayers.reorderPrayerItems,
  ).withOptimisticUpdate((localStore, { itemIds }) => {
    const current = localStore.getQuery(api.prayers.listPrayerItems, {});
    if (current === undefined) return;
    const byId = new Map(current.map((item) => [item._id, item]));
    localStore.setQuery(
      api.prayers.listPrayerItems,
      {},
      itemIds.flatMap((id, index) => {
        const item = byId.get(id);
        return item ? [{ ...item, sortOrder: index }] : [];
      }),
    );
  });

  const [editingId, setEditingId] = useState<Id<"prayerItems"> | null>(null);
  const [editingText, setEditingText] = useState("");
  const [newText, setNewText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  async function handleSave(itemId: Id<"prayerItems">) {
    try {
      await updateItem({ itemId, text: editingText });
      setEditingId(null);
    } catch (err) {
      alert(getErrorMessage(err, "Could not save"));
    }
  }

  async function handleAdd() {
    if (!newText.trim()) return;
    try {
      await createItem({ text: newText });
      setNewText("");
    } catch (err) {
      alert(getErrorMessage(err, "Could not add"));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!items || !over || active.id === over.id) return;
    const ids = items.map((item) => item._id);
    const oldIndex = ids.indexOf(active.id as Id<"prayerItems">);
    const newIndex = ids.indexOf(over.id as Id<"prayerItems">);
    if (oldIndex === -1 || newIndex === -1) return;
    try {
      await reorderItems({ itemIds: arrayMove(ids, oldIndex, newIndex) });
    } catch (err) {
      alert(getErrorMessage(err, "Could not reorder"));
    }
  }

  if (items === undefined) return null;

  if (items.length === 0 && !isAdmin) {
    return (
      <p className="text-sm text-gray-500">
        There are no prayer requests posted at this time.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-gray-500">
          There are no prayer requests posted at this time.
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item._id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1">
            {items.map((item) => (
              <PrayerItemRow
                key={item._id}
                item={item}
                isAdmin={isAdmin}
                isEditing={editingId === item._id}
                editingText={editingText}
                onEditingTextChange={setEditingText}
                onStartEdit={() => {
                  setEditingId(item._id);
                  setEditingText(item.text);
                }}
                onCancelEdit={() => setEditingId(null)}
                onSave={() => handleSave(item._id)}
                onDelete={() => deleteItem({ itemId: item._id })}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {isAdmin && (
        <div className="flex items-center gap-2 pt-1">
          <input
            placeholder="Add a prayer request..."
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          <button
            onClick={handleAdd}
            className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

function PrayerItemRow({
  item,
  isAdmin,
  isEditing,
  editingText,
  onEditingTextChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  item: Doc<"prayerItems">;
  isAdmin: boolean;
  isEditing: boolean;
  editingText: string;
  onEditingTextChange: (text: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item._id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="text-sm text-gray-800">
      {isEditing ? (
        <div className="flex items-start gap-2">
          <input
            autoFocus
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            value={editingText}
            onChange={(e) => onEditingTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <button onClick={onSave} className="text-xs text-gray-900 hover:underline">
            Save
          </button>
          <button
            onClick={onCancelEdit}
            className="text-xs text-gray-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-2">
            {isAdmin ? (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab touch-none select-none text-gray-400"
                aria-label="Drag to reorder"
              >
                ⠿
              </button>
            ) : (
              <span>•</span>
            )}
            <span>{renderInlineMarkdown(item.text)}</span>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 gap-2">
              <button
                onClick={onStartEdit}
                className="text-xs text-gray-500 hover:underline"
              >
                Edit
              </button>
              <button onClick={onDelete} className="text-xs text-red-600 hover:underline">
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
