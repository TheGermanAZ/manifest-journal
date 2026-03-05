import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ProfileTimeline() {
  const versions = useQuery(api.dreamProfileVersions.listVersions);

  if (!versions || versions.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-medium text-[var(--ink)]">
        Profile Evolution
      </h2>
      <div className="relative pl-6 flex flex-col gap-4">
        {/* Vertical line */}
        <div className="absolute left-2 top-0 bottom-0 w-px bg-[rgba(26,26,26,0.12)]" />

        {versions.map((v) => (
          <div key={v._id} className="relative">
            {/* Dot */}
            <div className="absolute left-[-16px] top-1 w-2 h-2 rounded-full bg-[var(--vermillion)]" />

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--ink)]">
                  v{v.version}
                </span>
                <span className="text-[10px] text-[var(--ink-light)]">
                  {new Date(v._creationTime).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {v.changedFields.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {v.changedFields.map((field) => (
                    <span
                      key={field}
                      className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[10px] capitalize"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              )}

              {v.aiCommentary && (
                <p className="text-xs text-[var(--ink-light)] italic mt-1">
                  {v.aiCommentary}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
