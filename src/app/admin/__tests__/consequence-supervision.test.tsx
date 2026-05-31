import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminConsequenceSupervision from '../consequence-supervision';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { generateReceiptHash } from '../../../lib/crypto/receipts';

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

// Mock Zustand Store
const mockUseActorOpsStore = create((set) => ({
  networkOnline: true,
  remoteRejectActive: false,
  currentPrincipal: { id: 'usr-admin', role: 'admin' },
  latestReceipt: null,
  latestEvent: null,
  outboxCount: 0,
  quarantineCount: 0,
  setCounts: (outbox: number, quarantine: number) => set({ outboxCount: outbox, quarantineCount: quarantine }),
}));

jest.mock('../../../lib/actor/actorOps', () => {
  return {
    useActorOpsStore: (selector?: any) => {
      if (selector) return selector(mockUseActorOpsStore.getState());
      return mockUseActorOpsStore();
    },
  };
});

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
    mockUseActorOpsStore.setState({ outboxCount: 0, quarantineCount: 0 });
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
    mockUseActorOpsStore.setState({ quarantineCount: 1 });

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
    mockUseActorOpsStore.setState({ quarantineCount: 1 });

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
    mockUseActorOpsStore.setState({ quarantineCount: 1 });

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
    mockUseActorOpsStore.setState({
      latestReceipt: {
        id: 'rec-latest',
        commandId: 'cmd-latest-process-1234',
        status: 'applied_remote',
        error: 'No error',
      },
    });

    const { getByText, queryByText } = render(<AdminConsequenceSupervision />);

    await waitFor(() => {
      expect(getByText('cmd-latest-process-1234')).toBeTruthy();
      expect(getByText('applied_remote')).toBeTruthy();
      expect(getByText('No error')).toBeTruthy();
    });

    expect(queryByText('No commands executed in this session yet.')).toBeNull();
  });
});
