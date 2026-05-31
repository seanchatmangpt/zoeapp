import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminConsequenceSupervision from '../consequence-supervision';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { generateReceiptHash } from '../../../lib/crypto/receipts';
import { useActorOpsStore } from '../../../lib/actor/actorOps';

// Store mock Drizzle records
const mockStore = {
  outbox: [] as any[],
  quarantine: [] as any[],
  receipts: [] as any[],
  quads: [] as any[],
};

// Spy function to inspect SQL calls
const mockSqlCallSpy = jest.fn();

// Mock drizzle-orm operators
jest.mock('drizzle-orm', () => {
  return {
    count: jest.fn(() => 'count'),
    eq: jest.fn((col, val) => ({ type: 'eq', col, val, _id: val })),
    desc: jest.fn((col) => ({ type: 'desc', col })),
    or: jest.fn((...args) => ({ type: 'or', args })),
  };
});

// Mock database client
jest.mock('../../../lib/db/db', () => {
  const { actorOutbox, actorQuarantine, actorReceipts, quads } = require('../../../lib/db/schema');

  function getTableName(table: any) {
    if (table === actorOutbox) return 'actor_outbox';
    if (table === actorQuarantine) return 'actor_quarantine';
    if (table === actorReceipts) return 'actor_receipts';
    if (table === quads) return 'quads';
    return 'unknown';
  }

  class MockChain {
    private tableName: string = '';
    private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
    private whereClause: any = null;
    private selectFields: any = null;
    private limitVal: number | null = null;
    private insertValues: any = null;
    private updateValues: any = null;
    private groupByField: any = null;

    constructor(action: 'select' | 'insert' | 'update' | 'delete', fieldsOrTable?: any) {
      this.action = action;
      if (action === 'select') {
        this.selectFields = fieldsOrTable;
      } else {
        this.tableName = getTableName(fieldsOrTable);
      }
    }

    from(table: any) {
      this.tableName = getTableName(table);
      return this;
    }

    values(values: any) {
      this.insertValues = values;
      return this;
    }

    set(values: any) {
      this.updateValues = values;
      return this;
    }

    where(cond: any) {
      this.whereClause = cond;
      return this;
    }

    orderBy() {
      return this;
    }

    limit(n: number) {
      this.limitVal = n;
      return this;
    }

    groupBy(field: any) {
      this.groupByField = field;
      return this;
    }

    returning() {
      return this;
    }

    then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
      return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
    }

    private execute() {
      mockSqlCallSpy({
        action: this.action,
        table: this.tableName,
        where: this.whereClause,
        values: this.insertValues || this.updateValues,
        limit: this.limitVal,
        groupBy: this.groupByField,
      });

      if (this.action === 'select') {
        let data: any[] = [];
        if (this.tableName === 'actor_quarantine') {
          data = [...mockStore.quarantine];
        } else if (this.tableName === 'actor_outbox') {
          data = [...mockStore.outbox];
        } else if (this.tableName === 'actor_receipts') {
          data = [...mockStore.receipts];
        } else if (this.tableName === 'quads') {
          data = [...mockStore.quads];
        }

        const isCountOnly = this.selectFields && Object.keys(this.selectFields).length === 1 && this.selectFields.value;
        const isGroupByStatus = this.selectFields && this.selectFields.status && this.selectFields.value;

        if (this.whereClause) {
          if (this.tableName === 'actor_outbox') {
            if (this.whereClause._id) {
              data = data.filter(x => x.id === this.whereClause._id);
            } else {
              data = data.filter(x => x.status === 'pending');
            }
          }
        }

        if (isCountOnly) {
          return [{ value: data.length }];
        }

        if (isGroupByStatus) {
          const statusCounts: Record<string, number> = {
            accepted_pending: 0,
            rejected_local: 0,
            applied_local: 0,
            applied_remote: 0,
            rejected_remote: 0,
            quarantined: 0,
          };
          data.forEach(item => {
            const s = item.status || 'unknown';
            if (s in statusCounts) {
              statusCounts[s]++;
            }
          });
          return Object.entries(statusCounts).map(([status, val]) => ({
            status,
            value: val,
          }));
        }

        if (this.limitVal !== null) {
          data = data.slice(0, this.limitVal);
        }

        return data;
      }

      if (this.action === 'insert') {
        if (this.tableName === 'actor_outbox') {
          const newRecord = { ...this.insertValues };
          mockStore.outbox.push(newRecord);
          return [newRecord];
        }
      }

      if (this.action === 'update') {
        if (this.tableName === 'actor_outbox') {
          const idToUpdate = this.whereClause?._id;
          mockStore.outbox = mockStore.outbox.map(item => {
            if (!idToUpdate || item.id === idToUpdate) {
              return { ...item, ...this.updateValues };
            }
            return item;
          });
        }
        return [];
      }

      if (this.action === 'delete') {
        if (this.tableName === 'actor_quarantine') {
          const idToDelete = this.whereClause?._id;
          mockStore.quarantine = mockStore.quarantine.filter(item => {
            if (idToDelete) {
              return item.id !== idToDelete;
            }
            return true;
          });
        }
        return [];
      }

      return [];
    }
  }

  return {
    db: {
      select: jest.fn().mockImplementation((fields) => new MockChain('select', fields)),
      insert: jest.fn().mockImplementation((table) => new MockChain('insert', table)),
      update: jest.fn().mockImplementation((table) => new MockChain('update', table)),
      delete: jest.fn().mockImplementation((table) => new MockChain('delete', table)),
    }
  };
});

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const React = require('react');
  const MockFontAwesome = (props: any) => React.createElement('View', props);
  MockFontAwesome.displayName = 'MockFontAwesome';
  return MockFontAwesome;
});

