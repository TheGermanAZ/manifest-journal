import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useAction } from "convex/react";
import { useEffect, useState, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { AlignmentDial } from "../components/AlignmentDial";
import { InsightCard } from "../components/InsightCard";
import { BookmarkToggle } from "../components/BookmarkToggle";
import { MilestoneModal } from "../components/MilestoneModal";
import { ShareDialog } from "../components/ShareDialog";
import { AuthGuard } from "../components/AuthGuard";

const ANALYSIS_STALL_MS = 30_000;
const ENTRY_LOAD_TIMEOUT_MS = 5_000;

export const Route = createFileRoute("/response/$entryId")({
  component: () => (
    <AuthGuard>
      <ResponsePage />
    </AuthGuard>
  ),
});

function ResponsePage() {
  const { entryId } = Route.useParams();
  const navigate = useNavigate();
  const [showShare, setShowShare] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [waitingTooLong, setWaitingTooLong] = useState(false);
  const [entryLoadTimedOut, setEntryLoadTimedOut] = useState(false);
  const retryAnalysis = useAction(api.ai.retryAnalysis);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entry = useQuery(
    api.entries.getEntry,
    { entryId: entryId as any },
  );
  const turns = useQuery(
    api.conversations.getTurns,
    { entryId: entryId as any },
  );

  // Detect if analysis is taking too long
  useEffect(() => {
    if (waitTimerRef.current) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }

    if (!entry || entry.analysis) {
      setWaitingTooLong(false);
      return;
    }

    const ageMs = Date.now() - entry._creationTime;
    if (ageMs >= ANALYSIS_STALL_MS) {
      setWaitingTooLong(true);
      return;
    }

    waitTimerRef.current = setTimeout(
      () => setWaitingTooLong(true),
      ANALYSIS_STALL_MS - ageMs,
    );

    return () => {
      if (waitTimerRef.current) {
        clearTimeout(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, [entry?._creationTime, entry?._id, entry?.analysis]);

  useEffect(() => {
    if (entryLoadTimerRef.current) {
      clearTimeout(entryLoadTimerRef.current);
      entryLoadTimerRef.current = null;
    }

    if (entry !== undefined) {
      setEntryLoadTimedOut(false);
      return;
    }

    entryLoadTimerRef.current = setTimeout(
      () => setEntryLoadTimedOut(true),
      ENTRY_LOAD_TIMEOUT_MS,
    );

    return () => {
      if (entryLoadTimerRef.current) {
        clearTimeout(entryLoadTimerRef.current);
        entryLoadTimerRef.current = null;
      }
    };
  }, [entry]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setWaitingTooLong(false);
    try {
      await retryAnalysis({ entryId: entryId as any });
    } catch (err) {
      console.error("[retryAnalysis]", err);
      setWaitingTooLong(true);
    } finally {
      setIsRetrying(false);
    }
  };

  const continueWith = (prompt: string) => {
    navigate({ to: "/", search: { prompt } });
  };

  if (entry === undefined) {
    if (entryLoadTimedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center flex flex-col items-center gap-4">
            <p className="text-base text-[var(--ink)]">
              This reflection is taking too long to load.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="ink-cta px-6 py-2"
            >
              Reload
            </button>
            <button
              onClick={() => navigate({ to: "/" })}
              className="text-sm text-[var(--ink-light)] hover:text-[var(--ink)] transition-colors"
            >
              Back to journal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--ink-light)] text-base">
          Loading your analysis...
        </div>
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="display-title text-2xl font-normal text-[var(--ink)]">
            Entry not found
          </h1>
          <p className="mt-2 text-base text-[var(--ink-light)]">
            This reflection is unavailable or you do not have access to it.
          </p>
        </div>
      </div>
    );
  }

  const { analysis } = entry;

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center flex flex-col items-center gap-4">
          {waitingTooLong ? (
            <>
              <p className="text-base text-[var(--ink)]">
                Analysis is taking longer than expected.
              </p>
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="ink-cta px-6 py-2 disabled:opacity-50"
              >
                {isRetrying ? "Retrying..." : "Retry analysis"}
              </button>
              <button
                onClick={() => navigate({ to: "/" })}
                className="text-sm text-[var(--ink-light)] hover:text-[var(--ink)] transition-colors"
              >
                Back to journal
              </button>
            </>
          ) : (
            <div className="animate-pulse text-[var(--ink-light)] text-base">
              Analyzing your entry...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--ink-light)] uppercase tracking-wide">
              Your coach says
            </p>
            <h1 className="display-title text-xl font-normal text-[var(--ink)]">
              Today's reflection
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShare(true)}
              className="text-sm text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
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
            <p className="text-sm font-semibold text-[var(--ink-light)] uppercase tracking-wide mb-3">
              Your Entry
            </p>
            <p className="text-base text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
              {entry.content}
            </p>
            {entry.wordCount != null && (
              <p className="text-sm text-[var(--ink-light)] mt-3">
                {entry.wordCount} words
              </p>
            )}
          </div>
        )}

        {entry.mode === "conversational" && turns && turns.length > 0 && (
          <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-5">
            <p className="text-sm font-semibold text-[var(--ink-light)] uppercase tracking-wide mb-4">
              Conversation
            </p>
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={`text-base leading-relaxed whitespace-pre-wrap ${
                    turn.role === "user"
                      ? "text-[var(--ink)] pl-0"
                      : "text-[var(--ink-light)] pl-4 border-l-2 border-[rgba(26,26,26,0.08)]"
                  }`}
                >
                  <span className="text-sm uppercase tracking-wide font-medium block mb-1">
                    {turn.role === "user" ? "You" : "Coach"}
                  </span>
                  {turn.content}
                </div>
              ))}
            </div>
          </div>
        )}

        <InsightCard
          type="pattern"
          title="Pattern Insight"
          content={analysis.patternInsight}
          onContinue={continueWith}
        />
        <InsightCard type="nudge" title="Nudge" content={analysis.nudge} onContinue={continueWith} />
        <InsightCard
          type="tone"
          title="Emotional Tone"
          content={`Your entry reads as ${analysis.emotionalTone}.`}
          badge={analysis.emotionalTone}
        />

        <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(26,26,26,0.12)] p-6">
          <p className="text-sm font-semibold text-[var(--ink-light)] uppercase tracking-wide mb-4 text-center">
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
            <p className="text-sm font-semibold text-[var(--ink-light)] uppercase tracking-wide">
              Life Dimensions
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.dimensions.map((dim) => (
                <span
                  key={dim.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-sm"
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
            onContinue={continueWith}
          />
        )}

        {analysis.breakthroughScore != null &&
          analysis.breakthroughScore >= 7 && (
            <div className="bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium bg-amber-100 text-amber-700">
                Breakthrough
              </span>
              <p className="text-base text-amber-800">
                This entry represents a significant shift in self-awareness or
                action.
              </p>
            </div>
          )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex-1 border border-[rgba(26,26,26,0.15)] bg-transparent text-[var(--ink)] text-base font-medium py-3 hover:border-[var(--ink)] transition-colors"
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
