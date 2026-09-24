/**
 * Covers the Community page: feed, leaderboard and teams.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderPage, stubFetch } from '@/test/harness';
import { Community } from './Community';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1', username: 'john_doe', totalPoints: 6762, level: 7 } })
}));

const ROUTES = {
  '/community/feed': [
    {
      _id: 'f1',
      type: 'milestone',
      username: 'jane_smith',
      data: { message: 'Hit a 14 day logging streak' },
      timestamp: '2026-09-24T10:00:00.000Z'
    }
  ],
  '/community/leaderboard': {
    leaderboard: [
      { _id: 'u0', username: 'admin', level: 8, totalPoints: 7400 },
      { _id: 'u1', username: 'john_doe', level: 7, totalPoints: 6762 }
    ]
  },
  // GET /community/teams returns the array as `data` directly, not wrapped.
  '/community/teams': [
    {
      _id: 't1',
      name: 'Wellness Warriors',
      description: 'Complete wellness across all categories',
      category: 'mixed',
      memberCount: 4,
      maxMembers: 50,
      stats: { totalPoints: 0 }
    }
  ]
};

afterEach(() => vi.unstubAllGlobals());

describe('Community', () => {
  it('shows the feed items', async () => {
    stubFetch(ROUTES);
    renderPage(<Community />);

    expect(await screen.findByText('Hit a 14 day logging streak')).toBeInTheDocument();
  });

  it('ranks the leaderboard and marks the signed-in user', async () => {
    stubFetch(ROUTES);
    renderPage(<Community />);

    const table = await screen.findByRole('table', { name: 'Leaderboard' });
    expect(within(table).getByText('admin')).toBeInTheDocument();
    expect(within(table).getByText('john_doe')).toBeInTheDocument();
    expect(within(table).getByText(/you/i)).toBeInTheDocument();
  });

  it('lists teams', async () => {
    stubFetch(ROUTES);
    renderPage(<Community />);

    expect(await screen.findByText('Wellness Warriors')).toBeInTheDocument();
  });

  it('says so when the feed is empty', async () => {
    stubFetch({ ...ROUTES, '/community/feed': [] });
    renderPage(<Community />);

    expect(await screen.findByText(/Quiet in here/i)).toBeInTheDocument();
  });

  it('degrades rather than throwing on a shape change', async () => {
    stubFetch({
      '/community/feed': { nope: true },
      '/community/leaderboard': { leaderboard: null },
      '/community/teams': { not: 'an array' }
    });
    renderPage(<Community />);

    expect(await screen.findByText(/Quiet in here/i)).toBeInTheDocument();
  });
});
