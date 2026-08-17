import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiService } from './api';

const mockFetch = (body: unknown, status = 200) => {
  const spy = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body)
  });
  vi.stubGlobal('fetch', spy);
  return spy;
};

describe('apiService', () => {
  beforeEach(() => {
    apiService.logout();
    vi.unstubAllGlobals();
  });

  it('stores the token returned by login', async () => {
    mockFetch({ success: true, data: { token: 'jwt-123', user: {} } });

    await apiService.login('a@b.c', 'password');

    expect(apiService.getToken()).toBe('jwt-123');
    expect(localStorage.getItem('wellness_token')).toBe('jwt-123');
  });

  it('sends the bearer token on later requests', async () => {
    mockFetch({ success: true, data: { token: 'jwt-123', user: {} } });
    await apiService.login('a@b.c', 'password');

    const spy = mockFetch({ success: true, data: {} });
    await apiService.getUserStats();

    const headers = spy.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt-123');
  });

  it('clears the token on logout', async () => {
    mockFetch({ success: true, data: { token: 'jwt-123', user: {} } });
    await apiService.login('a@b.c', 'password');

    apiService.logout();

    expect(apiService.getToken()).toBeNull();
    expect(localStorage.getItem('wellness_token')).toBeNull();
  });

  it('throws an ApiError carrying the status and server message', async () => {
    mockFetch({ success: false, message: 'Invalid credentials' }, 401);

    await expect(apiService.login('a@b.c', 'wrong')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Invalid credentials',
      status: 401
    });
  });

  it('falls back to a generic message when the body has none', async () => {
    mockFetch(null, 500);
    await expect(apiService.getUserStats()).rejects.toThrow(ApiError);
  });

  it('drops the token and notifies listeners on a 401', async () => {
    mockFetch({ success: true, data: { token: 'jwt-123', user: {} } });
    await apiService.login('a@b.c', 'password');

    const listener = vi.fn();
    const unsubscribe = apiService.onUnauthorized(listener);

    mockFetch({ message: 'Token expired' }, 401);
    await expect(apiService.getUserStats()).rejects.toThrow(ApiError);

    expect(listener).toHaveBeenCalledOnce();
    expect(apiService.getToken()).toBeNull();
    unsubscribe();
  });

  it('stops notifying after unsubscribe', async () => {
    const listener = vi.fn();
    apiService.onUnauthorized(listener)();

    mockFetch({ message: 'nope' }, 401);
    await expect(apiService.getUserStats()).rejects.toThrow(ApiError);

    expect(listener).not.toHaveBeenCalled();
  });

  it('builds query strings and omits empty params', async () => {
    const spy = mockFetch({ success: true, data: {} });

    await apiService.getHealthSummary(14);
    expect(spy.mock.calls[0][0]).toBe('/api/health/summary?days=14');

    await apiService.getTransactions({ limit: 10, kind: '' });
    expect(spy.mock.calls[1][0]).toBe('/api/wealth/transactions?limit=10');
  });

  it('requests the real challenge route with its filter', async () => {
    const spy = mockFetch({ success: true, data: [] });

    await apiService.getChallenges({ category: 'health' });
    expect(spy.mock.calls[0][0]).toBe('/api/challenges?category=health');
  });
});
