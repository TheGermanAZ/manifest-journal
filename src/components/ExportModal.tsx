import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);
  const [format, setFormat] = useState<"json" | "text">("text");

  const entries = useQuery(api.export.exportEntries, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    bookmarkedOnly,
    includeAnalysis,
  });

  const handleExport = () => {
    if (!entries || entries.length === 0) return;

    let content: string;
    let filename: string;
    let type: string;

    if (format === "json") {
      content = JSON.stringify(entries, null, 2);
      filename = `manifest-journal-${new Date().toISOString().split("T")[0]}.json`;
      type = "application/json";
    } else {
      content = entries
        .map((e: any) => {
          const date = new Date(e._creationTime).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          let text = `--- ${date} ---\nMode: ${e.mode}\n\n${e.content}\n`;
          if (e.analysis && includeAnalysis) {
            text += `\nTone: ${e.analysis.emotionalTone}`;
            text += `\nAlignment: ${e.analysis.alignmentScore}/10`;
            text += `\nInsight: ${e.analysis.patternInsight}`;
            text += `\nNudge: ${e.analysis.nudge}\n`;
          }
          return text;
        })
        .join("\n\n");
      filename = `manifest-journal-${new Date().toISOString().split("T")[0]}.txt`;
      type = "text/plain";
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-[var(--paper)] border border-[rgba(26,26,26,0.12)] p-6 max-w-sm mx-4 flex flex-col gap-4 shadow-lg">
        <h2 className="display-title text-xl font-normal text-[var(--ink)]">
          Export Journal
        </h2>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-[var(--ink-light)]">
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border border-[rgba(26,26,26,0.12)] bg-transparent p-1.5"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-[var(--ink-light)]">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border border-[rgba(26,26,26,0.12)] bg-transparent p-1.5"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bookmarkedOnly}
              onChange={(e) => setBookmarkedOnly(e.target.checked)}
              className="accent-[var(--vermillion)]"
            />
            <span className="text-sm text-[var(--ink)]">Bookmarked only</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAnalysis}
              onChange={(e) => setIncludeAnalysis(e.target.checked)}
              className="accent-[var(--vermillion)]"
            />
            <span className="text-sm text-[var(--ink)]">
              Include coach analysis
            </span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => setFormat("text")}
              className={`flex-1 py-1.5 text-sm border transition-colors ${
                format === "text"
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-[rgba(26,26,26,0.12)] text-[var(--ink-light)]"
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setFormat("json")}
              className={`flex-1 py-1.5 text-sm border transition-colors ${
                format === "json"
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-[rgba(26,26,26,0.12)] text-[var(--ink-light)]"
              }`}
            >
              JSON
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--ink-light)]">
            {entries ? `${entries.length} entries` : "Loading..."}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm text-[var(--ink-light)] px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!entries || entries.length === 0}
              className="ink-cta py-1.5 px-4 text-sm disabled:opacity-40"
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
