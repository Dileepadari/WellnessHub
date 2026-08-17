import { useId } from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Draws a dashed rule at this value, used to show a goal. */
  reference?: number | null;
  tone?: 'accent' | 'good' | 'warn' | 'bad' | 'muted';
  /** Fills the area under the line. Off by default to keep rows quiet. */
  filled?: boolean;
  label?: string;
}

const TONE_VAR: Record<NonNullable<SparklineProps['tone']>, string> = {
  accent: 'var(--accent)',
  good: 'var(--good)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
  muted: 'var(--fg-subtle)'
};

/**
 * An inline SVG sparkline sized to sit inside a table cell.
 *
 * The y-axis spans the series' own min..max rather than starting at zero, so
 * variation stays visible even when values are large and close together. The
 * reference rule is included in that range so a goal line is never clipped.
 */
export function Sparkline({
  values,
  width = 96,
  height = 20,
  reference = null,
  tone = 'accent',
  filled = false,
  label
}: SparklineProps) {
  const gradientId = useId();

  if (values.length === 0) {
    return <span className="text-fg-subtle text-[11px]">no data</span>;
  }

  const stroke = `hsl(${TONE_VAR[tone]})`;
  const candidates = reference === null ? values : [...values, reference];
  const min = Math.min(...candidates);
  const max = Math.max(...candidates);
  // A flat series would divide by zero; give it a nominal range so it draws mid-height.
  const range = max - min || 1;

  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const toY = (value: number) => height - ((value - min) / range) * (height - 2) - 1;

  const points = values.map((value, i) => `${(i * stepX).toFixed(2)},${toY(value).toFixed(2)}`);
  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    /*
     * `width` sets the drawing basis, but `max-w-full` lets the SVG shrink below
     * it on a narrow screen. Without that, a 1200px-wide chart forces the whole
     * page wider than a phone viewport.
     */
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible max-w-full"
      role="img"
      aria-label={label ?? `Trend across ${values.length} days`}
      preserveAspectRatio="none"
    >
      {filled && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
        </>
      )}

      {reference !== null && (
        <line
          x1="0"
          x2={width}
          y1={toY(reference)}
          y2={toY(reference)}
          stroke="hsl(var(--fg-subtle))"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.7"
        />
      )}

      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx={(values.length - 1) * stepX} cy={toY(values.at(-1) as number)} r="1.75" fill={stroke} />
    </svg>
  );
}
