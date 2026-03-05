import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { EntryCard } from "../components/EntryCard";

export const Route = createFileRoute("/highlights")({
  component: () => (
    <AuthGuard>
      <HighlightsPage />
    </AuthGuard>
  ),
});

function HighlightsPage() {
  const entries = useQuery(api.entries.listBookmarkedEntries);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="display-title font-normal text-xl text-[var(--ink)]">
              Highlights
            </h1>
            <p className="text-sm text-[var(--ink-light)] mt-1">
              Bookmarked entries & breakthroughs
            </p>
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-sm text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
          >
            Journal
          </button>
        </div>

        {entries === undefined ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-[var(--ink-light)] text-base">
              Loading...
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[var(--ink-light)] text-base">
              No highlights yet. Bookmark entries or have breakthrough moments.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <EntryCard
                key={entry._id}
                entry={entry}
                onClick={() =>
                  navigate({
                    to: "/response/$entryId",
                    params: { entryId: entry._id },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
