import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { AlignmentDial } from "../components/AlignmentDial";
import { InsightCard } from "../components/InsightCard";

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
        <div>
          <p className="text-xs text-[var(--ink-light)] uppercase tracking-wide">
            Your coach says
          </p>
          <h1 className="display-title text-lg font-normal text-[var(--ink)]">
            Today's reflection
          </h1>
        </div>

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
    </div>
  );
}
