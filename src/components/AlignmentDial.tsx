interface AlignmentDialProps {
  score: number;
  rationale: string;
}

function scoreColor(score: number): string {
  if (score <= 3) return "#d4a574"; // warm tan
  if (score <= 5) return "#c49a6c"; // warm amber
  if (score <= 7) return "#7ab648"; // fresh green
  return "#10b981"; // emerald
}

function scoreLabel(score: number): string {
  if (score <= 3) return "Planting seeds";
  if (score <= 5) return "Building momentum";
  if (score <= 7) return "In the flow";
  return "Deeply aligned";
}

const RADIUS = 36;
const STROKE_WIDTH = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AlignmentDial({ score, rationale }: AlignmentDialProps) {
  const progress = (score / 10) * CIRCUMFERENCE;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 80 80" width={80} height={80} className="block">
        {/* Background circle */}
        <circle
          cx={40}
          cy={40}
          r={RADIUS}
          fill="none"
          stroke="rgba(26,26,26,0.1)"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Progress circle */}
        <circle
          cx={40}
          cy={40}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${progress} ${CIRCUMFERENCE - progress}`}
          strokeDashoffset={CIRCUMFERENCE / 4}
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray 0.6s ease-in-out",
          }}
        />
        {/* Score number */}
        <text
          x={40}
          y={38}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xl font-bold"
          fill="currentColor"
          fontSize={24}
        >
          {score}
        </text>
        {/* Label */}
        <text
          x={40}
          y={52}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--ink-light)"
          fontSize={10}
        >
          {scoreLabel(score)}
        </text>
      </svg>
      <p className="text-base text-[var(--ink-light)] text-center max-w-xs">{rationale}</p>
    </div>
  );
}
