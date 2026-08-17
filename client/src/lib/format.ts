/** Formatting and safe payload access, shared by every screen. */

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const isNum = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const formatCurrency = (value: unknown): string => (isNum(value) ? currency.format(value) : '-');

export const formatNumber = (value: unknown, precision = 0): string =>
  isNum(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      })
    : '-';

export const formatPercent = (value: unknown): string => (isNum(value) ? `${Math.round(value)}%` : '-');

/** Compact form for dense cells: 12,500 -> 12.5k */
export const formatCompact = (value: unknown): string => {
  if (!isNum(value)) return '-';
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return formatNumber(value, Number.isInteger(value) ? 0 : 1);
};

export const formatDate = (value: unknown): string => {
  if (typeof value !== 'string' && !(value instanceof Date)) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

export const formatDateTime = (value: unknown): string => {
  if (typeof value !== 'string' && !(value instanceof Date)) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const relativeTime = (value: unknown): string => {
  if (typeof value !== 'string' && !(value instanceof Date)) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  let delta = -Math.round((Date.now() - then) / 1000);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.34],
    ['month', 12]
  ];

  for (const [unit, size] of units) {
    if (Math.abs(delta) < size) return rtf.format(Math.round(delta), unit);
    delta /= size;
  }
  return rtf.format(Math.round(delta), 'year');
};

/**
 * Safely walks a path on an untyped API payload. Preserves `0` and `false`,
 * which a `||` fallback would wrongly discard.
 */
export function pick<T>(source: unknown, path: string, fallback: T): T {
  let current: unknown = source;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return fallback;
    current = (current as Record<string, unknown>)[key];
  }
  return (current ?? fallback) as T;
}

/**
 * Like `pick`, but guarantees an array. `pick` casts to the declared type
 * without checking it, so a payload shape change becomes `.map is not a
 * function` and blanks the page. Every list read goes through this.
 */
export function pickArray<T = unknown>(source: unknown, path: string): T[] {
  const value = pick<unknown>(source, path, []);
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Title-cases an API enum value for display: `missing_coverage` -> `Missing coverage`. */
export const humanise = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return '-';
  const spaced = value.replace(/[_-]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
