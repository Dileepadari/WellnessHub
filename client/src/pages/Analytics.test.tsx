/**
 * Covers the figures Analytics derives in the browser rather than reading.
 *
 * Most pages only unpack what the API computed. This one sums, filters and
 * reduces the daily series itself, so the arithmetic is worth pinning down.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, stubFetch } from '@/test/harness';
import { Analytics } from './Analytics';

const TRENDS = {
  dailyPoints: [
    { day: '2026-09-20', points: 40, entries: 2 },
    { day: '2026-09-21', points: 0, entries: 0 },
    { day: '2026-09-22', points: 125, entries: 5 },
    { day: '2026-09-23', points: 35, entries: 1 }
  ],
  metrics: [
    {
      type: 'steps',
      label: 'Steps',
      unit: 'steps',
      series: [
        { day: '2026-09-20', value: 4000 },
        { day: '2026-09-21', value: 9000 }
      ]
    }
  ]
};

const STATS = { totalPoints: 6762, level: 7, currentStreak: 4, longestStreak: 14 };

const ROUTES = { '/analytics/trends': TRENDS, '/users/stats': STATS };

afterEach(() => vi.unstubAllGlobals());

describe('Analytics', () => {
  it('totals the points across the period', async () => {
    stubFetch(ROUTES);
    renderPage(<Analytics />);

    // 40 + 0 + 125 + 35
    expect(await screen.findByText('200')).toBeInTheDocument();
  });

  it('totals the entries across the period', async () => {
    stubFetch(ROUTES);
    renderPage(<Analytics />);

    // 2 + 0 + 5 + 1
    expect(await screen.findByText('8')).toBeInTheDocument();
  });

  it('counts consistency as days with any entry, not days with points', async () => {
    stubFetch(ROUTES);
    renderPage(<Analytics />);

    // 3 of 4 days have an entry.
    expect(await screen.findByText('75%')).toBeInTheDocument();
  });

  it('picks the best day by points', async () => {
    stubFetch(ROUTES);
    renderPage(<Analytics />);

    expect(await screen.findByText('125')).toBeInTheDocument();
  });

  it('holds at zero rather than dividing by an empty series', async () => {
    stubFetch({ '/analytics/trends': { dailyPoints: [], metrics: [] }, '/users/stats': STATS });
    renderPage(<Analytics />);

    // activeDays / dailyPoints.length is 0/0 without the guard, which renders NaN%.
    expect(await screen.findByText('0%')).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('refetches when the period changes', async () => {
    const fetchStub = stubFetch(ROUTES);
    const user = userEvent.setup();
    renderPage(<Analytics />);

    await screen.findByText('200');
    const before = fetchStub.mock.calls.length;

    await user.selectOptions(screen.getByRole('combobox'), '7d');

    expect(fetchStub.mock.calls.length).toBeGreaterThan(before);
    expect(
      fetchStub.mock.calls.some(([url]) => String(url).includes('period=7d'))
    ).toBe(true);
  });
});
