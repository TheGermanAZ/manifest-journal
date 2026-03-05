import { createFileRoute, Link } from "@tanstack/react-router";
import { AlignmentChart } from "../components/AlignmentChart";
import { RadarChart } from "../components/RadarChart";
import { WeeklySummaryCard } from "../components/WeeklySummaryCard";
import { milestoneConfig } from "../lib/milestoneConfig";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
});

// ---------- Mock Data ----------

const mockAlignmentTrend = [
  { date: "Mon", score: 6 },
  { date: "Tue", score: 7 },
  { date: "Wed", score: 5 },
  { date: "Thu", score: 8 },
  { date: "Fri", score: 7 },
  { date: "Sat", score: 9 },
  { date: "Sun", score: 8 },
];

const mockToneCounts: Record<string, number> = {
  expansive: 24,
  hopeful: 19,
  clear: 15,
  excited: 12,
  anxious: 8,
  stuck: 5,
  resistant: 3,
  grief: 1,
};

const mockDimensions = [
  { name: "career", value: 8.2 },
  { name: "relationships", value: 6.5 },
  { name: "health", value: 7.1 },
  { name: "wealth", value: 4.3 },
  { name: "creative", value: 9.0 },
];

const mockNeglected = ["wealth"];

const mockMilestones = [
  "first_entry",
  "streak_7",
  "streak_30",
  "volume_50",
  "words_10k",
  "alignment_sustained",
  "emotional_shift",
];

const mockWeeklySummary = {
  weekStarting: "2026-02-23",
  weekEnding: "2026-03-01",
  entryCount: 6,
  summary: {
    emotionalArc:
      "The week began with restless energy around a career pivot, settled into clarity by mid-week after a breakthrough journaling session, and closed on an expansive note as new creative ideas started flowing.",
    alignmentTrendSummary:
      "Alignment climbed steadily from 6 to 9 over the week, reflecting growing confidence in your direction.",
    crossEntryPatterns:
      "Morning entries consistently showed higher clarity. Recurring theme: tension between financial security and creative freedom. Three entries mentioned the same unresolved conversation.",
    coachingMessage:
      "You're building real momentum. The pattern of morning clarity suggests your subconscious is doing heavy lifting overnight. Consider using that first-hour energy for your most important creative work.",
    suggestedFocus:
      "Dedicate at least two entries this week to your financial dimension. You've been avoiding it, but your clarity around career could unlock a fresh perspective on wealth.",
    averageAlignmentScore: 7.1,
    dominantTone: "expansive",
    neglectedDimensions: ["wealth"],
  },
};

// ---------- Static Mood Calendar ----------

const toneHexColors: Record<string, string> = {
  hopeful: "#6ee7b7",
  anxious: "#fdba74",
  stuck: "#cbd5e1",
  clear: "#93c5fd",
  resistant: "#fca5a5",
  expansive: "#c4b5fd",
  grief: "#d6d3d1",
  excited: "#fde047",
};

// Generate a representative month of mood data (Feb 2026)
const mockCalendarDays: Record<number, { tone: string }> = {
  1: { tone: "hopeful" },
  2: { tone: "clear" },
  3: { tone: "expansive" },
  4: { tone: "hopeful" },
  5: { tone: "excited" },
  6: { tone: "clear" },
  7: { tone: "expansive" },
  8: { tone: "hopeful" },
  9: { tone: "anxious" },
  10: { tone: "stuck" },
  11: { tone: "clear" },
  12: { tone: "hopeful" },
  13: { tone: "expansive" },
  14: { tone: "excited" },
  15: { tone: "clear" },
  16: { tone: "hopeful" },
  17: { tone: "expansive" },
  18: { tone: "clear" },
  19: { tone: "hopeful" },
  20: { tone: "expansive" },
  21: { tone: "excited" },
  22: { tone: "anxious" },
  23: { tone: "hopeful" },
  24: { tone: "clear" },
  25: { tone: "expansive" },
  26: { tone: "hopeful" },
  27: { tone: "excited" },
  28: { tone: "clear" },
};

