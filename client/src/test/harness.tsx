/**
 * Mounts a page the way the app does, with a fetch stub in place of the API.
 *
 * Stubbing fetch rather than the hooks keeps the whole read path under test:
 * ApiService shapes the request and unwraps the envelope, useApi caches it, and
 * the page reads fields out of the payload. That last step is where the bugs
 * were, and mocking the hooks would skip exactly it.
 */

import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

/** Maps a path fragment to the JSON body the API would return for it. */
export type Routes = Record<string, unknown>;

/**
 * Answers any request whose URL contains one of the keys, longest key first so
 * `/health/summary` wins over `/health`. An unmatched request fails loudly
 * rather than resolving empty, because a page quietly rendering its empty state
 * is the failure these tests exist to catch.
 */
export function stubFetch(routes: Routes) {
  const paths = Object.keys(routes).sort((a, b) => b.length - a.length);

  const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const match = paths.find((path) => url.includes(path));

    if (!match) {
      throw new Error(`No stub for ${url}. Known: ${paths.join(', ')}`);
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: routes[match] })
    } as Response;
  });

  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

function Providers({ children }: { children: ReactNode }) {
  // Retries would turn a deliberate failure into a timeout, and a shared cache
  // would leak one test's payload into the next.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } }
  });

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

export function renderPage(ui: ReactElement) {
  return render(ui, { wrapper: Providers });
}
