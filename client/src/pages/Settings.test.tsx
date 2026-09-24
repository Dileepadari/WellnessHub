/**
 * Covers the Settings page: profile form, goal fields and the theme control.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderPage, stubFetch } from '@/test/harness';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Settings } from './Settings';

const updateProfile = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'u1',
      username: 'john_doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      createdAt: '2026-06-01T00:00:00.000Z',
      healthMetrics: { dailyStepGoal: 10000, dailyWaterGoal: 8 },
      financialMetrics: { monthlyIncome: 6576 }
    },
    updateProfile
  })
}));

const ROUTES = { '/health/goals': {}, '/wealth/profile': {} };

const mount = () =>
  renderPage(
    <ThemeProvider>
      <Settings />
    </ThemeProvider>
  );

beforeEach(() => updateProfile.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe('Settings', () => {
  it('fills the profile form from the signed-in user', async () => {
    stubFetch(ROUTES);
    mount();

    expect(await screen.findByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
  });

  it('submits only the name fields', async () => {
    stubFetch(ROUTES);
    const user = userEvent.setup();
    mount();

    const first = await screen.findByDisplayValue('John');
    await user.clear(first);
    await user.type(first, 'Jonathan');
    // The Profile panel's button is "Save"; "Save profile" belongs to the
    // Financial profile panel further down.
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateProfile).toHaveBeenCalledWith({ firstName: 'Jonathan', lastName: 'Doe' });
  });

  it('shows the health goal fields with their current values', async () => {
    stubFetch(ROUTES);
    mount();

    expect(await screen.findByDisplayValue('10000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('8')).toBeInTheDocument();
  });

  it('marks the active theme as pressed', async () => {
    stubFetch(ROUTES);
    mount();

    // Nothing stored, so the provider starts on system.
    const systemButton = await screen.findByRole('button', { name: 'system' });
    expect(systemButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'dark' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches the theme when another option is chosen', async () => {
    stubFetch(ROUTES);
    const user = userEvent.setup();
    mount();

    await user.click(await screen.findByRole('button', { name: 'dark' }));

    expect(screen.getByRole('button', { name: 'dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('wellness-theme')).toBe('dark');
  });
});