function StaticMoodCalendar() {
  // Feb 2026 starts on Sunday (day 0), 28 days
  const daysInMonth = 28;
  const startDayOfWeek = 0; // Sunday

  return (
    <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[var(--ink)]">
          Mood Calendar
        </h2>
        <span className="text-xs text-[var(--ink-light)]">February 2026</span>
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
          const dayData = mockCalendarDays[day];
          const bgColor = dayData
            ? (toneHexColors[dayData.tone] ?? "#e7e5e4")
            : "transparent";

          return (
            <div
              key={day}
              className="aspect-square flex items-center justify-center text-[10px] rounded-sm"
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
            </div>
          );
        })}
      </div>

      {/* Tone legend */}
      <div className="border-t border-[rgba(26,26,26,0.08)] pt-3 flex flex-wrap gap-2">
        {Object.entries(toneHexColors).map(([tone, color]) => (
          <div key={tone} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-[var(--ink-light)] capitalize">
              {tone}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Demo Page ----------

function DemoPage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="display-title font-normal text-lg text-[var(--ink)]">
              Momentum
            </h1>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold text-[var(--vermillion)] border border-[var(--vermillion)] rounded-sm">
              Demo
            </span>
          </div>
          <Link
            to="/login"
            className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
          >
            Log in
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
          This is sample data from a fictional journal. It shows what your
          dashboard could look like after consistent use.{" "}
          <Link
            to="/login"
            className="underline underline-offset-2 font-medium hover:text-amber-900 transition-colors"
          >
            Start journaling
          </Link>{" "}
          to build your own.
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">30</span>
            <span className="text-xs text-[var(--ink-light)]">day streak</span>
            {/* Grace day dots: 1 of 2 used */}
            <div
              className="flex gap-1 mt-1"
              title="1 of 2 grace days used this week"
            >
              <span className="inline-block w-2 h-2 rounded-full border border-[var(--ink)] bg-[var(--ink)]" />
              <span className="inline-block w-2 h-2 rounded-full border border-[var(--ink)] bg-transparent" />
            </div>
          </div>
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">87</span>
            <span className="text-xs text-[var(--ink-light)]">entries</span>
          </div>
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)] capitalize">
              Expansive
            </span>
            <span className="text-xs text-[var(--ink-light)]">top tone</span>
          </div>
        </div>

        {/* Writing stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">
              42,350
            </span>
            <span className="text-xs text-[var(--ink-light)]">total words</span>
          </div>
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">487</span>
            <span className="text-xs text-[var(--ink-light)]">
              avg words/entry
            </span>
          </div>
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[var(--ink)]">
              18h 32m
            </span>
            <span className="text-xs text-[var(--ink-light)]">
              writing time
            </span>
          </div>
        </div>

        {/* Alignment trend */}
        <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-[var(--ink)]">
            Alignment Trend
          </h2>
          <AlignmentChart data={mockAlignmentTrend} />
        </div>

        {/* Emotional arc */}
        <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-[var(--ink)]">
            Emotional Arc
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(mockToneCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([tone, count]) => (
                <span
                  key={tone}
                  className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-medium"
                >
                  {tone} x {count}
                </span>
              ))}
          </div>
        </div>

        {/* Mood calendar */}
        <StaticMoodCalendar />

        {/* Dimension balance */}
        <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-4">
          <h2 className="text-sm font-medium text-[var(--ink)]">
            Dimension Balance
          </h2>

          <div className="flex items-center justify-center">
            <RadarChart data={mockDimensions} />
          </div>

          {/* Dimension list */}
          <div className="flex flex-col gap-2">
            {mockDimensions.map((dim) => (
              <div
                key={dim.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="capitalize text-[var(--ink)]">{dim.name}</span>
                <span className="font-medium text-[var(--ink)]">
                  {dim.value}/10
                </span>
              </div>
            ))}
          </div>

          {/* Neglect callout */}
          {mockNeglected.length > 0 && (
            <div className="border-t border-[rgba(26,26,26,0.08)] pt-3">
              <p className="text-xs text-[var(--vermillion)]">
                Most neglected: {mockNeglected.join(", ")}
              </p>
            </div>
          )}
        </div>

        {/* Latest weekly summary */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-[var(--ink)]">
            Latest Weekly Reflection
          </h2>
          <WeeklySummaryCard summary={mockWeeklySummary} />
        </div>

        {/* Milestones */}
        <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-3">
          <h2 className="text-sm font-medium text-[var(--ink)]">Milestones</h2>
          <div className="flex flex-wrap gap-2">
            {mockMilestones.map((type) => {
              const config = milestoneConfig[type];
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full"
                >
                  {config?.icon ?? "\u2726"} {config?.title ?? type}
                </span>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <Link
          to="/login"
          className="block w-full text-center py-3 bg-[var(--vermillion)] text-white text-sm font-medium tracking-wide hover:opacity-90 transition-opacity"
        >
          Start Journaling
        </Link>

        {/* Profile link placeholder */}
        <p className="text-sm text-[var(--ink-light)] text-center">
          Define your dream life, journal daily, and let AI coach you toward it.
        </p>
      </div>
    </div>
  );
}
