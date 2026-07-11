/**
 * Momentum rendered as growth rings — seichō (成長) means growth.
 * Three concentric arcs fill in as momentum (0–100) rises.
 */
export function GrowthRing({
  score,
  size = 34,
}: {
  score: number;
  size?: number;
}) {
  const rings = [
    { r: 6, threshold: 0 },
    { r: 10, threshold: 34 },
    { r: 14, threshold: 67 },
  ];
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={`Momentum ${clamped} of 100`}
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="2" fill="var(--color-moss)" />
      {rings.map(({ r, threshold }) => {
        const span = 33; // each ring covers ~a third of the scale
        const fill = Math.max(0, Math.min(1, (clamped - threshold) / span));
        const c = 2 * Math.PI * r;
        return (
          <g key={r}>
            <circle
              cx="16"
              cy="16"
              r={r}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="1.5"
            />
            {fill > 0 && (
              <circle
                cx="16"
                cy="16"
                r={r}
                fill="none"
                stroke="var(--color-moss)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray={`${c * fill} ${c}`}
                transform="rotate(-90 16 16)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
