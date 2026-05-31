import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ActorLab from '../actor-lab';
import {
  useActorOpsStore,
  globalLocalDispatcher,
  globalRemoteDispatcher,
  globalVkgClient
} from '../../../lib/actor/actorOps';
import { DataFactory } from '../../../lib/vkg/rdf';

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockFontAwesome = (props: any) => React.createElement(View, { ...props, testID: props.name });
  MockFontAwesome.displayName = 'MockFontAwesome';
  return MockFontAwesome;
});

// Mock Supabase client
jest.mock('@/lib/supabase', () => {
  const mockUpsert = jest.fn().mockReturnValue(Promise.resolve({ error: null }));
  const mockDeleteEq = jest.fn().mockReturnValue(Promise.resolve({ error: null }));
  const mockDelete = jest.fn().mockReturnValue({ eq: mockDeleteEq });
  const mockFrom = jest.fn().mockReturnValue({
    upsert: mockUpsert,
    delete: mockDelete,
  });

  return {
    supabase: {
      from: mockFrom,
      _mockUpsert: mockUpsert,
    },
  };
});

// Mock database to prevent actual SQLite connections/queries
let mockOutboxCount = 0;
let mockQuarantineCount = 0;

jest.mock('../../../lib/db/db', () => {
  return {
    db: {
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockImplementation((table) => {
          const getTableName = (t: any): string => {
            if (!t) return '';
            if (t.config?.name) return t.config.name;
            const symbols = Object.getOwnPropertySymbols(t);
            for (const sym of symbols) {
              const str = sym.toString();
              if (
                str === 'Symbol(drizzle:Name)' ||
                str === 'Symbol(drizzle:BaseName)' ||
                str === 'Symbol(drizzle:OriginalName)'
              ) {
                const val = t[sym];
                if (typeof val === 'string') return val;
              }
            }
            return '';
          };

          const tableName = getTableName(table);
          if (tableName === 'actor_outbox') {
            return Promise.resolve([{ value: mockOutboxCount }]);
          }
          if (tableName === 'actor_quarantine') {
            return Promise.resolve([{ value: mockQuarantineCount }]);
          }
          return Promise.resolve([]);
        }),
      })),
    },
  };
});

