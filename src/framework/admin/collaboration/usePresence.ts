import { useEffect, useState, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { PresenceState, UsePresenceOptions, CollaborationUser } from './types';

/**
 * Hook for managing real-time presence in the Admin UI.
 * Tracks who is currently looking at a specific "screen" or "channel".
 * 
 * @param options - Configuration options including channelId and user info.
 * @returns Object containing the current presence state and error if any.
 */
export function usePresence(options: UsePresenceOptions) {
  const { channelId, user, onSync } = options;
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!channelId || !user.id) return;

    const channel = supabase.channel(`presence:${channelId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState<CollaborationUser>();
        setPresenceState(newState);
        if (onSync) {
          onSync(newState);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('join', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('leave', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const status = await channel.track(user);
          if (status !== 'ok') {
            setError(new Error(`Failed to track presence: ${status}`));
          }
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelId, user.id, JSON.stringify(user), onSync]);

  const users = Object.values(presenceState).flat();

  return { presenceState, users, error };
}
