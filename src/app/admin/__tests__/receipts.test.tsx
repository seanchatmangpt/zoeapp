import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AdminReceipts from '../receipts';
import { db } from '../../../lib/db/db';

jest.mock('../../../lib/db/db', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        orderBy: jest.fn(),
      })),
    })),
  },
}));

jest.mock('../../../lib/db/schema', () => ({
  actorReceipts: {
    createdAt: 'createdAt',
  },
}));

jest.mock('drizzle-orm', () => ({
  desc: jest.fn((col) => `desc(${col})`),
}));

// Simple mocks for nested components to prevent React Native rendering issues
jest.mock('../../../components/admin/AdminShell', () => ({
  AdminShell: ({ title, children }: any) => <>{title}{children}</>,
}));
jest.mock('../../../components/admin/AdminCard', () => ({
  AdminCard: ({ title, children, headerRight }: any) => {
    const { View, Text } = require('react-native');
    return <View><Text>{title}</Text><View>{headerRight}</View>{children}</View>;
  },
}));
jest.mock('../../../components/admin/ReceiptBadge', () => ({
  ReceiptBadge: ({ status }: any) => <>{status}</>,
}));
jest.mock('../../../components/admin/ActorRefView', () => ({
  ActorRefView: ({ actorRef }: any) => <>{actorRef?.id}</>,
}));
jest.mock('../../../components/admin/JsonInspector', () => ({
  JsonInspector: ({ title }: any) => <>{title}</>,
}));

describe('AdminReceipts Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state initially or when no records', async () => {
    // Mock db to return empty list
    const mockOrderBy = jest.fn().mockResolvedValue([]);
    (db.select as jest.Mock).mockImplementation(() => ({
      from: () => ({
        orderBy: mockOrderBy,
      }),
    }));

    const { getByText } = render(<AdminReceipts />);
    
    await waitFor(() => {
      expect(mockOrderBy).toHaveBeenCalled();
    });

    expect(getByText('No Receipts Found')).toBeTruthy();
    expect(getByText('Dispatched commands will appear here.')).toBeTruthy();
  });

  it('renders a list of receipts when data is available', async () => {
    const mockData = [
      {
        id: 'rec_1234567890',
        commandId: 'cmd_abc',
        status: 'accepted',
        createdAt: new Date().toISOString(),
        actorRef: { kind: 'Sermon', id: 'sermon_1' },
        deltaHash: 'hash_xyz123',
        eventIds: '["evt_1", "evt_2"]',
        error: null,
      },
      {
        id: 'rec_0987654321',
        commandId: 'cmd_def',
        status: 'rejected',
        createdAt: new Date().toISOString(),
        actorRef: { kind: 'Prayer', id: 'prayer_2' },
        deltaHash: null,
        eventIds: '[]',
        error: 'Validation Error',
      }
    ];

    const mockOrderBy = jest.fn().mockResolvedValue(mockData);
    (db.select as jest.Mock).mockImplementation(() => ({
      from: () => ({
        orderBy: mockOrderBy,
      }),
    }));

    const { getByText } = render(<AdminReceipts />);

    await waitFor(() => {
      expect(getByText('Receipt: rec_1234...')).toBeTruthy();
      expect(getByText('cmd_abc')).toBeTruthy();
      expect(getByText('hash_xyz123...')).toBeTruthy();
      
      expect(getByText('Receipt: rec_0987...')).toBeTruthy();
      expect(getByText('cmd_def')).toBeTruthy();
      expect(getByText('Failure Reason')).toBeTruthy();
      expect(getByText('Validation Error')).toBeTruthy();
    });
  });

  it('handles error during fetch gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockOrderBy = jest.fn().mockRejectedValue(new Error('DB Error'));
    (db.select as jest.Mock).mockImplementation(() => ({
      from: () => ({
        orderBy: mockOrderBy,
      }),
    }));

    const { getByText } = render(<AdminReceipts />);

    await waitFor(() => {
      expect(mockOrderBy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load receipts:', expect.any(Error));
    });

    expect(getByText('No Receipts Found')).toBeTruthy();
    
    consoleErrorSpy.mockRestore();
  });
});
