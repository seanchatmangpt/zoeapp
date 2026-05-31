import { useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { CollaborationEvent, UseCollaborationEventsOptions } from './types';

/**
 * Hook for broadcasting and receiving real-time collaboration events.
 * Useful for cursor movements, typing indicators, etc.
 * 
 * @param options - Configuration options including channelId and eventType.
 * @returns Object containing a function to broadcast events.
 */
export function useCollaborationEvents<T = any>(options: UseCollaborationEventsOptions<T>) {
  const { channelId, eventType, onEvent } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase.channel(`events:${channelId}`);

    channel
      .on('broadcast', { event: eventType }, ({ payload }: { payload: CollaborationEvent<T> }) => {
        if (onEvent) {
          onEvent(payload);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelId, eventType, onEvent]);

  /**
   * Broadcast an event to all users in the channel.
   * 
   * @param userId - The ID of the user sending the event.
   * @param payload - The data to broadcast.
   */
  const broadcast = useCallback((userId: string, payload: T) => {
    if (channelRef.current) {
      const event: CollaborationEvent<T> = {
        userId,
        type: eventType,
        payload,
        timestamp: Date.now(),
      };
      channelRef.current.send({
        type: 'broadcast',
        event: eventType,
        payload: event,
      });
    }
  }, [eventType]);

  return { broadcast };
}
