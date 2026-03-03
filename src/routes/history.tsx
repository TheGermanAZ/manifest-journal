import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { EntryCard } from "../components/EntryCard";

export const Route = createFileRoute("/history")({
  component: () => (
    <AuthGuard>
      <HistoryPage />
    </AuthGuard>
  ),
});

function HistoryPage() {
  const entries = useQuery(api.entries.listEntries);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-stone-900">
            Entry History
          </h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs text-stone-500 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:border-stone-400"
          >
            Journal
          </button>
        </div>

        {/* Entry list */}
        {entries === undefined ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-stone-400 text-sm">
              Loading entries...
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-stone-400 text-sm">
              No entries yet. Write your first one.
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
