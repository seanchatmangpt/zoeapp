/**
 * @fileoverview Types for real-time collaboration primitives.
 */

import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Represents a user in a presence state.
 */
export interface CollaborationUser {
  id: string;
  name?: string;
  avatarUrl?: string;
  color?: string;
  [key: string]: any;
}

/**
 * Map of presence states where keys are user IDs.
 */
export interface PresenceState {
  [key: string]: CollaborationUser[];
}

/**
 * Event payload for state-sync events.
 */
export interface CollaborationEvent<T = any> {
  userId: string;
  type: string;
  payload: T;
  timestamp: number;
}

/**
 * Options for the usePresence hook.
 */
export interface UsePresenceOptions {
  /** The channel name to join */
  channelId: string;
  /** Current user information to broadcast */
  user: CollaborationUser;
  /** Callback when presence state changes */
  onSync?: (state: PresenceState) => void;
}

/**
 * Options for the useCollaborationEvents hook.
 */
export interface UseCollaborationEventsOptions<T = any> {
  /** The channel name to join */
  channelId: string;
  /** The event type to listen for (e.g., 'cursor', 'typing') */
  eventType: string;
  /** Callback when a collaboration event is received */
  onEvent?: (event: CollaborationEvent<T>) => void;
}
