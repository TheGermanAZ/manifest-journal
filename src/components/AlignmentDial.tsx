interface AlignmentDialProps {
  score: number;
  rationale: string;
}

function scoreColor(score: number): string {
  if (score <= 2) return "#ef4444"; // red-500
  if (score === 3) return "#f97316"; // orange-500
  if (score <= 5) return "#eab308"; // yellow-500
  if (score <= 7) return "#22c55e"; // green-500
  return "#10b981"; // emerald-500
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
          stroke="#e7e5e4"
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
          className="text-lg font-bold"
          fill="currentColor"
          fontSize={18}
        >
          {score}
        </text>
        {/* "out of 10" label */}
        <text
          x={40}
          y={52}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#a8a29e"
          fontSize={7}
        >
          out of 10
        </text>
      </svg>
      <p className="text-sm text-stone-500 text-center max-w-xs">{rationale}</p>
    </div>
  );
}
