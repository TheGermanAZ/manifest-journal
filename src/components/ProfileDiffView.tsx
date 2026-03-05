interface ProfileDiffViewProps {
  version: {
    manifesto: string;
    categories: Record<string, string>;
    changedFields: string[];
  };
  currentManifesto: string;
  currentCategories: Record<string, string>;
}

export function ProfileDiffView({
  version,
  currentManifesto,
  currentCategories,
}: ProfileDiffViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {version.changedFields.map((field) => {
        const oldValue =
          field === "manifesto"
            ? version.manifesto
            : (version.categories[field] ?? "");
        const newValue =
          field === "manifesto"
            ? currentManifesto
            : (currentCategories[field] ?? "");

        return (
          <div key={field} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--ink)] capitalize">
              {field}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-red-50 text-[var(--ink-light)] line-through">
                {oldValue.slice(0, 200)}
                {oldValue.length > 200 ? "..." : ""}
              </div>
              <div className="p-2 bg-emerald-50 text-[var(--ink)]">
                {newValue.slice(0, 200)}
                {newValue.length > 200 ? "..." : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
