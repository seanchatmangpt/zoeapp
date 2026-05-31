import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AdminOutbox, { formatTimestamp, CodePayload } from '../outbox';
import { globalLocalDispatcher, globalRemoteDispatcher } from '../../../lib/actor/actorOps';

// Mock FontAwesome icon used inside AdminShell
jest.mock('@expo/vector-icons/FontAwesome', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return (props: any) => ReactMock.createElement(View, { ...props, testID: props.name });
});

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    canGoBack: () => true,
    back: jest.fn(),
  }),
}));

// Mock variables for outbox and quarantine databases
let mockOutboxData: any[] = [];
let mockQuarantineData: any[] = [];
let mockShouldDbThrow = false;

// Mock SQLite db client
jest.mock('../../../lib/db/db', () => {
  const { actorOutbox, actorQuarantine } = require('../../../lib/db/schema');
  
  return {
    db: {
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockImplementation((table) => {
          return {
            orderBy: jest.fn().mockImplementation(() => {
              if (mockShouldDbThrow) {
                return Promise.reject(new Error('Mock DB Fetch Error'));
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
                return Promise.resolve(mockOutboxData);
              }
              if (tableName === 'actor_quarantine') {
                return Promise.resolve(mockQuarantineData);
              }
              return Promise.resolve([]);
            })
          };
        }),
      })),
    },
  };
});

// Mock actorOps dispatcher singletons and Zustand store
jest.mock('../../../lib/actor/actorOps', () => {
  const mockSyncOutbox = jest.fn(() => Promise.resolve());
  const mockPushChanges = jest.fn(() => Promise.resolve());
  
  const mockSyncEngine = {
    pushChanges: mockPushChanges,
  };
  
  const mockLocalDispatcher = {
    syncOutbox: mockSyncOutbox,
    getSyncEngine: jest.fn(() => mockSyncEngine),
  };
  
  const mockRemoteDispatcher = {};
  
  const mockSetNetworkOnline = jest.fn();
  const mockSetRemoteRejectActive = jest.fn();
  const mockSetLatestReceipt = jest.fn();
  const mockSetLatestEvent = jest.fn();
  const mockSetCounts = jest.fn();

  const mockState = {
    networkOnline: true,
    remoteRejectActive: false,
    setNetworkOnline: mockSetNetworkOnline,
    setRemoteRejectActive: mockSetRemoteRejectActive,
  };

  const mockUse = jest.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    return mockState;
  });
  (mockUse as any).getState = jest.fn(() => ({
    setLatestReceipt: mockSetLatestReceipt,
    setLatestEvent: mockSetLatestEvent,
    setCounts: mockSetCounts,
  }));

  return {
    globalLocalDispatcher: mockLocalDispatcher,
    globalRemoteDispatcher: mockRemoteDispatcher,
    useActorOpsStore: mockUse,
  };
});

