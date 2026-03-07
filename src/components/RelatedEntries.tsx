import { useState, useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

interface RelatedEntriesProps {
  content: string;
  onEntryClick?: (entryId: string) => void;
}

export function RelatedEntries({ content, onEntryClick }: RelatedEntriesProps) {
  const [related, setRelated] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const findRelated = useAction(api.search.findRelatedEntries);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (content.trim().length < 50) {
      setRelated([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await findRelated({ content: content.trim() });
        setRelated(results);
      } catch (err) {
        console.warn("[RelatedEntries] search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 2000); // 2-second debounce

    return () => clearTimeout(debounceRef.current);
  }, [content, findRelated]);

  if (related.length === 0 && !isLoading) return null;

  return (
    <div className="border border-[rgba(26,26,26,0.08)] bg-[rgba(255,255,255,0.3)] p-3 flex flex-col gap-2">
      <p className="text-xs uppercase tracking-wide text-[var(--ink-light)] font-medium">
        {isLoading ? "Finding related entries..." : "Related entries"}
      </p>
      {related.map((entry: any) => (
        <button
          key={entry._id}
          onClick={() => onEntryClick?.(entry._id)}
          className="text-left p-2 text-sm text-[var(--ink-light)] hover:text-[var(--ink)] hover:bg-[rgba(26,26,26,0.02)] transition-colors"
        >
          <span className="text-xs text-[var(--ink-light)]">
            {new Date(entry._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          {" — "}
          {entry.content.slice(0, 80)}...
        </button>
      ))}
    </div>
  );
}
