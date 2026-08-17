import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Named {
  title?: string;
  points?: number;
}

/**
 * Subscribes to the server's progression events.
 *
 * The socket carries notifications, not state: when something lands, the
 * affected queries are invalidated and refetched. That keeps one source of
 * truth (the API) rather than trying to patch the cache from a payload that
 * could drift from what a refetch would return.
 */
export function useLiveUpdates(enabled: boolean) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = apiService.getToken();
    if (!enabled || !token) return;

    // Same-origin: the Vite proxy and the production nginx both forward
    // /socket.io to the API, so no explicit host is needed.
    const socket: Socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      // The UI works without the socket, so do not retry forever on a
      // deployment that has not exposed it.
      reconnectionAttempts: 5
    });

    const refresh = (keys: string[][]) =>
      keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));

    socket.on('progression-updated', () => {
      refresh([['user', 'stats'], ['gamification'], ['analytics'], ['challenges']]);
      // Points, level and streak in the header come from the auth user rather
      // than a query, so invalidating the cache alone would leave them stale.
      void refreshUser();
    });

    socket.on('challenge-completed', (payload: Named) => {
      toast.success(`Challenge complete: ${payload?.title ?? 'done'}`);
      refresh([['challenges'], ['user', 'stats'], ['analytics']]);
      void refreshUser();
    });

    socket.on('achievement-unlocked', (payload: Named) => {
      toast.success(
        `Achievement unlocked: ${payload?.title ?? 'new achievement'}${
          payload?.points ? ` (+${payload.points})` : ''
        }`
      );
      refresh([['gamification'], ['user', 'stats']]);
      void refreshUser();
    });

    socket.on('friend-activity', () => {
      refresh([['community']]);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, queryClient, refreshUser]);
}
