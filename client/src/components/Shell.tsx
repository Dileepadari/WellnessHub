import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logoMark from '@/assets/logo-mark.png';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumber } from '@/lib/format';
import type { User } from '@/types';

export const NAV = [
  { to: '/', label: 'Overview', key: 'o' },
  { to: '/health', label: 'Health', key: 'h' },
  { to: '/wealth', label: 'Wealth', key: 'w' },
  { to: '/insurance', label: 'Insurance', key: 'i' },
  { to: '/challenges', label: 'Challenges', key: 'c' },
  { to: '/community', label: 'Community', key: 'm' },
  { to: '/analytics', label: 'Analytics', key: 'a' }
];

function ThemeButton() {
  const { theme, cycle } = useTheme();
  return (
    <button type="button" className="btn btn-ghost" onClick={cycle} title={`Theme: ${theme}`}>
      <span className="micro">{theme}</span>
    </button>
  );
}

interface ShellProps {
  user: User;
  onOpenPalette: () => void;
  children: ReactNode;
}

export function Shell({ user, onOpenPalette, children }: ShellProps) {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b bg-bg-raised">
        <div className="flex items-center gap-2 h-11 px-2">
          <button
            type="button"
            className="btn btn-ghost lg:hidden"
            aria-label="Toggle navigation"
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? <X size={14} /> : <Menu size={14} />}
          </button>

          <span className="flex items-center gap-1.5 pl-1 pr-2 shrink-0">
            <img src={logoMark} alt="" aria-hidden className="logo-mono w-3.5 h-3.5" />
            <span className="text-[12px] font-semibold tracking-tight">WellnessHub</span>
          </span>

          <nav className="hidden lg:flex items-center gap-0.5 border-l pl-2">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-item">
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          <button
            type="button"
            onClick={onOpenPalette}
            className="btn btn-ghost hidden sm:inline-flex"
            title="Command palette"
          >
            <span className="text-fg-subtle">Search</span>
            <kbd className="kbd ml-1">⌘K</kbd>
          </button>

          <span className="hidden sm:flex items-center gap-1.5 px-2 border-l">
            <span className="micro">pts</span>
            <span className="mono tnum text-[12px]">{formatNumber(user.totalPoints)}</span>
            <span className="micro">lv{user.level}</span>
          </span>

          <ThemeButton />

          <NavLink to="/settings" className="nav-item" title="Settings">
            {user.firstName}
          </NavLink>

          <button type="button" className="btn btn-ghost" onClick={logout} title="Sign out">
            <span className="micro">exit</span>
          </button>
        </div>

        {navOpen && (
          <nav className="lg:hidden border-t p-1 grid grid-cols-2 gap-0.5">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-item">
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/settings" className="nav-item">
              Settings
            </NavLink>
          </nav>
        )}
      </header>

      <main className="flex-1 p-3 max-w-[1320px] w-full mx-auto space-y-3">{children}</main>
    </div>
  );
}
