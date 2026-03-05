import { useState } from "react";

interface PathProgressBannerProps {
  pathName: string;
  currentDay: number;
  totalDays: number;
  prompt: string;
  onAbandon?: () => void;
}

export function PathProgressBanner({
  pathName,
  currentDay,
  totalDays,
  prompt,
  onAbandon,
}: PathProgressBannerProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="border border-[var(--vermillion)] bg-[rgba(194,59,34,0.04)] p-4 flex flex-col gap-2 cursor-pointer"
      onClick={() => setCollapsed(!collapsed)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--vermillion)]">
            {pathName}
          </span>
          <span className="text-xs text-[var(--ink-light)]">
            Day {currentDay}/{totalDays}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onAbandon && (
            <button
              onClick={(e) => { e.stopPropagation(); onAbandon(); }}
              className="text-xs text-[var(--ink-light)] hover:text-[var(--vermillion)]"
            >
              Abandon
            </button>
          )}
          <span className="text-sm text-[var(--ink-light)]">
            {collapsed ? "▸" : "▾"}
          </span>
        </div>
      </div>
      {!collapsed && (
        <>
          {/* Progress bar */}
          <div className="h-1 bg-[rgba(26,26,26,0.08)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--vermillion)] transition-all"
              style={{ width: `${((currentDay - 1) / totalDays) * 100}%` }}
            />
          </div>
          <p className="text-base text-[var(--ink)] italic leading-relaxed">
            {prompt}
          </p>
        </>
      )}
    </div>
  );
}
