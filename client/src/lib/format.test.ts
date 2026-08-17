import { describe, expect, it } from 'vitest';
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  humanise,
  pick,
  pickArray
} from './format';

describe('formatNumber', () => {
  it('formats with separators and the requested precision', () => {
    expect(formatNumber(12345)).toBe((12345).toLocaleString());
    expect(formatNumber(6.44, 1)).toBe((6.4).toLocaleString(undefined, { minimumFractionDigits: 1 }));
  });

  it.each([[undefined], [null], ['abc'], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'returns a dash for %s',
    (input) => {
      expect(formatNumber(input)).toBe('-');
    }
  );
});

describe('formatCompact', () => {
  it('abbreviates thousands', () => {
    expect(formatCompact(12500)).toBe('12.5k');
    expect(formatCompact(3000)).toBe('3k');
  });

  it('leaves small numbers alone', () => {
    expect(formatCompact(42)).toBe('42');
  });
});

describe('formatCurrency / formatPercent / formatDate', () => {
  it('formats currency', () => {
    expect(formatCurrency(1000)).toContain('1,000');
  });

  it('rounds percentages', () => {
    expect(formatPercent(42.6)).toBe('43%');
  });

  it('formats a date and rejects nonsense', () => {
    expect(formatDate('2024-03-15T00:00:00.000Z')).toMatch(/\d/);
    expect(formatDate('not-a-date')).toBe('-');
    expect(formatDate(42)).toBe('-');
  });
});

describe('humanise', () => {
  it('title-cases an API enum value', () => {
    expect(humanise('missing_coverage')).toBe('Missing coverage');
    expect(humanise('semi-annual')).toBe('Semi annual');
  });

  it('returns a dash for a non-string', () => {
    expect(humanise(undefined)).toBe('-');
  });
});

describe('pick', () => {
  const payload = {
    data: { stats: { steps: { today: 8247 }, zero: 0, flag: false }, list: [1, 2, 3] }
  };

  it('reads a nested value', () => {
    expect(pick(payload, 'data.stats.steps.today', 0)).toBe(8247);
  });

  it('falls back when the path is missing or the source is not an object', () => {
    expect(pick(payload, 'data.stats.missing.deep', 'fb')).toBe('fb');
    expect(pick(null, 'a.b', 'fb')).toBe('fb');
    expect(pick('string', 'a.b', 'fb')).toBe('fb');
  });

  // 0 and false are real values a `||` fallback would wrongly discard.
  it('preserves falsy values that are not nullish', () => {
    expect(pick(payload, 'data.stats.zero', 99)).toBe(0);
    expect(pick(payload, 'data.stats.flag', true)).toBe(false);
  });
});

describe('pickArray', () => {
  it('returns the array at the path', () => {
    expect(pickArray({ data: { rows: [1, 2] } }, 'data.rows')).toEqual([1, 2]);
  });

  // The whole point: a payload shape change must not throw `.map is not a function`.
  it('returns an empty array when the value is not an array', () => {
    expect(pickArray({ data: { rows: { nested: true } } }, 'data.rows')).toEqual([]);
    expect(pickArray({ data: { rows: 'oops' } }, 'data.rows')).toEqual([]);
    expect(pickArray(null, 'data.rows')).toEqual([]);
  });
});
