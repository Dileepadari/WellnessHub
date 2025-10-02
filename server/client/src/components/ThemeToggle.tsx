import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { key: 'light' as const, icon: Sun, label: 'Light' },
    { key: 'dark' as const, icon: Moon, label: 'Dark' },
    { key: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {themes.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${
              theme === key
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }
          `}
          title={`Switch to ${label.toLowerCase()} theme`}
        >
          <Icon size={16} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleCompact() {
  const { theme, setTheme, isDark } = useTheme();

  const getNextTheme = () => {
    if (theme === 'light') return 'dark';
    if (theme === 'dark') return 'system';
    return 'light';
  };

  const getCurrentIcon = () => {
    if (theme === 'system') return Monitor;
    return isDark ? Moon : Sun;
  };

  const Icon = getCurrentIcon();

  return (
    <button
      onClick={() => setTheme(getNextTheme())}
      className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-200"
      title={`Current: ${theme}. Click to cycle themes.`}
    >
      <Icon size={18} />
    </button>
  );
}