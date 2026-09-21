import { useState } from "react";

export function FeastSignupDialog({
  title,
  initialQuantity = 1,
  initialNote = "",
  submitLabel,
  onSubmit,
  onCancelSignup,
  onClose,
}: {
  title: string;
  initialQuantity?: number;
  initialNote?: string;
  submitLabel: string;
  onSubmit: (quantity: number, note: string) => Promise<void>;
  onCancelSignup?: () => Promise<void>;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(quantity, note);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSignup() {
    if (!onCancelSignup) return;
    setError(null);
    setSubmitting(true);
    try {
      await onCancelSignup();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove signup");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
        <h3 className="mb-3 text-base font-semibold text-gray-900">{title}</h3>

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

        <div className="flex items-center justify-between">
          <div>
            {onCancelSignup && (
              <button
                onClick={handleCancelSignup}
                disabled={submitting}
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                Remove signup
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
