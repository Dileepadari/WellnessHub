import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  /** Secondary figure shown after the value, e.g. "/ 12,500". */
  suffix?: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}

const TONE: Record<NonNullable<StatProps['tone']>, string> = {
  default: '',
  good: 'text-good',
  warn: 'text-warn',
  bad: 'text-bad'
};

/**
 * A figure in a header strip. Deliberately not a card - it sits in a row
 * divided by hairlines, so a group of them reads as one instrument panel.
 */
export function Stat({ label, value, suffix, hint, tone = 'default' }: StatProps) {
  return (
    <div className="px-3 py-2 min-w-0">
      <div className="micro truncate">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={`mono tnum text-[17px] leading-none font-medium ${TONE[tone]}`}>{value}</span>
        {suffix && <span className="mono tnum text-[11px] text-fg-subtle">{suffix}</span>}
      </div>
      {hint && <div className="text-[11px] text-fg-subtle mt-1 truncate">{hint}</div>}
    </div>
  );
}

/** Lays Stats out in a row with hairline dividers between them. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="panel grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 [&>*]:border-line">
      {children}
    </div>
  );
}