describe('AdminOutbox Screen - Pre-Admission Tension Queue Views', () => {
  let alertSpy: jest.SpyInstance;
  const mockLocalDispatcherTyped = globalLocalDispatcher as any;

  // Helper to flush asynchronous tasks/microtasks in tests
  const flushPromises = () => new Promise<void>((resolve) => {
    jest.requireActual('timers').setImmediate(resolve);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOutboxData = [];
    mockQuarantineData = [];
    mockShouldDbThrow = false;
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  test('renders empty states and zero count badges correctly', async () => {
    const { getByText, queryByText } = render(<AdminOutbox />);
    await act(async () => {
      await flushPromises();
    });

    // Verify main screen title and subtitle
    expect(getByText('Outbox & Sync Manager')).toBeTruthy();
    expect(getByText('Control authoritative synchronization replays')).toBeTruthy();

    // Verify outbox counters are 0
    expect(getByText('Outbox Queue')).toBeTruthy();
    expect(getByText('Quarantined')).toBeTruthy();

    // List empty components checks
    expect(getByText('Outbox queue is empty. Ready for offline commands.')).toBeTruthy();
    expect(getByText('No quarantined commands detected.')).toBeTruthy();
  });

  test('renders items, badges and JSON displays correctly when queue has data', async () => {
    // Populate mock DB data
    mockOutboxData = [
      {
        id: 'outbox-uuid-1',
        commandId: 'cmd-outbox-1',
        jobType: 'DISPATCH_AUTHORITATIVE',
        payload: JSON.stringify({ action: 'volunteer_cancel', date: '2026-05-30' }),
        status: 'pending',
        attempts: 0,
        createdAt: new Date('2026-05-30T10:00:00.000Z'),
      }
    ];

    mockQuarantineData = [
      {
        id: 'quarantine-uuid-1',
        commandId: 'cmd-quarantine-1',
        actorRef: JSON.stringify({ id: 'actor-pastor-1', role: 'pastor' }),
        payload: JSON.stringify({ action: 'prayer_request', urgent: true }),
        error: 'Constraint violation: invalid email format',
        createdAt: new Date('2026-05-30T11:00:00.000Z'),
      }
    ];

    const { getByText, getAllByText } = render(<AdminOutbox />);
    await act(async () => {
      await flushPromises();
    });

    // Check count badges are rendered with length 1
    const outboxCounts = getAllByText('1');
    expect(outboxCounts.length).toBeGreaterThanOrEqual(1);

    // Check Outbox Item
    expect(getByText('Job: outbox-uui...')).toBeTruthy();
    expect(getByText('cmd-outbox-1')).toBeTruthy();
    expect(getByText('0 / 3')).toBeTruthy(); // Attempts count

    // Check Quarantine Item
    expect(getByText('Quarantine: quarantine...')).toBeTruthy();
    expect(getByText('cmd-quarantine-1')).toBeTruthy();
    expect(getByText('Constraint violation: invalid email format')).toBeTruthy();

    // Check JSON formatted display collapsed state shows code title
    expect(getByText('Command Context Data')).toBeTruthy();
    expect(getByText('Execution Dump Data')).toBeTruthy();
  });

  test('toggles and formats JSON display on item header press', async () => {
    mockOutboxData = [
      {
        id: 'outbox-uuid-1',
        commandId: 'cmd-outbox-1',
        jobType: 'DISPATCH_AUTHORITATIVE',
        payload: JSON.stringify({ action: 'volunteer_cancel', date: '2026-05-30' }),
        status: 'pending',
        attempts: 0,
        createdAt: new Date('2026-05-30T10:00:00.000Z'),
      }
    ];

    const { getByText, queryByText } = render(<AdminOutbox />);
    await act(async () => {
      await flushPromises();
    });

    // The code body is initially collapsed, JSON content should not be visible
    expect(queryByText(/"action":\s*"volunteer_cancel"/)).toBeNull();

    // Press the CodePayload header to expand
    const codeHeader = getByText('Command Context Data');
    await act(async () => {
      fireEvent.press(codeHeader);
    });

    // Now it should display the JSON content
    expect(getByText(/"action":\s*"volunteer_cancel"/)).toBeTruthy();
    expect(getByText(/"date":\s*"2026-05-30"/)).toBeTruthy();

    // Press again to collapse
    await act(async () => {
      fireEvent.press(codeHeader);
    });

    // JSON content should be hidden again
    expect(queryByText(/"action":\s*"volunteer_cancel"/)).toBeNull();
  });

  test('successfully executes sync process when Flush Outbox button is pressed', async () => {
    mockLocalDispatcherTyped.syncOutbox.mockResolvedValueOnce(undefined);
    mockLocalDispatcherTyped.getSyncEngine().pushChanges.mockResolvedValueOnce(undefined);

    const { getByTestId, getByText } = render(<AdminOutbox />);
    await act(async () => {
      await flushPromises();
    });

    const flushBtn = getByTestId('flush-outbox');
    
    // Press Flush Button
    await act(async () => {
      fireEvent.press(flushBtn);
    });

    // Verify dispatcher operations were called in correct sequence
    expect(mockLocalDispatcherTyped.syncOutbox).toHaveBeenCalledWith(globalRemoteDispatcher);
    expect(mockLocalDispatcherTyped.getSyncEngine().pushChanges).toHaveBeenCalled();

    // Verify status transitions
    expect(getByText('Sync Completed Successfully!')).toBeTruthy();

    // Verify success Alert is triggered
    expect(alertSpy).toHaveBeenCalledWith(
      'Outbox Sync',
      'Synchronization and queue flush completed successfully.'
    );
  });

  test('successfully executes sync process when Sync Outbox Now button is pressed', async () => {
    mockLocalDispatcherTyped.syncOutbox.mockResolvedValueOnce(undefined);
    mockLocalDispatcherTyped.getSyncEngine().pushChanges.mockResolvedValueOnce(undefined);

    const { getByTestId, getByText } = render(<AdminOutbox />);
    await act(async () => {
      await flushPromises();
    });

    const syncBtn = getByTestId('sync-outbox-now');
    
    // Press Sync Button
    await act(async () => {
      fireEvent.press(syncBtn);
    });

    // Verify dispatcher operations were called in correct sequence
    expect(mockLocalDispatcherTyped.syncOutbox).toHaveBeenCalledWith(globalRemoteDispatcher);
    expect(mockLocalDispatcherTyped.getSyncEngine().pushChanges).toHaveBeenCalled();

    // Verify success Alert is triggered
    expect(alertSpy).toHaveBeenCalledWith(
      'Outbox Sync',
      'Synchronization and queue flush completed successfully.'
    );
  });

  test('handles synchronization errors gracefully', async () => {
    const errorMsg = 'Failed to fetch Supabase Edge Function: Network Error';
    mockLocalDispatcherTyped.syncOutbox.mockRejectedValueOnce(new Error(errorMsg));

    const { getByTestId, getByText } = render(<AdminOutbox />);
    await act(async () => {
      await flushPromises();
    });

    const flushBtn = getByTestId('flush-outbox');

    // Press Flush Button to trigger failure
    await act(async () => {
      fireEvent.press(flushBtn);
    });

    // Verify error messages display in status text and alert dialog
    expect(getByText(`Sync Failed: ${errorMsg}`)).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Outbox Sync Error', errorMsg);
  });

  test('formatTimestamp correctly returns N/A for invalid date', () => {
    expect(formatTimestamp(null)).toBe('N/A');
    expect(formatTimestamp(new Date('invalid'))).toBe('N/A');
    expect(formatTimestamp('2023-01-01' as any)).toBe('N/A'); // Not a Date instance
  });

  test('CodePayload handles invalid JSON data without crashing', async () => {
    const invalidJsonString = '{"bad": "json"';
    const { getByTestId, getByText } = render(<CodePayload data={invalidJsonString} title="Test Title" />);
    
    // Press to expand
    const codeHeader = getByTestId('code-payload').children[0] as any;
    await act(async () => {
      fireEvent.press(codeHeader);
    });

    // It should render the string directly instead of formatted json
    expect(getByText('{"bad": "json"')).toBeTruthy();
  });

  test('handles invalid JSON in outbox and quarantine items gracefully', async () => {
    mockOutboxData = [
      {
        id: 'outbox-invalid-1',
        commandId: 'cmd-outbox-inv',
        jobType: 'DISPATCH_AUTHORITATIVE',
        payload: '{"bad": "json"', // invalid json
        status: 'pending',
        attempts: 0,
        createdAt: new Date('2026-05-30T10:00:00.000Z'),
      }
    ];

    mockQuarantineData = [
      {
        id: 'quarantine-invalid-1',
        commandId: 'cmd-quar-inv',
        actorRef: '{"bad": "json"', // invalid json
        payload: '{"bad": "json"', // invalid json
        error: 'Some error',
        createdAt: new Date('2026-05-30T11:00:00.000Z'),
      }
    ];

    const { getByText } = render(<AdminOutbox />);
    await act(async () => {
      await flushPromises();
    });

    expect(getByText('Job: outbox-inv...')).toBeTruthy();
    expect(getByText('Quarantine: quarantine...')).toBeTruthy();
  });

  test('displays syncing indicators during active synchronization', async () => {
    let resolveSync: (value?: void | PromiseLike<void>) => void;
    const syncPromise = new Promise<void>((resolve) => {
      resolveSync = resolve;
    });
    mockLocalDispatcherTyped.syncOutbox.mockReturnValueOnce(syncPromise);

    const { getByTestId, getByText } = render(<AdminOutbox />);
    await act(async () => {
      await flushPromises();
    });

    const flushBtn = getByTestId('flush-outbox');
    
    // Trigger sync but do not await full completion yet
    await act(async () => {
      fireEvent.press(flushBtn);
    });

    // Now syncing state should be active
    expect(getByTestId('flush-outbox')).toBeTruthy();
    expect(getByText('Syncing...')).toBeTruthy();
    expect(getByText('Step 1/2: Replaying outbox commands to remote...')).toBeTruthy();

    // Resolve the promise
    await act(async () => {
      resolveSync!();
      await flushPromises();
    });
  });

  test('fetchQueueData handles db connection errors gracefully', async () => {
    mockShouldDbThrow = true;
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminOutbox />);
    await act(async () => {
      await flushPromises();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to load queue data:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
