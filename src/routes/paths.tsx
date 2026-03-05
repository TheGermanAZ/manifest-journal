import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthGuard } from "../components/AuthGuard";
import { PathCard } from "../components/PathCard";

export const Route = createFileRoute("/paths")({
  component: () => (
    <AuthGuard>
      <PathsPage />
    </AuthGuard>
  ),
});

function PathsPage() {
  const paths = useQuery(api.paths.listPaths);
  const activePath = useQuery(api.paths.getActivePath);
  const startPath = useMutation(api.paths.startPath);
  const abandonPath = useMutation(api.paths.abandonPath);
  const navigate = useNavigate();

  const hasActive = !!activePath;

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="display-title font-normal text-xl text-[var(--ink)]">
            Guided Paths
          </h1>
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-sm text-[var(--ink-light)] px-3 py-1.5 border border-[rgba(26,26,26,0.15)] bg-transparent hover:border-[var(--ink)] transition-colors"
          >
            Journal
          </button>
        </div>

        {activePath && (
          <div className="bg-[rgba(255,255,255,0.5)] border border-[var(--vermillion)] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-[var(--ink)]">
                Active: {activePath.path.name}
              </span>
              <span className="text-sm text-[var(--ink-light)]">
                Day {activePath.progress.currentDay}/{activePath.path.duration}
              </span>
            </div>
            <div className="h-1 bg-[rgba(26,26,26,0.08)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--vermillion)]"
                style={{
                  width: `${((activePath.progress.currentDay - 1) / activePath.path.duration) * 100}%`,
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate({ to: "/" })}
                className="ink-cta py-1.5 px-4 text-sm"
              >
                Continue journaling
              </button>
              <button
                onClick={() =>
                  abandonPath({
                    progressId: activePath.progress._id as any,
                  })
                }
                className="text-sm text-[var(--ink-light)] hover:text-[var(--vermillion)]"
              >
                Abandon path
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {paths === undefined ? (
            <div className="animate-pulse text-[var(--ink-light)] text-base text-center py-8">
              Loading...
            </div>
          ) : paths.length === 0 ? (
            <p className="text-[var(--ink-light)] text-base text-center py-8">
              No paths available yet.
            </p>
          ) : (
            paths.map((path) => (
              <PathCard
                key={path._id}
                path={path}
                onStart={(id) => startPath({ pathId: id as any })}
                disabled={hasActive}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
