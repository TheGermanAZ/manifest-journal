import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface BookmarkToggleProps {
  entryId: string;
  bookmarked: boolean;
}

export function BookmarkToggle({ entryId, bookmarked }: BookmarkToggleProps) {
  const toggle = useMutation(api.entries.toggleBookmark);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle({ entryId: entryId as any });
      }}
      className="p-1 transition-colors hover:text-[var(--vermillion)]"
      title={bookmarked ? "Remove bookmark" : "Bookmark this entry"}
    >
      {bookmarked ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="var(--vermillion)"
          stroke="var(--vermillion)"
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  );
}
