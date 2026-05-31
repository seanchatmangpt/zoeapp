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

    // Verify channel subscription setup for all 4 tables
    expect(mockedSupabase.channel).toHaveBeenCalledWith('admin-realtime-cdc');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'actor_commands' },
      expect.any(Function)
    );
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'actor_events' },
      expect.any(Function)
    );
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'actor_receipts' },
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

  test('dynamically updates message log when postgres CDC events are received on actor_events', () => {
    const { getByText } = render(<AdminRealtime />);

    // Make sure callback is registered
    expect(callbacks['actor_events']).toBeDefined();

    // Trigger CDC insert event on actor_events
    const newEventPayload = {
      action: 'INSERT',
      table: 'actor_events',
      record: {
        id: 'evt_test_realtime_1',
        command_id: 'cmd_test_realtime_1',
        type: 'risk_acknowledged',
        payload: { detail: 'Operator acknowledged risk' },
        timestamp: new Date().toISOString(),
      },
    };

    act(() => {
      callbacks['actor_events'](newEventPayload);
    });

    // Verify new event is displayed in the list
    expect(getByText(/risk_acknowledged/)).toBeTruthy();
    expect(getByText(/Operator acknowledged risk/)).toBeTruthy();
  });

  test('dynamically updates message log when postgres CDC events are received on actor_receipts', () => {
    const { getByText } = render(<AdminRealtime />);

    // Make sure callback is registered
    expect(callbacks['actor_receipts']).toBeDefined();

    // Trigger CDC insert event on actor_receipts
    const newReceiptPayload = {
      action: 'INSERT',
      table: 'actor_receipts',
      record: {
        id: 'rec_test_realtime_1',
        command_id: 'cmd_test_realtime_1',
        status: 'Rejected_Remote',
        delta_hash: 'hash_test_1',
        timestamp: new Date().toISOString(),
      },
    };

    act(() => {
      callbacks['actor_receipts'](newReceiptPayload);
    });

    // Verify new event is displayed in the list
    expect(getByText(/Rejected_Remote/)).toBeTruthy();
    expect(getByText(/hash_test_1/)).toBeTruthy();
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

  test('simulates event injection on simulator button presses', () => {
    // Save original Math.random
    const originalRandom = Math.random;
    // Mock Math.random to return sequential/unique values so we get unique keys and predictable indices
    let callCount = 0;
    Math.random = () => {
      callCount++;
      return 0.5 + (callCount * 0.01);
    };

    try {
      const { getByText, getAllByText } = render(<AdminRealtime />);

      // 1. Simulate actor_commands (⚡ Command)
      const cmdBtn = getByText('⚡ Command');
      act(() => {
        fireEvent.press(cmdBtn);
      });
      expect(getByText(/confirm_shift/)).toBeTruthy();
      expect(getByText(/"role":\s*"teamLead"/)).toBeTruthy();

      // 2. Simulate actor_events (⚡ Event)
      const eventBtn = getByText('⚡ Event');
      act(() => {
        fireEvent.press(eventBtn);
      });
      expect(getByText(/shift_assigned/)).toBeTruthy();
      expect(getByText(/Simulated realtime event logging/)).toBeTruthy();

      // 3. Simulate actor_receipts (⚡ Receipt)
      const receiptBtn = getByText('⚡ Receipt');
      act(() => {
        fireEvent.press(receiptBtn);
      });
      expect(getByText(/Rejected_Remote/)).toBeTruthy();

      // 4. Simulate rdf_quads_ld (⚡ RDF Quad)
      const quadBtn = getByText('⚡ RDF Quad');
      act(() => {
        fireEvent.press(quadBtn);
      });
      expect(getByText(/shift_abc/)).toBeTruthy();
      expect(getByText(/allocated_to/)).toBeTruthy();

      // Verify that Sarah Brown has at least 2 occurrences (in candidates matrix and message log)
      const sarahElements = getAllByText(/Sarah Brown/);
      expect(sarahElements.length).toBeGreaterThanOrEqual(2);
    } finally {
      // Restore Math.random
      Math.random = originalRandom;
    }
  });

  test('displays connection state override metrics and changes latency representation when offline', () => {
    const { getByText, queryByText } = render(<AdminRealtime />);

    // Verify initial state: Connected, with a latency display (42ms)
    expect(getByText('Connected')).toBeTruthy();
    expect(getByText('42ms')).toBeTruthy();
    const toggleBtn = getByText('Disconnect');

    // Click Disconnect
    act(() => {
      fireEvent.press(toggleBtn);
    });

    // Verify offline state metrics
    expect(getByText('Offline / Error')).toBeTruthy();
    expect(getByText('—')).toBeTruthy(); // Latency shows fallback
    expect(queryByText('42ms')).toBeNull();

    // Click Connect again
    const connectBtn = getByText('Connect');
    act(() => {
      fireEvent.press(connectBtn);
    });

    // Verify online state metrics are restored
    expect(getByText('Connected')).toBeTruthy();
    expect(getByText('42ms')).toBeTruthy();
  });

  test('clears the log when Clear Log button is pressed', () => {
    const { getByText, queryByText } = render(<AdminRealtime />);

    // Initially, clear log is visible and initial messages are present
    expect(getByText('Clear Log')).toBeTruthy();
    expect(getByText('rdf_quads_ld')).toBeTruthy();

    const clearBtn = getByText('Clear Log');
    act(() => {
      fireEvent.press(clearBtn);
    });

    // Messages should be gone, and "No real-time messages received yet." should show
    expect(queryByText('rdf_quads_ld')).toBeNull();
    expect(queryByText('actor_commands')).toBeNull();
    expect(getByText('No real-time messages received yet.')).toBeTruthy();
    // Clear Log button should no longer be visible
    expect(queryByText('Clear Log')).toBeNull();
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
