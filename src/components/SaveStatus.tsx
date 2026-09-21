export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveStatus({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span
        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
        aria-label="Saving"
      />
    );
  }
  if (state === "saved") {
    return (
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4 text-green-600"
        fill="currentColor"
        aria-label="Saved"
      >
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 111.415-1.414L8.5 12.086l6.79-6.795a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return null;
}
