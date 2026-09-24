/**
 * Covers the Overview's reads against a realistic dashboard payload.
 *
 * Every figure here comes out of a nested path, and a path that stops matching
 * degrades to the fallback rather than throwing. That is the right behaviour
 * for a page and a terrible one for a silent regression, so these assert the
 * numbers rather than that the page rendered.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderPage, stubFetch } from '@/test/harness';
import { formatCurrency } from '@/lib/format';
import { Overview } from './Overview';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { totalPoints: 0, level: 0, username: 'john_doe' },
    refreshUser: vi.fn()
  })
}));

const DASHBOARD = {
  period: '30d',
  progression: {
    totalPoints: 6762,
    level: 7,
    levelProgress: 76,
    rank: 2,
    achievements: 3,
    activeChallenges: 2
  },
  streaks: { current: 4, longest: 14 },
  health: {
    rows: [
      {
        type: 'steps',
        label: 'Steps',
        value: 4285,
        goal: 10000,
        progress: 43,
        unit: 'steps',
        series: [3000, 5000, 4285]
      },
      {
        type: 'water',
        label: 'Water',
        value: 6,
        goal: 8,
        progress: 75,
        unit: 'glasses',
        series: [8, 7, 6]
      }
    ]
  },
  wealth: {
    month: '2026-09',
    income: 6990,
    expenses: 2936,
    net: 4054,
    series: [
      { month: '2026-08', income: 6576, expenses: 2884 },
      { month: '2026-09', income: 6990, expenses: 2936 }
    ],
    activeGoals: 1
  },
  insurance: { activePolicies: 3, totalCoverage: 585000, renewalsDueSoon: 1 }
};

afterEach(() => vi.unstubAllGlobals());

describe('Overview', () => {
  it('shows the progression figures from the payload', async () => {
    stubFetch({ '/analytics/dashboard': DASHBOARD });
    renderPage(<Overview />);

    expect(await screen.findByText('6,762')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('lists every health row it was given', async () => {
    stubFetch({ '/analytics/dashboard': DASHBOARD });
    renderPage(<Overview />);

    expect(await screen.findByText('Steps')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('shows the wealth figures as currency', async () => {
    stubFetch({ '/analytics/dashboard': DASHBOARD });
    renderPage(<Overview />);

    // Asserted through the app's own formatter: it groups by the viewer's
    // locale, so a hard-coded "585,000" passes here and fails on a machine
    // that groups in lakhs.
    expect(await screen.findByText(formatCurrency(6990))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(2936))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(4054))).toBeInTheDocument();
  });

  it('draws the net position once there is more than one month', async () => {
    stubFetch({ '/analytics/dashboard': DASHBOARD });
    renderPage(<Overview />);

    expect(await screen.findByRole('img', { name: 'Net position by month' })).toBeInTheDocument();
    expect(screen.queryByText(/Not enough history/)).not.toBeInTheDocument();
  });

  it('says so when there is only one month', async () => {
    stubFetch({
      '/analytics/dashboard': {
        ...DASHBOARD,
        wealth: { ...DASHBOARD.wealth, series: [{ month: '2026-09', income: 1, expenses: 1 }] }
      }
    });
    renderPage(<Overview />);

    expect(await screen.findByText(/Not enough history/)).toBeInTheDocument();
  });

  it('survives a payload that lost its arrays', async () => {
    // pickArray is what stops a shape change becoming ".map is not a function"
    // and a blank page. This is the case it exists for.
    stubFetch({
      '/analytics/dashboard': {
        progression: { totalPoints: 10 },
        health: { rows: null },
        wealth: { series: 'not an array' },
        insurance: {}
      }
    });
    renderPage(<Overview />);

    expect(await screen.findByText('10')).toBeInTheDocument();
    expect(screen.getByText(/Not enough history/)).toBeInTheDocument();
  });

  it('shows the insurance summary', async () => {
    stubFetch({ '/analytics/dashboard': DASHBOARD });
    renderPage(<Overview />);

    expect(await screen.findByText(formatCurrency(585000))).toBeInTheDocument();
  });
});
