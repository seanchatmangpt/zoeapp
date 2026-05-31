import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import AdminRealtime from '../realtime';
import { supabase } from '@/lib/supabase';

// Keep track of registered callbacks for each table
const callbacks: Record<string, (payload: any) => void> = {};

jest.mock('@/lib/supabase', () => {
  const mockOn = jest.fn(function(this: any, event: string, filter: { event: string; schema: string; table: string }, callback: (payload: any) => void) {
    if (filter && filter.table) {
      callbacks[filter.table] = callback;
    }
    return this;
  });

  const mockSubscribe = jest.fn(function(this: any, statusCallback?: (status: string) => void) {
    if (statusCallback) {
      statusCallback('SUBSCRIBED');
    }
    return this;
  });

  const mockChannelInstance = {
    on: mockOn,
    subscribe: mockSubscribe,
  };

  const mockSupabaseInstance = {
    channel: jest.fn().mockReturnValue(mockChannelInstance),
    removeChannel: jest.fn(),
  };

  return {
    supabase: mockSupabaseInstance,
  };
});

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('View', props),
  };
});

describe('AdminRealtime - Supabase Realtime Channels Integration', () => {
  const mockedSupabase = supabase as any;
  const mockChannel = mockedSupabase.channel();

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear callbacks tracker
    for (const key in callbacks) {
      delete callbacks[key];
    }
  });

  test('renders the component with initial mock messages and sets up subscriptions', () => {
    const { getByText } = render(<AdminRealtime />);

    // Check titles
    expect(getByText('Realtime Channels')).toBeTruthy();
    expect(getByText('Supabase Realtime Status')).toBeTruthy();

    // Verify initial connection status is 'Connected'
    expect(getByText('Connected')).toBeTruthy();
    expect(getByText('Disconnect')).toBeTruthy();

    // Verify channel subscription setup
    expect(mockedSupabase.channel).toHaveBeenCalledWith('admin-realtime-cdc');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'actor_commands' },
      expect.any(Function)
    );
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rdf_quads_ld' },
      expect.any(Function)
    );

    // Verify initial messages are rendered in the log list
    // Initial message 1 (rdf_quads_ld)
    expect(getByText('rdf_quads_ld')).toBeTruthy();
    expect(getByText(/volunteer_123/)).toBeTruthy();
    expect(getByText(/"object":\s*"shortage"/)).toBeTruthy();

    // Initial message 2 (actor_commands)
    expect(getByText('actor_commands')).toBeTruthy();
    expect(getByText(/volunteer_cancel/)).toBeTruthy();
  });

  test('dynamically updates message log when postgres CDC events are received on actor_commands', () => {
    const { getByText } = render(<AdminRealtime />);

    // Make sure callback is registered
    expect(callbacks['actor_commands']).toBeDefined();

    // Trigger CDC insert event on actor_commands
    const newCommandPayload = {
      action: 'INSERT',
      table: 'actor_commands',
      record: {
        id: 'cmd_test_realtime_1',
        command: 'confirm_shift',
        actor_ref: 'volunteer_shortage',
        principal: { role: 'pastor', id: 'usr_pastor_9' },
        timestamp: new Date().toISOString(),
      },
    };

    act(() => {
      callbacks['actor_commands'](newCommandPayload);
    });

    // Verify new event is displayed in the list
    expect(getByText(/confirm_shift/)).toBeTruthy();
    expect(getByText(/usr_pastor_9/)).toBeTruthy();
  });

  test('dynamically updates message log when postgres CDC events are received on rdf_quads_ld', () => {
    const { getByText } = render(<AdminRealtime />);

    // Make sure callback is registered
    expect(callbacks['rdf_quads_ld']).toBeDefined();

    // Trigger CDC upsert event on rdf_quads_ld
    const newQuadPayload = {
      action: 'UPSERT',
      table: 'rdf_quads_ld',
      record: {
        subject: 'shift_xyz_789',
        predicate: 'allocated_to',
        object: 'Emma Stone',
        graph: 'default_graph',
      },
    };

    act(() => {
      callbacks['rdf_quads_ld'](newQuadPayload);
    });

    // Verify new event is displayed in the list
    expect(getByText(/shift_xyz_789/)).toBeTruthy();
    expect(getByText(/Emma Stone/)).toBeTruthy();
  });

  test('manages connection toggle (disconnect/connect) and cleans up subscription', () => {
    const { getByText } = render(<AdminRealtime />);

    // Initial state is connected
    const toggleBtn = getByText('Disconnect');
    
    // Press disconnect
    act(() => {
      fireEvent.press(toggleBtn);
    });

    // Verify connection state offline
    expect(getByText('Offline / Error')).toBeTruthy();
    expect(getByText('Connect')).toBeTruthy();

    // Verify that channel is removed
    expect(mockedSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);

    // Press connect again
    const connectBtn = getByText('Connect');
    act(() => {
      fireEvent.press(connectBtn);
    });

    // Verify it subscribes again
    expect(mockedSupabase.channel).toHaveBeenCalledTimes(2);
    expect(getByText('Connected')).toBeTruthy();
  });

  test('unmounts and removes the subscription channel', () => {
    const { unmount } = render(<AdminRealtime />);

    act(() => {
      unmount();
    });

    // Verify clean up
    expect(mockedSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});
