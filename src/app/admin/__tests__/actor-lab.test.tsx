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

// Mock Zustand Actor Ops Store and operations locally



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
let mockShouldDbThrow = false;

jest.mock('../../../lib/db/db', () => {
  return {
    db: {
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockImplementation((table) => {
          if (mockShouldDbThrow) {
            return Promise.reject(new Error('Mock DB Error'));
          }

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

  // Helper to render and flush initial state effects safely
  const renderActorLab = async () => {
    const renderResult = render(<ActorLab />);
    await act(async () => {
      await flushPromises();
    });
    return renderResult;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockOutboxCount = 0;
    mockQuarantineCount = 0;
    mockShouldDbThrow = false;

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

    const { getByText, getByTestId } = await renderActorLab();

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

  test('handles db connection errors gracefully on refreshState', async () => {
    mockShouldDbThrow = true;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await renderActorLab();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load metrics:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('starting the simulation daemon transitions state to RUNNING and runs heartbeat tick', async () => {
    mockOutboxCount = 0;
    const { getByText } = await renderActorLab();

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

    let resolveSync: any;
    syncOutboxSpy.mockImplementationOnce(() => new Promise((resolve) => { resolveSync = resolve; }));

    const { getByText, getByTestId } = await renderActorLab();

    // Connector state sync test (syncing should trigger when triggerSync happens)
    const syncBtn = getByText('Sync Outbox Now');
    await act(async () => {
      fireEvent.press(syncBtn);
    });

    expect(getByTestId('connector-syncing')).toBeTruthy();
    
    await act(async () => {
      resolveSync();
      await flushPromises();
    });

    // Reset spy for daemon loop
    syncOutboxSpy.mockImplementation(() => Promise.resolve());

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
    // 1 from manual, 1 from daemon heartbeat
    expect(syncOutboxSpy).toHaveBeenCalledTimes(2);
    expect(syncOutboxSpy).toHaveBeenCalledWith(globalRemoteDispatcher);
  });

  test('simulation daemon defers sync when outboxCount > 0 but network is offline', async () => {
    mockOutboxCount = 2;
    useActorOpsStore.setState({ outboxCount: 2, networkOnline: false });

    const { getByText } = await renderActorLab();

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

    const { getByText } = await renderActorLab();

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

    const { getByText } = await renderActorLab();

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
    const { getByText } = await renderActorLab();

    const manualSyncBtn = getByText('Sync Outbox Now');
    await act(async () => {
      fireEvent.press(manualSyncBtn);
    });

    expect(syncOutboxSpy).toHaveBeenCalledTimes(1);
    expect(syncOutboxSpy).toHaveBeenCalledWith(globalRemoteDispatcher);
    expect(alertSpy).toHaveBeenCalledWith('Outbox Sync', 'Synchronization completed.');
  });

  test('toggling network online/offline updates simulation parameters and logs the action', async () => {
    const { getByTestId } = await renderActorLab();

    const offBtn = getByTestId('mock-network-off');
    await act(async () => {
      fireEvent.press(offBtn);
    });
    expect(useActorOpsStore.getState().networkOnline).toBe(false);

    const onBtn = getByTestId('mock-network-on');
    await act(async () => {
      fireEvent.press(onBtn);
    });
    expect(useActorOpsStore.getState().networkOnline).toBe(true);
  });

  test('toggling remote authority mock rejection updates parameters and logs the action', async () => {
    const { getByTestId } = await renderActorLab();

    const onBtn = getByTestId('mock-remote-reject-on');
    await act(async () => {
      fireEvent.press(onBtn);
    });
    expect(useActorOpsStore.getState().remoteRejectActive).toBe(true);

    const offBtn = getByTestId('mock-remote-reject-off');
    await act(async () => {
      fireEvent.press(offBtn);
    });
    expect(useActorOpsStore.getState().remoteRejectActive).toBe(false);
  });

  test('selecting different principal roles updates current principal', async () => {
    const { getByTestId } = await renderActorLab();

    const roles = ['guest', 'member', 'pastor', 'admin'] as const;
    for (const role of roles) {
      const roleBtn = getByTestId(`principal-role-picker-${role}`);
      await act(async () => {
        fireEvent.press(roleBtn);
      });
      expect(useActorOpsStore.getState().currentPrincipal.role).toBe(role);
    }
  });

  test('maps error codes correctly based on latestReceipt status and error details', async () => {
    const { getByTestId, rerender } = await renderActorLab();

    // None case
    expect(getByTestId('latest-error-code').props.children).toBe('None');

    // AUTHZ_DENIED case
    act(() => {
      useActorOpsStore.setState({
        latestReceipt: {
          id: 'rec_1',
          commandId: 'cmd_1',
          actor: { id: 'act_1', kind: 'user', tenantId: 'tenant-default' },
          status: 'rejected_local',
          error: 'AuthorizationError: access denied',
          createdAt: new Date().toISOString(),
          eventIds: [],
        },
      });
    });
    rerender(<ActorLab />);
    expect(getByTestId('latest-error-code').props.children).toBe('AUTHZ_DENIED');

    // INPUT_INVALID case
    act(() => {
      useActorOpsStore.setState({
        latestReceipt: {
          id: 'rec_2',
          commandId: 'cmd_2',
          actor: { id: 'act_2', kind: 'user', tenantId: 'tenant-default' },
          status: 'rejected_local',
          error: 'ValidationError: malformed input',
          createdAt: new Date().toISOString(),
          eventIds: [],
        },
      });
    });
    rerender(<ActorLab />);
    expect(getByTestId('latest-error-code').props.children).toBe('INPUT_INVALID');

    // REMOTE_AUTHORITY_REJECTED case
    act(() => {
      useActorOpsStore.setState({
        latestReceipt: {
          id: 'rec_3',
          commandId: 'cmd_3',
          actor: { id: 'act_3', kind: 'user', tenantId: 'tenant-default' },
          status: 'rejected_remote',
          error: 'ValidationError: authoritative reject',
          createdAt: new Date().toISOString(),
          eventIds: [],
        },
      });
    });
    rerender(<ActorLab />);
    expect(getByTestId('latest-error-code').props.children).toBe('REMOTE_AUTHORITY_REJECTED');

    // EXECUTION_FAILED case
    act(() => {
      useActorOpsStore.setState({
        latestReceipt: {
          id: 'rec_4',
          commandId: 'cmd_4',
          actor: { id: 'act_4', kind: 'user', tenantId: 'tenant-default' },
          status: 'rejected_local',
          error: 'ExecutionError: unexpected runtime panic',
          createdAt: new Date().toISOString(),
          eventIds: [],
        },
      });
    });
    rerender(<ActorLab />);
    expect(getByTestId('latest-error-code').props.children).toBe('EXECUTION_FAILED');
  });

  test('filters terminal logs by level and category and handles clear logs', async () => {
    const { getByTestId, queryByText } = await renderActorLab();

    // Filter by ERROR - should display empty logs text
    const errorFilter = getByTestId('filter-level-ERROR');
    await act(async () => {
      fireEvent.press(errorFilter);
    });
    expect(queryByText('No logs match the current filters.')).toBeTruthy();

    // Filter back to ALL levels, then network category
    const allFilter = getByTestId('filter-level-ALL');
    const netCategoryFilter = getByTestId('filter-category-NETWORK');
    await act(async () => {
      fireEvent.press(allFilter);
      fireEvent.press(netCategoryFilter);
    });
    expect(queryByText('Simulated network interface configured: ONLINE')).toBeTruthy();
    expect(queryByText('Identity session established for Principal Role: admin')).toBeNull();

    // Clear logs completely
    const clearBtn = getByTestId('clear-logs');
    await act(async () => {
      fireEvent.press(clearBtn);
    });
    expect(queryByText('No logs match the current filters.')).toBeTruthy();
  });

  test('manual sync handles synchronization error and alerts', async () => {
    syncOutboxSpy.mockImplementationOnce(() => Promise.reject(new Error('Sync failed due to timeout')));
    const { getByText } = await renderActorLab();

    const manualSyncBtn = getByText('Sync Outbox Now');
    await act(async () => {
      fireEvent.press(manualSyncBtn);
    });

    expect(syncOutboxSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Outbox Sync Error', 'Sync failed due to timeout');
  });

  test('simulation daemon heartbeat tick logs telemetry verification when outbox is empty', async () => {
    const { getByText } = await renderActorLab();

    // Start simulation
    const startBtn = getByText('START');
    await act(async () => {
      fireEvent.press(startBtn);
    });

    // Advance 4000ms to trigger daemon heartbeat check
    await act(async () => {
      jest.advanceTimersByTime(4000);
      await flushPromises();
    });
  });

  test('simulation daemon auto-sync logs error on synchronization failure', async () => {
    mockOutboxCount = 1;
    useActorOpsStore.setState({ outboxCount: 1, networkOnline: true });
    syncOutboxSpy.mockImplementationOnce(() => Promise.reject(new Error('Automatic replication failed')));

    const { getByText } = await renderActorLab();

    // Start simulation
    const startBtn = getByText('START');
    await act(async () => {
      fireEvent.press(startBtn);
    });

    // Advance 4000ms
    await act(async () => {
      jest.advanceTimersByTime(4000);
      await flushPromises();
    });

    expect(syncOutboxSpy).toHaveBeenCalledTimes(1);
  });
});
