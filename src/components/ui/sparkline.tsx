// docs/DESIGN.md §Components · Sparkline. 36px tall, 2px stroke, no axes,
// no fill. Teal by default; accent when the trend is the problem.
export function Sparkline({
  values,
  tone = "teal",
  width = 120,
  height = 36,
  label,
}: {
  values: number[];
  tone?: "teal" | "accent";
  width?: number;
  height?: number;
  /** Text alternative, e.g. "Views up 12% over 7 days". Required for a11y. */
  label: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pad = 2;
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(pad + (height - pad * 2) * (1 - (v - min) / span)).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={tone === "accent" ? "text-accent" : "text-teal"}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
