import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Steps light -> dark -> system, for the single header button. */
  cycle: () => void;
  isDark: boolean;
}

const STORAGE_KEY = 'wellness-theme';
const NEXT: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Storage is a convenience here, never the source of truth. A browser can
// refuse it outright (private mode, blocked site data) and throw on access, and
// what it holds can be evicted underneath a live tab.
const readStored = (): Theme => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  } catch {
    return 'system';
  }
};

const writeStored = (theme: Theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The choice lasts for this page instead of across visits. Not worth
    // breaking the button that was clicked.
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored);
  const [isDark, setIsDark] = useState(false);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeStored(next);
  }, []);

  // Steps from the theme actually in effect. Re-reading storage here meant a
  // write that never landed, or a value evicted since, sent the next step off
  // from somewhere the user had already moved on from.
  const cycle = useCallback(() => setTheme(NEXT[theme]), [setTheme, theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
    };

    apply();

    // Only 'system' should react to the OS flipping themes.
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, cycle, isDark }), [theme, setTheme, cycle, isDark]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
