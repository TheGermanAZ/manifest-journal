import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const toneHexColors: Record<string, string> = {
  hopeful: "#6ee7b7", // emerald-300
  anxious: "#fdba74", // orange-300
  stuck: "#cbd5e1", // slate-300
  clear: "#93c5fd", // blue-300
  resistant: "#fca5a5", // red-300
  expansive: "#c4b5fd", // violet-300
  grief: "#d6d3d1", // stone-300
  excited: "#fde047", // yellow-300
};

export function MoodCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const data = useQuery(api.dashboard.calendarData, { year, month });

  const monthName = new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Calculate calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDayOfWeek = firstDay.getDay(); // 0=Sun

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedDayData =
    selectedDay && data?.days[selectedDay.toString()];

  return (
    <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[var(--ink)]">
          Mood Calendar
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="text-xs text-[var(--ink-light)] hover:text-[var(--ink)] px-1"
          >
            &larr;
          </button>
          <span className="text-xs text-[var(--ink-light)] min-w-[120px] text-center">
            {monthName}
          </span>
          <button
            onClick={nextMonth}
            className="text-xs text-[var(--ink-light)] hover:text-[var(--ink)] px-1"
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] text-[var(--ink-light)] font-medium py-1"
          >
            {d}
          </div>
        ))}

        {/* Empty cells for offset */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayData = data?.days[day.toString()];
          const bgColor = dayData
            ? (toneHexColors[dayData.dominantTone] ?? "#e7e5e4")
            : "transparent";
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`aspect-square flex items-center justify-center text-[10px] rounded-sm transition-all ${
                isSelected ? "ring-1 ring-[var(--ink)]" : ""
              } ${dayData ? "cursor-pointer hover:ring-1 hover:ring-[var(--ink-light)]" : "cursor-default"}`}
              style={{
                backgroundColor: dayData ? bgColor : "transparent",
                opacity: dayData ? 1 : 0.3,
              }}
            >
              <span
                style={{ opacity: dayData ? 1 : 0.5 }}
                className="text-[var(--ink)]"
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      {selectedDayData && selectedDay && (
        <div className="border-t border-[rgba(26,26,26,0.08)] pt-3 flex flex-col gap-1">
          <p className="text-xs font-medium text-[var(--ink)]">
            {new Date(year, month - 1, selectedDay).toLocaleDateString(
              "en-US",
              { weekday: "long", month: "short", day: "numeric" },
            )}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--ink-light)]">
            <span className="capitalize">{selectedDayData.dominantTone}</span>
            <span>&middot;</span>
            <span>Alignment: {selectedDayData.avgAlignment}/10</span>
            <span>&middot;</span>
            <span>
              {selectedDayData.count}{" "}
              {selectedDayData.count === 1 ? "entry" : "entries"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
