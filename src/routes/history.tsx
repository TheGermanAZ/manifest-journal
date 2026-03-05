import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useAction } from "convex/react";
import { useState, useRef, useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { EntryCard } from "../components/EntryCard";
import { ExportModal } from "../components/ExportModal";

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
  const searchEntries = useAction(api.search.searchEntries);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const performSearch = useCallback(
    async (query: string) => {
      if (query.trim().length < 3) {
        setSearchResults(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchEntries({ query: query.trim() });
        setSearchResults(results);
      } catch {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    },
    [searchEntries]
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 800);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setIsSearching(false);
    clearTimeout(debounceRef.current);
  };

  const displayEntries = searchResults ?? entries;
  const isShowingSearch = searchResults !== null;

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="display-title font-normal text-xl text-[var(--ink)]">
            Entry History
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowExport(true)}
              className="text-sm text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
            >
              Export
            </button>
            <button
              onClick={() => navigate({ to: "/" })}
              className="text-sm text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
            >
              Journal
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search your entries..."
            className="w-full px-4 py-2.5 text-base text-[var(--ink)] bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] placeholder:text-[var(--ink-light)] placeholder:opacity-50 focus:outline-none focus:border-[var(--ink)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ink-light)] hover:text-[var(--ink)] transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search status */}
        {isSearching && (
          <div className="text-sm text-[var(--ink-light)] animate-pulse">
            Searching...
          </div>
        )}

        {isShowingSearch && !isSearching && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--ink-light)]">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
            <button
              onClick={clearSearch}
              className="text-sm text-[var(--ink-light)] hover:text-[var(--ink)] underline transition-colors"
            >
              Show all entries
            </button>
          </div>
        )}

        {/* Entry list */}
        {displayEntries === undefined ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-pulse text-[var(--ink-light)] text-base">
              Loading entries...
            </div>
          </div>
        ) : displayEntries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[var(--ink-light)] text-base">
              {isShowingSearch
                ? "No matching entries found."
                : "No entries yet. Write your first one."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayEntries.map((entry: any) => (
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

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
