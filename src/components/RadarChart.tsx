interface RadarChartProps {
  data: Array<{ name: string; value: number }>; // value 0-10
  size?: number;
}

export function RadarChart({ data, size = 200 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38; // leave room for labels
  const sides = data.length || 5;
  const angleStep = (2 * Math.PI) / sides;
  // Start from top (-PI/2)
  const startAngle = -Math.PI / 2;

  function getPoint(index: number, scale: number) {
    const angle = startAngle + index * angleStep;
    return {
      x: cx + radius * scale * Math.cos(angle),
      y: cy + radius * scale * Math.sin(angle),
    };
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Build grid polygons
  const gridPolygons = rings.map((ring) => {
    const points = Array.from({ length: sides }, (_, i) => {
      const p = getPoint(i, ring);
      return `${p.x},${p.y}`;
    }).join(" ");
    return points;
  });

  // Axis lines from center to each vertex
  const axisLines = Array.from({ length: sides }, (_, i) => getPoint(i, 1));

  // Data polygon
  const dataPoints = data.map((d, i) => {
    const scale = Math.max(0, Math.min(10, d.value)) / 10;
    const p = getPoint(i, scale);
    return `${p.x},${p.y}`;
  });

  // Label positions (slightly beyond the outer ring)
  const labelPositions = data.map((d, i) => {
    const p = getPoint(i, 1.25);
    return { ...p, name: d.name };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      {/* Grid rings */}
      {gridPolygons.map((points, i) => (
        <polygon
          key={`ring-${i}`}
          points={points}
          fill="none"
          stroke="var(--ink-light, #999)"
          strokeWidth={0.5}
          opacity={0.3}
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((p, i) => (
        <line
          key={`axis-${i}`}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="var(--ink-light, #999)"
          strokeWidth={0.5}
          opacity={0.2}
        />
      ))}

      {/* Data polygon */}
      {data.length > 0 && (
        <>
          <polygon
            points={dataPoints.join(" ")}
            fill="var(--vermillion, #E84D2F)"
            fillOpacity={0.15}
            stroke="var(--vermillion, #E84D2F)"
            strokeWidth={1.5}
          />
          {/* Data points */}
          {data.map((d, i) => {
            const scale = Math.max(0, Math.min(10, d.value)) / 10;
            const p = getPoint(i, scale);
            return (
              <circle
                key={`dot-${i}`}
                cx={p.x}
                cy={p.y}
                r={2.5}
                fill="var(--vermillion, #E84D2F)"
              />
            );
          })}
        </>
      )}

      {/* Labels */}
      {labelPositions.map((lp, i) => (
        <text
          key={`label-${i}`}
          x={lp.x}
          y={lp.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[var(--ink-light)] text-xs capitalize"
        >
          {lp.name}
        </text>
      ))}
    </svg>
  );
}
