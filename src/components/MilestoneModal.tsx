import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { milestoneConfig } from "../lib/milestoneConfig";

export function MilestoneModal() {
  const unseen = useQuery(api.milestones.unseenMilestones);
  const markSeen = useMutation(api.milestones.markMilestoneSeen);

  if (!unseen || unseen.length === 0) return null;

  const milestone = unseen[0];
  const config = milestoneConfig[milestone.type] ?? {
    icon: "\u2726",
    title: milestone.type.replace(/_/g, " "),
    description: "",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-[var(--paper)] border border-[rgba(26,26,26,0.12)] p-8 max-w-sm mx-4 flex flex-col items-center gap-4 text-center shadow-lg">
        <span className="text-4xl">{config.icon}</span>
        <h2 className="display-title text-xl font-normal text-[var(--ink)]">{config.title}</h2>
        <p className="text-base text-[var(--ink-light)]">{config.description}</p>
        {milestone.aiMessage && (
          <p className="text-base text-[var(--ink)] italic border-l-2 border-[var(--vermillion)] pl-3 text-left">
            {milestone.aiMessage}
          </p>
        )}
        <button
          onClick={() => markSeen({ milestoneId: milestone._id as any })}
          className="ink-cta py-2 px-6 text-base mt-2"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
