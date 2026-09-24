/**
 * Covers the theme cycle and the two ways browser storage lets it down:
 * a value that vanishes underneath a live tab, and a write that throws.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

const Probe = () => {
  const { theme, cycle, setTheme, isDark } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="dark">{String(isDark)}</span>
      <button type="button" onClick={cycle}>
        cycle
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        go dark
      </button>
    </>
  );
};

const mount = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );

describe('ThemeProvider', () => {
  it('starts on system when nothing is stored', () => {
    mount();
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('restores a stored choice', () => {
    localStorage.setItem('wellness-theme', 'dark');
    mount();
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('ignores a stored value that is not a theme', () => {
    localStorage.setItem('wellness-theme', 'chartreuse');
    mount();
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('steps light, dark, system and round again', async () => {
    const user = userEvent.setup();
    localStorage.setItem('wellness-theme', 'light');
    mount();

    await user.click(screen.getByRole('button', { name: 'cycle' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    await user.click(screen.getByRole('button', { name: 'cycle' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('system');

    await user.click(screen.getByRole('button', { name: 'cycle' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('steps from the theme in hand, not from whatever storage still says', async () => {
    const user = userEvent.setup();
    mount();

    await user.click(screen.getByRole('button', { name: 'go dark' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    // Storage can go away underneath a live tab: eviction, another tab, or a
    // browser that refuses to persist at all. cycle re-read it instead of using
    // the state it already had, so the next step came from the wrong place.
    localStorage.clear();

    await user.click(screen.getByRole('button', { name: 'cycle' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('survives storage that refuses to be written', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    mount();
    await user.click(screen.getByRole('button', { name: 'cycle' }));

    // The preference is not persisted, but the button still works.
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('refuses to be used outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/within a ThemeProvider/);
  });
});
