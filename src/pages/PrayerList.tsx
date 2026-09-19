import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { renderInlineMarkdown } from "../lib/inlineMarkdown";
import { getErrorMessage } from "../lib/errors";

export function PrayerList({ isAdmin }: { isAdmin: boolean }) {
  const items = useQuery(api.prayers.listPrayerItems);
  const createItem = useMutation(api.prayers.createPrayerItem);
  const updateItem = useMutation(api.prayers.updatePrayerItem);
  const deleteItem = useMutation(api.prayers.deletePrayerItem);

  const [editingId, setEditingId] = useState<Id<"prayerItems"> | null>(null);
  const [editingText, setEditingText] = useState("");
  const [newText, setNewText] = useState("");

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
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item._id} className="text-sm text-gray-800">
            {editingId === item._id ? (
              <div className="flex items-start gap-2">
                <input
                  autoFocus
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(item._id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button
                  onClick={() => handleSave(item._id)}
                  className="text-xs text-gray-900 hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-2">
                  <span>•</span>
                  <span>{renderInlineMarkdown(item.text)}</span>
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        setEditingId(item._id);
                        setEditingText(item.text);
                      }}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem({ itemId: item._id })}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

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