describe('ActorLab Component', () => {
  let syncOutboxSpy: jest.SpyInstance;
  let matchSpy: jest.SpyInstance;
  let alertSpy: jest.SpyInstance;

  // Helper to flush asynchronous tasks/microtasks in tests
  const flushPromises = () => new Promise<void>((resolve) => {
    jest.requireActual('timers').setImmediate(resolve);
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockOutboxCount = 0;
    mockQuarantineCount = 0;

    // Reset Zustand store to default values
    useActorOpsStore.setState({
      networkOnline: true,
      remoteRejectActive: false,
      currentPrincipal: { id: 'usr_admin', role: 'admin' },
      latestReceipt: null,
      latestEvent: null,
      outboxCount: 0,
      quarantineCount: 0,
    });

    // Setup Spies
    syncOutboxSpy = jest.spyOn(globalLocalDispatcher, 'syncOutbox').mockImplementation(() => Promise.resolve());
    matchSpy = jest.spyOn(globalVkgClient, 'match').mockImplementation(() => {
      const s = DataFactory.namedNode('https://schema.org/sermon/sermon-1');
      const p = DataFactory.namedNode('https://schema.org/name');
      const o = DataFactory.literal('The Power of Grace');
      return Promise.resolve([DataFactory.quad(s, p, o)]);
    });
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders initially in STOPPED state and fetches initial db metrics & sermon quads', async () => {
    mockOutboxCount = 3;
    mockQuarantineCount = 1;

    const { getByText, getByTestId } = render(<ActorLab />);

    // Fast-forward initial refreshState interval check (3000ms)
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await flushPromises();
    });

    // Check that we display the STOPPED status
    expect(getByText('STOPPED')).toBeTruthy();

    // Check database counts
    expect(getByTestId('outbox-count').props.children).toBe(3);
    expect(getByTestId('quarantine-count').props.children).toBe(1);

    // Verify sermon quad name is rendered in VKG projection
    expect(getByTestId('sermon-title-rendered').props.children).toBe('The Power of Grace');
  });

  test('starting the simulation daemon transitions state to RUNNING and runs heartbeat tick', async () => {
    mockOutboxCount = 0;
    const { getByText } = render(<ActorLab />);

    // Verify initially STOPPED
    expect(getByText('STOPPED')).toBeTruthy();

    // Click START
    const startBtn = getByText('START');
    await act(async () => {
      fireEvent.press(startBtn);
    });

    // Verify status changes to RUNNING
    expect(getByText('RUNNING')).toBeTruthy();

    // Advance by 4000ms to trigger daemon heartbeat tick
    await act(async () => {
      jest.advanceTimersByTime(4000);
      await flushPromises();
    });

    // Since outboxCount is 0, syncOutbox should NOT be called
    expect(syncOutboxSpy).not.toHaveBeenCalled();
  });

  test('simulation daemon triggers sync when outboxCount > 0 and network is online', async () => {
    mockOutboxCount = 2;
    useActorOpsStore.setState({ outboxCount: 2, networkOnline: true });

    const { getByText } = render(<ActorLab />);

    // Click START
    const startBtn = getByText('START');
    await act(async () => {
      fireEvent.press(startBtn);
    });

    // Advance by 4000ms to trigger daemon heartbeat tick
    await act(async () => {
      jest.advanceTimersByTime(4000);
      await flushPromises();
    });

    // syncOutbox should be triggered
    expect(syncOutboxSpy).toHaveBeenCalledTimes(1);
    expect(syncOutboxSpy).toHaveBeenCalledWith(globalRemoteDispatcher);
  });

  test('simulation daemon defers sync when outboxCount > 0 but network is offline', async () => {
    mockOutboxCount = 2;
    useActorOpsStore.setState({ outboxCount: 2, networkOnline: false });

    const { getByText } = render(<ActorLab />);

    // Click START
    const startBtn = getByText('START');
    await act(async () => {
      fireEvent.press(startBtn);
    });

    // Advance by 4000ms to trigger daemon heartbeat tick
    await act(async () => {
      jest.advanceTimersByTime(4000);
      await flushPromises();
    });

    // syncOutbox should NOT be triggered because network is offline
    expect(syncOutboxSpy).not.toHaveBeenCalled();
  });

  test('pausing the simulation daemon transitions state to PAUSED and clears interval', async () => {
    mockOutboxCount = 2;
    useActorOpsStore.setState({ outboxCount: 2, networkOnline: true });

    const { getByText } = render(<ActorLab />);

    // Click START
    const startBtn = getByText('START');
    await act(async () => {
      fireEvent.press(startBtn);
    });

    expect(getByText('RUNNING')).toBeTruthy();

    // Click PAUSE
    const pauseBtn = getByText('PAUSE');
    await act(async () => {
      fireEvent.press(pauseBtn);
    });

    // Verify status changes to PAUSED
    expect(getByText('PAUSED')).toBeTruthy();

    // Advance by 4000ms to ensure interval is cleared and does not call syncOutbox
    await act(async () => {
      jest.advanceTimersByTime(4000);
      await flushPromises();
    });

    expect(syncOutboxSpy).not.toHaveBeenCalled();
  });

  test('restarting the simulation daemon transitions state to STOPPED and resets parameters', async () => {
    // Modify initial store values to non-defaults
    useActorOpsStore.setState({
      networkOnline: false,
      remoteRejectActive: true,
      currentPrincipal: { id: 'usr_pastor', role: 'pastor' },
    });

    const { getByText } = render(<ActorLab />);

    // Click START
    const startBtn = getByText('START');
    await act(async () => {
      fireEvent.press(startBtn);
    });
    expect(getByText('RUNNING')).toBeTruthy();

    // Click RESTART
    const restartBtn = getByText('RESTART');
    await act(async () => {
      fireEvent.press(restartBtn);
    });

    // State transitions back to STOPPED
    expect(getByText('STOPPED')).toBeTruthy();

    // Store properties reset
    const storeState = useActorOpsStore.getState();
    expect(storeState.networkOnline).toBe(true);
    expect(storeState.remoteRejectActive).toBe(false);
    expect(storeState.currentPrincipal.role).toBe('admin');
  });

  test('manual sync outbox now triggers syncOutbox execution', async () => {
    const { getByText } = render(<ActorLab />);

    const manualSyncBtn = getByText('Sync Outbox Now');
    await act(async () => {
      fireEvent.press(manualSyncBtn);
    });

    expect(syncOutboxSpy).toHaveBeenCalledTimes(1);
    expect(syncOutboxSpy).toHaveBeenCalledWith(globalRemoteDispatcher);
    expect(alertSpy).toHaveBeenCalledWith('Outbox Sync', 'Synchronization completed.');
  });
});