describe('Admin Consequence Supervision console tests', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockStore.outbox = [];
    mockStore.quarantine = [];
    mockStore.receipts = [];
    mockStore.quads = [];
    useActorOpsStore.setState({ outboxCount: 0, quarantineCount: 0 });
  });

  it('renders correctly with secure empty state', async () => {
    const { getByText, queryByText } = render(<AdminConsequenceSupervision />);

    // Fast-forward initial timer load or wait for refreshCounts
    await waitFor(() => {
      expect(getByText('ISOLATION VAULT SECURE')).toBeTruthy();
    });

    expect(queryByText('CONSEQUENCE ENGINE ALERT')).toBeNull();
  });

  it('displays quarantined item when quarantine table has items', async () => {
    const mockQuarantinedItem = {
      id: 'flow-test-id-12345',
      commandId: 'cmd-test-id-67890',
      actorRef: JSON.stringify({ id: 'actor-test-ref' }),
      payload: JSON.stringify({ data: 'mock-payload-data' }),
      error: 'Simulated contract divergence error description',
      createdAt: new Date(),
    };
    mockStore.quarantine.push(mockQuarantinedItem);
    useActorOpsStore.setState({ quarantineCount: 1 });

    const { getByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('CONSEQUENCE ENGINE ALERT')).toBeTruthy();
    });

    // Check if the Flow ID (truncated) is displayed
    expect(getByText('Flow ID: flow-test-...')).toBeTruthy();
    expect(getByText('Simulated contract divergence error description')).toBeTruthy();
  });

  it('triggers Force Replay command action which issues queries and cleans quarantine list state', async () => {
    const mockQuarantinedItem = {
      id: 'flow-replay-id',
      commandId: 'cmd-replay-id',
      actorRef: JSON.stringify({ id: 'actor-replay-ref' }),
      payload: JSON.stringify({ data: 'mock-payload-data' }),
      error: 'Divergence error',
      createdAt: new Date(),
    };
    mockStore.quarantine.push(mockQuarantinedItem);
    useActorOpsStore.setState({ quarantineCount: 1 });

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('Divergence error')).toBeTruthy();
    });

    const replayButton = getByText('Force Replay');
    
    await act(async () => {
      fireEvent.press(replayButton);
    });

    // Verify Alert.alert was called to confirm replay dispatch
    expect(alertSpy).toHaveBeenCalledWith(
      'Replay Dispatched',
      'The command has been returned to the outbox queue.'
    );

    // Verify SQL calls spy has been called with the insert/delete actions
    expect(mockSqlCallSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'insert',
      table: 'actor_outbox',
    }));
    
    expect(mockSqlCallSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delete',
      table: 'actor_quarantine',
    }));

    // Verify state updates (quarantine count is now 0, outbox is 1)
    await waitFor(() => {
      expect(mockStore.quarantine.length).toBe(0);
      expect(mockStore.outbox.length).toBe(1);
    });
  });

  it('triggers Purge Record action which pops confirmation Alert, issues delete query and updates quarantine state', async () => {
    const mockQuarantinedItem = {
      id: 'flow-purge-id',
      commandId: 'cmd-purge-id',
      actorRef: JSON.stringify({ id: 'actor-purge-ref' }),
      payload: JSON.stringify({ data: 'mock-payload-data' }),
      error: 'Validation failure error',
      createdAt: new Date(),
    };
    mockStore.quarantine.push(mockQuarantinedItem);
    useActorOpsStore.setState({ quarantineCount: 1 });

    // Mock Alert.alert to execute the destructive 'Purge' button immediately
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      if (buttons) {
        const purgeBtn = buttons.find(b => b.text === 'Purge');
        if (purgeBtn && purgeBtn.onPress) {
          purgeBtn.onPress();
        }
      }
    });

    const { getByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('Validation failure error')).toBeTruthy();
    });

    const purgeButton = getByText('Purge Record');

    await act(async () => {
      fireEvent.press(purgeButton);
    });

    // Check that Alert was prompted to confirm purge
    expect(alertSpy).toHaveBeenCalledWith(
      'Confirm Purge',
      expect.any(String),
      expect.any(Array)
    );

    // Verify that the delete SQL action was invoked
    expect(mockSqlCallSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delete',
      table: 'actor_quarantine',
    }));

    // State is updated cleanly
    await waitFor(() => {
      expect(mockStore.quarantine.length).toBe(0);
    });
  });

  it('displays VERIFIED in Receipt Integrity when receipt chain is valid', async () => {
    mockStore.receipts.push({
      id: 'rec-1',
      commandId: 'cmd-1',
      actorRef: JSON.stringify({ id: 'actor-1' }),
      status: 'applied_local',
      eventIds: JSON.stringify(['evt-1']),
      createdAt: new Date(2026, 5, 30, 10, 0, 0),
    });

    const { getByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('VERIFIED')).toBeTruthy();
    });
  });

  it('displays TAMPERED in Receipt Integrity when receipt chain has mismatched hashes', async () => {
    mockStore.receipts.push({
      id: 'rec-1',
      commandId: 'cmd-1',
      actorRef: JSON.stringify({ id: 'actor-1' }),
      status: 'applied_local',
      deltaHash: 'mismatched-hash-value-12345',
      eventIds: JSON.stringify(['evt-1']),
      createdAt: new Date(2026, 5, 30, 10, 0, 0),
    });

    const { getByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('TAMPERED')).toBeTruthy();
    });
  });

  it('displays VERIFIED when receipt chain has valid matching hashes', async () => {
    const data1 = {
      commandId: 'cmd-1',
      status: 'applied_local',
      error: undefined,
    };
    const hash1 = generateReceiptHash('', data1);

    mockStore.receipts.push({
      id: 'rec-1',
      commandId: 'cmd-1',
      actorRef: JSON.stringify({ id: 'actor-1' }),
      status: 'applied_local',
      deltaHash: hash1,
      eventIds: JSON.stringify(['evt-1']),
      createdAt: new Date(2026, 5, 30, 10, 0, 0),
    });

    const { getByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('VERIFIED')).toBeTruthy();
    });
  });

  it('calculates and displays metrics distribution percentages correctly', async () => {
    mockStore.receipts.push(
      {
        id: 'rec-1',
        commandId: 'cmd-1',
        actorRef: JSON.stringify({ id: 'actor-1' }),
        status: 'applied_local',
        eventIds: JSON.stringify(['evt-1']),
        createdAt: new Date(2026, 5, 30, 10, 0, 0),
      },
      {
        id: 'rec-2',
        commandId: 'cmd-2',
        actorRef: JSON.stringify({ id: 'actor-1' }),
        status: 'applied_local',
        eventIds: JSON.stringify(['evt-2']),
        createdAt: new Date(2026, 5, 30, 10, 1, 0),
      },
      {
        id: 'rec-3',
        commandId: 'cmd-3',
        actorRef: JSON.stringify({ id: 'actor-1' }),
        status: 'rejected_local',
        eventIds: JSON.stringify([]),
        createdAt: new Date(2026, 5, 30, 10, 2, 0),
      },
      {
        id: 'rec-4',
        commandId: 'cmd-4',
        actorRef: JSON.stringify({ id: 'actor-1' }),
        status: 'quarantined',
        eventIds: JSON.stringify([]),
        createdAt: new Date(2026, 5, 30, 10, 3, 0),
      }
    );

    const { getByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('Applied: 2 (50%)')).toBeTruthy();
      expect(getByText('Rejected: 1 (25%)')).toBeTruthy();
      expect(getByText('Quarantined: 1 (25%)')).toBeTruthy();
    });
  });

  it('displays latest refusal details if present', async () => {
    mockStore.receipts.push({
      id: 'rec-refusal',
      commandId: 'cmd-refusal-long-id-string-12345',
      actorRef: JSON.stringify({ id: 'actor-1' }),
      status: 'rejected_local',
      eventIds: JSON.stringify([]),
      error: 'Authority validation failed',
      createdAt: new Date(2026, 5, 30, 10, 5, 0),
    });

    const { getByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('rejected_local')).toBeTruthy();
      expect(getByText('cmd-refusal-lon...')).toBeTruthy();
    });
  });

  it('displays latest process receipt details when present in store state', async () => {
    useActorOpsStore.setState({
      latestReceipt: {
        id: 'rec-latest',
        commandId: 'cmd-latest-process-1234',
        actor: { tenantId: 'tenant-1', kind: 'user', id: 'usr-admin' },
        status: 'applied_remote',
        eventIds: [],
        createdAt: new Date().toISOString(),
        error: 'No error',
      },
    });

    const { getByText, queryByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('cmd-latest-process-1234')).toBeTruthy();
      expect(getByText('applied remote')).toBeTruthy();
      expect(getByText('No error')).toBeTruthy();
    });

    expect(queryByText('No commands executed in this session yet.')).toBeNull();
  });

  it('navigates when clicking a valid diagnostic card', async () => {
    const { getByText } = render(<AdminConsequenceSupervision />);
    await waitFor(() => expect(getByText('Quarantine Count')).toBeTruthy());
    const card = getByText('Quarantine Count');
    await act(async () => {
      fireEvent.press(card);
    });
    expect(mockPush).toHaveBeenCalledWith('/admin/outbox');
  });

  it('does nothing when clicking a diagnostic card without a route', async () => {
    const { getByText } = render(<AdminConsequenceSupervision />);
    await waitFor(() => expect(getByText('Runtime Health')).toBeTruthy());
    const card = getByText('Runtime Health');
    
    // It's disabled, so press might not fire, but we can call onPress directly to test the ternary null branch
    await act(async () => {
      if (card.parent && card.parent.props.onPress) {
        card.parent.props.onPress();
      } else {
        fireEvent.press(card);
      }
    });
    
    // mockPush should not be called
    expect(mockPush).not.toHaveBeenCalled(); 
  });

  it('advances timer and updates uptime', async () => {
    jest.useFakeTimers();
    const { getByText } = render(<AdminConsequenceSupervision />);
    
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      expect(getByText(/00:00:02/)).toBeTruthy();
    });
    
    jest.useRealTimers();
  });

  it('covers android platform initialization and animation experimental flag', () => {
    jest.isolateModules(() => {
      const { Platform, UIManager } = require('react-native');
      const originalOS = Platform.OS;
      Platform.OS = 'android';
      UIManager.setLayoutAnimationEnabledExperimental = jest.fn();
      
      require('../consequence-supervision');
      
      expect(UIManager.setLayoutAnimationEnabledExperimental).toHaveBeenCalledWith(true);
      Platform.OS = originalOS;
    });
  });

  it('handles error in refreshCounts safely', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { db } = require('../../../lib/db/db');
    
    // Make the first db.select throw an error to simulate load failure
    const originalSelect = db.select;
    db.select = jest.fn().mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    }).mockImplementation((...args: any[]) => originalSelect(...args));

    render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load metrics:', expect.any(Error));
    });

    db.select = originalSelect;
    consoleErrorSpy.mockRestore();
  });

  it('handles error in handleReplay safely', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockStore.quarantine.push({
      id: 'error-replay-id',
      commandId: 'cmd-replay-id',
      actorRef: JSON.stringify({ id: 'actor-replay-ref' }),
      payload: JSON.stringify({ data: 'mock' }),
      error: 'Divergence error',
      createdAt: new Date(),
    });
    useActorOpsStore.setState({ quarantineCount: 1 });

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<AdminConsequenceSupervision />);
    await waitFor(() => expect(getByText('Divergence error')).toBeTruthy());

    const { db } = require('../../../lib/db/db');
    const originalInsert = db.insert;
    db.insert = jest.fn().mockImplementation(() => {
      throw new Error('Insert failed');
    });

    const replayButton = getByText('Force Replay');
    await act(async () => {
      fireEvent.press(replayButton);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to replay quarantined item:', expect.any(Error));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to dispatch replay for this quarantined flow.');

    db.insert = originalInsert;
    consoleErrorSpy.mockRestore();
  });

  it('updates outbox entry correctly when replaying existing id', async () => {
    mockStore.quarantine.push({
      id: 'existing-id',
      commandId: 'cmd-replay-id',
      actorRef: JSON.stringify({ id: 'actor-replay-ref' }),
      payload: JSON.stringify({ data: 'mock' }),
      error: 'Divergence error',
      createdAt: new Date(),
    });
    // Add existing outbox item
    mockStore.outbox.push({
      id: 'existing-id',
      commandId: 'cmd-replay-id',
      status: 'error',
    });
    useActorOpsStore.setState({ quarantineCount: 1 });

    const { getByText } = render(<AdminConsequenceSupervision />);
    await waitFor(() => expect(getByText('Divergence error')).toBeTruthy());

    const replayButton = getByText('Force Replay');
    await act(async () => {
      fireEvent.press(replayButton);
    });

    expect(mockStore.outbox.find((o: any) => o.id === 'existing-id')?.status).toBe('pending');
  });

  it('handles error in handlePurge safely', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockStore.quarantine.push({
      id: 'error-purge-id',
      commandId: 'cmd-purge-id',
      actorRef: JSON.stringify({ id: 'actor-purge-ref' }),
      payload: JSON.stringify({ data: 'mock' }),
      error: 'Validation failure',
      createdAt: new Date(),
    });
    useActorOpsStore.setState({ quarantineCount: 1 });

    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      if (buttons) {
        const purgeBtn = buttons.find((b: any) => b.text === 'Purge');
        if (purgeBtn && purgeBtn.onPress) {
          purgeBtn.onPress();
        }
      }
    });

    const { getByText } = render(<AdminConsequenceSupervision />);
    await waitFor(() => expect(getByText('Validation failure')).toBeTruthy());

    const { db } = require('../../../lib/db/db');
    const originalDelete = db.delete;
    db.delete = jest.fn().mockImplementation(() => {
      throw new Error('Delete failed');
    });

    const purgeButton = getByText('Purge Record');
    await act(async () => {
      fireEvent.press(purgeButton);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to purge item:', expect.any(Error));

    db.delete = originalDelete;
    consoleErrorSpy.mockRestore();
  });

  it('renders Trace Conformance Analyzer and default TRUTHFUL report', async () => {
    const { getByText, getByTestId, getAllByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('Trace Conformance Analyzer')).toBeTruthy();
    });

    expect(getByText('Declared Workflow:')).toBeTruthy();
    expect(getByText('Scenario Trace Selector:')).toBeTruthy();
    expect(getByText('Fitness')).toBeTruthy();
    expect(getByText('Precision')).toBeTruthy();
    expect(getByText('Simplicity')).toBeTruthy();
    expect(getAllByText('TRUTHFUL').length).toBeGreaterThan(0);
    expect(getByText('Perfect Trace Conformance Verified')).toBeTruthy();
  });

  it('evaluates skipped, deviant, and malformed traces when scenario buttons are clicked', async () => {
    const { getByText, getByTestId, queryByText, getAllByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('Trace Conformance Analyzer')).toBeTruthy();
    });

    // Click DEVIANT button
    const deviantBtn = getByTestId('scenario-btn-deviant');
    await act(async () => {
      fireEvent.press(deviantBtn);
    });

    expect(getByText('VARIANCE')).toBeTruthy();
    expect(getByText('Detected Trace Deviations:')).toBeTruthy();
    expect(getByText('Found undeclared transition: VerifyFeed->UpdateDatabase')).toBeTruthy();

    // Click SKIPPED button
    const skippedBtn = getByTestId('scenario-btn-skipped');
    await act(async () => {
      fireEvent.press(skippedBtn);
    });

    expect(getByText('DECEPTIVE')).toBeTruthy();
    expect(getByText('Found undeclared transition: PublishSermon->VerifyFeed')).toBeTruthy();
  });

  it('simulates autonomic dispatch events when tension profile buttons are clicked', async () => {
    const { getByText, getByTestId, getAllByTestId, queryAllByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('Autonomic Dispatcher Event Log')).toBeTruthy();
    });

    // Assert default items exist
    expect(getByText('AL-001')).toBeTruthy();
    expect(getByText('AL-002')).toBeTruthy();

    // 1. Simulate Normal
    const normalBtn = getByTestId('simulate-btn-normal');
    await act(async () => {
      fireEvent.press(normalBtn);
    });
    expect(getAllByTestId('autonomic-log-item').length).toBe(3);

    // 2. Simulate Flood
    const floodBtn = getByTestId('simulate-btn-flood');
    await act(async () => {
      fireEvent.press(floodBtn);
    });
    expect(getAllByTestId('autonomic-log-item').length).toBe(4);

    // 3. Simulate Pressure
    const pressureBtn = getByTestId('simulate-btn-pressure');
    await act(async () => {
      fireEvent.press(pressureBtn);
    });
    expect(getAllByTestId('autonomic-log-item').length).toBe(5);
    expect(getByText('BATCH')).toBeTruthy();

    // 4. Simulate Oscillation
    const oscillationBtn = getByTestId('simulate-btn-oscillation');
    await act(async () => {
      fireEvent.press(oscillationBtn);
    });
    expect(getAllByTestId('autonomic-log-item').length).toBe(6);
    expect(getByText('QUARANTINE')).toBeTruthy();

    // 5. Simulate High Load
    const loadBtn = getByTestId('simulate-btn-high_load');
    await act(async () => {
      fireEvent.press(loadBtn);
    });
    expect(getAllByTestId('autonomic-log-item').length).toBe(7);
    expect(queryAllByText('SUPPRESS').length).toBeGreaterThan(0);
  });
});
