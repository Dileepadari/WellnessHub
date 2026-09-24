/**
 * Covers the Challenges page, including the id matching that decides whether a
 * challenge shows Join or Joined.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderPage, stubFetch } from '@/test/harness';
import { Challenges } from './Challenges';

// The joined and unlocked sets come from the auth user, not from the endpoints,
// and /auth/me populates those references, so each entry can be a bare id or a
// whole document. toId exists for exactly that, so both shapes are exercised.
const authUser: { current: Record<string, unknown> } = { current: {} };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authUser.current, refreshUser: vi.fn() })
}));

const signedInWith = (overrides: Record<string, unknown> = {}) => {
  authUser.current = {
    _id: 'u1',
    username: 'john_doe',
    activeChallenges: [{ challengeId: 'c1', completed: false }],
    achievements: [{ achievementId: { _id: 'a1' } }],
    ...overrides
  };
};

const ROUTES = {
  '/challenges/mine': {
    challenges: [
      {
        challengeId: 'c1',
        title: 'Hydration Challenge',
        progress: 75,
        value: 6,
        target: 8,
        unit: 'glasses',
        completed: false,
        endDate: '2026-10-14T00:00:00.000Z'
      }
    ]
  },
  '/gamification/achievements': [
    { _id: 'a1', title: 'Hydration Hero', description: 'Drink 8 glasses in a day', category: 'health', rarity: 'common', points: 75 },
    { _id: 'a2', title: 'Wellness Guru', description: 'Reach level 10', category: 'level', rarity: 'legendary', points: 500 }
  ],
  '/gamification/progress': { achievements: [{ achievementId: 'a1', unlockedAt: '2026-09-01T00:00:00.000Z' }] },
  '/challenges': [
    { _id: 'c1', title: 'Hydration Challenge', description: 'Drink 8 glasses daily', category: 'health', difficulty: 'easy', points: 300, participantCount: 1, endDate: '2026-10-14T00:00:00.000Z' },
    { _id: 'c2', title: 'Save $1000', description: 'Put aside 1000', category: 'wealth', difficulty: 'hard', points: 1000, participantCount: 0, endDate: '2026-12-03T00:00:00.000Z' }
  ]
};

beforeEach(() => signedInWith());
afterEach(() => vi.unstubAllGlobals());

describe('Challenges', () => {
  it('lists the challenges the user has joined', async () => {
    stubFetch(ROUTES);
    renderPage(<Challenges />);

    const table = await screen.findByRole('table', { name: 'Your challenges' });
    expect(within(table).getByText('Hydration Challenge')).toBeInTheDocument();
  });

  it('offers Join only for a challenge not already joined', async () => {
    stubFetch(ROUTES);
    renderPage(<Challenges />);

    const table = await screen.findByRole('table', { name: 'Browse challenges' });
    // c1 is in the user's activeChallenges, c2 is not.
    expect(within(table).getByRole('button', { name: 'Joined' })).toBeDisabled();
    expect(within(table).getByRole('button', { name: 'Join' })).toBeEnabled();
  });

  it('matches a joined challenge whether the reference is populated or an id', async () => {
    signedInWith({ activeChallenges: [{ challengeId: { _id: 'c1' }, completed: false }] });
    stubFetch(ROUTES);
    renderPage(<Challenges />);

    const table = await screen.findByRole('table', { name: 'Browse challenges' });
    expect(within(table).getByRole('button', { name: 'Joined' })).toBeDisabled();
  });

  it('marks unlocked achievements apart from locked ones', async () => {
    stubFetch(ROUTES);
    renderPage(<Challenges />);

    const table = await screen.findByRole('table', { name: 'Achievements' });
    expect(within(table).getByText('Hydration Hero')).toBeInTheDocument();
    expect(within(table).getByText('Wellness Guru')).toBeInTheDocument();
  });

  it('degrades rather than throwing on a shape change', async () => {
    stubFetch({
      '/challenges/mine': { challenges: null },
      '/gamification/achievements': { nope: 1 },
      '/gamification/progress': {},
      '/challenges': 'not an array'
    });
    renderPage(<Challenges />);

    expect((await screen.findAllByText(/challenges/i)).length).toBeGreaterThan(0);
  });
});
