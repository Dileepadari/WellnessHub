import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Shell, NAV } from '@/components/Shell';
import { CommandPalette } from '@/components/CommandPalette';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthScreen } from '@/components/AuthScreen';
import { useLiveUpdates } from '@/hooks/useLiveUpdates';
import { Overview } from '@/pages/Overview';

// Split so the first paint only pays for the overview.
const Health = lazy(() => import('@/pages/Health').then((m) => ({ default: m.Health })));
const Wealth = lazy(() => import('@/pages/Wealth').then((m) => ({ default: m.Wealth })));
const Insurance = lazy(() => import('@/pages/Insurance').then((m) => ({ default: m.Insurance })));
const Challenges = lazy(() => import('@/pages/Challenges').then((m) => ({ default: m.Challenges })));
const Community = lazy(() => import('@/pages/Community').then((m) => ({ default: m.Community })));
const Analytics = lazy(() => import('@/pages/Analytics').then((m) => ({ default: m.Analytics })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 }
  }
});

/** Owns the app shell, the palette, and the global keyboard shortcuts. */
function AppShell() {
  const { user, loading } = useAuth();
  const { cycle } = useTheme();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  // Push updates for challenge completions, achievements and progression.
  useLiveUpdates(Boolean(user));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      // The palette opens from anywhere, including a focused field.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      // Single-key shortcuts must not fire while the user is typing.
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 't') {
        cycle();
        return;
      }

      // `g` then a section key, the way most keyboard-first tools navigate.
      if (event.key === 'g') {
        const onSecondKey = (next: KeyboardEvent) => {
          const match = NAV.find((item) => item.key === next.key.toLowerCase());
          if (match) {
            next.preventDefault();
            navigate(match.to);
          }
          window.removeEventListener('keydown', onSecondKey, true);
        };
        window.addEventListener('keydown', onSecondKey, true);
        // Abandon the chord if nothing follows within a second.
        setTimeout(() => window.removeEventListener('keydown', onSecondKey, true), 1000);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cycle, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-[12px] text-fg-subtle">
        Loading...
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <>
      <Shell user={user} onOpenPalette={openPalette}>
        <ErrorBoundary>
          <Suspense
            fallback={<div className="px-1 py-6 text-[12px] text-fg-subtle">Loading...</div>}
          >
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </Shell>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="health" element={<Health />} />
        <Route path="wealth" element={<Wealth />} />
        <Route path="insurance" element={<Insurance />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="community" element={<Community />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'hsl(var(--bg-raised))',
                color: 'hsl(var(--fg))',
                border: '1px solid hsl(var(--line))',
                borderRadius: '3px',
                fontSize: '12px',
                padding: '6px 10px'
              }
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
