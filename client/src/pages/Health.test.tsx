/**
 * Covers the Health page's reads and the metric table it builds from them.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderPage, stubFetch } from '@/test/harness';
import { Health } from './Health';

const SUMMARY = {
  rows: [
    {
      type: 'steps',
      label: 'Steps',
      value: 4285,
      goal: 10000,
      progress: 43,
      unit: 'steps',
      cadence: 'per day',
      entries: 1,
      series: [3000, 5000, 4285]
    },
    {
      type: 'weight',
      label: 'Weight',
      value: 75.1,
      goal: 72,
      progress: null,
      unit: 'kg',
      cadence: 'per day',
      entries: 0,
      series: [76, 75.5, 75.1]
    }
  ],
  streaks: { current: 4, longest: 14 },
  totalEntries: 34,
  goalsMet: 1
};

const ACTIVITIES = {
  entries: [
    { _id: 'a1', type: 'steps', value: 4285.4, unit: 'steps', pointsEarned: 20, at: '2026-09-24T11:42:00.000Z' },
    { _id: 'a2', type: 'water', value: 6, unit: 'glasses', pointsEarned: 12, at: '2026-09-24T11:42:00.000Z' }
  ]
};

const ROUTES = {
  '/health/summary': SUMMARY,
  '/health/activities': ACTIVITIES,
  '/health/metrics': { metrics: [{ type: 'steps', label: 'Steps', unit: 'steps' }] }
};

afterEach(() => vi.unstubAllGlobals());

describe('Health', () => {
  it('lists every metric row', async () => {
    stubFetch(ROUTES);
    renderPage(<Health />);

    // "Steps" is also an option in the log form's metric select, so the row
    // is found through the table rather than by text alone.
    const table = await screen.findByRole('table', { name: 'Health metrics' });
    expect(within(table).getByText('Steps')).toBeInTheDocument();
    expect(within(table).getByText('Weight')).toBeInTheDocument();
  });

  it('shows the streak figures', async () => {
    stubFetch(ROUTES);
    renderPage(<Health />);

    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('shows n/a rather than a percentage for a metric with no progress', async () => {
    stubFetch(ROUTES);
    renderPage(<Health />);

    // Weight is a reading against a target, not a quantity to accumulate, so
    // "43% of the way to 72kg" would be meaningless.
    expect(await screen.findByText('n/a')).toBeInTheDocument();
  });

  it('lists the recent entries', async () => {
    stubFetch(ROUTES);
    renderPage(<Health />);

    expect(await screen.findByText('20')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('degrades rather than throwing when the rows are missing', async () => {
    stubFetch({
      '/health/summary': { rows: undefined, streaks: {} },
      '/health/activities': { entries: null },
      '/health/metrics': {}
    });
    renderPage(<Health />);

    // "Metrics" is both a stat label and a panel title.
    expect((await screen.findAllByText('Metrics')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Weight')).not.toBeInTheDocument();
  });
});
