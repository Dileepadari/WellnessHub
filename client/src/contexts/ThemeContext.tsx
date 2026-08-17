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

const readStored = (): Theme => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored);
  const [isDark, setIsDark] = useState(false);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const cycle = useCallback(() => setTheme(NEXT[readStored()]), [setTheme]);

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
