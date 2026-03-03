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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400 text-sm">
          Loading your analysis...
        </div>
      </div>
    );
  }

  const { analysis } = entry;

  if (!analysis) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-pulse text-stone-400 text-sm">
          Analyzing your entry...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide">
            Your coach says
          </p>
          <h1 className="text-lg font-semibold text-stone-900">
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

        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4 text-center">
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
            className="flex-1 border border-stone-200 bg-white text-stone-700 text-sm font-medium py-3 rounded-xl hover:border-stone-400"
          >
            Done for today
          </button>
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex-1 bg-stone-900 text-white text-sm font-medium py-3 rounded-xl hover:bg-stone-800"
          >
            Keep writing
          </button>
        </div>
      </div>
    </div>
  );
}
