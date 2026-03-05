import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { AlignmentDial } from "../components/AlignmentDial";
import { InsightCard } from "../components/InsightCard";
import { BookmarkToggle } from "../components/BookmarkToggle";
import { MilestoneModal } from "../components/MilestoneModal";
import { ShareDialog } from "../components/ShareDialog";

export const Route = createFileRoute("/response/$entryId")({
  component: () => (
    <AuthGuard>
      <ResponsePage />
    </AuthGuard>
  ),
});

function ResponsePage() {
  const { entryId } = Route.useParams();
  const entry = useQuery(api.entries.getEntry, { entryId: entryId as any });
  const navigate = useNavigate();
  const [showShare, setShowShare] = useState(false);

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--ink-light)] text-sm">
          Loading your analysis...
        </div>
      </div>
    );
  }

  const { analysis } = entry;

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--ink-light)] text-sm">
          Analyzing your entry...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[var(--ink-light)] uppercase tracking-wide">
              Your coach says
            </p>
            <h1 className="display-title text-lg font-normal text-[var(--ink)]">
              Today's reflection
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShare(true)}
              className="text-xs text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
            >
              Share
            </button>
            <BookmarkToggle
              entryId={entry._id}
              bookmarked={!!entry.bookmarked}
            />
          </div>
        </div>

        {entry.content && (
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-5">
            <p className="text-xs font-semibold text-[var(--ink-light)] uppercase tracking-wide mb-3">
              Your Entry
            </p>
            <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
              {entry.content}
            </p>
            {entry.wordCount != null && (
              <p className="text-xs text-[var(--ink-light)] mt-3">
                {entry.wordCount} words
              </p>
            )}
          </div>
        )}

        <InsightCard
          type="pattern"
          title="Pattern Insight"
          content={analysis.patternInsight}
        />
        <InsightCard type="nudge" title="Nudge" content={analysis.nudge} />
        <InsightCard
          type="tone"
          title="Emotional Tone"
          content={`Your entry reads as ${analysis.emotionalTone}.`}
          badge={analysis.emotionalTone}
        />

        <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-6">
          <p className="text-xs font-semibold text-[var(--ink-light)] uppercase tracking-wide mb-4 text-center">
            Alignment Pulse
          </p>
          <AlignmentDial
            score={analysis.alignmentScore}
            rationale={analysis.alignmentRationale}
          />
        </div>

        {/* Dimension pills */}
        {analysis.dimensions && analysis.dimensions.length > 0 && (
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-[var(--ink-light)] uppercase tracking-wide">
              Life Dimensions
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.dimensions.map((dim) => (
                <span
                  key={dim.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-xs"
                >
                  <span className="capitalize text-[var(--ink)]">
                    {dim.name}
                  </span>
                  <span className="font-medium text-[var(--vermillion)]">
                    {dim.alignmentScore}/10
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dimension prompt */}
        {analysis.dimensionPrompt && (
          <InsightCard
            type="nudge"
            title="Neglected Dimension"
            content={analysis.dimensionPrompt}
          />
        )}

        {analysis.breakthroughScore != null &&
          analysis.breakthroughScore >= 7 && (
            <div className="bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700">
                Breakthrough
              </span>
              <p className="text-sm text-amber-800">
                This entry represents a significant shift in self-awareness or
                action.
              </p>
            </div>
          )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex-1 border border-[rgba(26,26,26,0.15)] bg-transparent text-[var(--ink)] text-sm font-medium py-3 hover:border-[var(--ink)] transition-colors"
          >
            Done for today
          </button>
          <button
            onClick={() => navigate({ to: "/" })}
            className="ink-cta flex-1 py-3 text-center"
          >
            Keep writing
          </button>
        </div>
      </div>

      <MilestoneModal />

      {showShare && (
        <ShareDialog
          onClose={() => setShowShare(false)}
          variants={[
            {
              variant: "alignment",
              data: { alignmentScore: analysis.alignmentScore },
            },
            {
              variant: "tone",
              data: { tone: analysis.emotionalTone },
            },
          ]}
        />
      )}
    </div>
  );
}
