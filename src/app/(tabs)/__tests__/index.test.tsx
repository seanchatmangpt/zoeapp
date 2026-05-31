import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Set up mocks before importing the component
let mockDbRecords: any[] = [
  {
    id: 'mock-rec-id',
    commandId: 'mock-cmd-id',
    actorRef: JSON.stringify({ identityBoundary: 'verified', disclosures: [] }),
    status: 'confirmed',
    deltaHash: 'mock-hash-123',
    eventIds: JSON.stringify([1]),
  }
];

const mockDb = {
  insert: jest.fn(() => ({
    values: jest.fn(() => Promise.resolve()),
  })),
  select: jest.fn(() => ({
    from: jest.fn(() => ({
      where: jest.fn(() => Promise.resolve(mockDbRecords)),
    })),
  })),
};

jest.mock('@/src/lib/db/db', () => ({
  db: mockDb,
}));

jest.mock('@/src/lib/db/schema', () => ({
  actorReceipts: {
    id: 'id',
    commandId: 'commandId',
    actorRef: 'actorRef',
    status: 'status',
    deltaHash: 'deltaHash',
    eventIds: 'eventIds',
    error: 'error',
    createdAt: 'createdAt',
  },
}));

const mockMmkvValues = new Map<string, string>();
const mockMmkvInstance = {
  set: jest.fn((key: string, value: string) => {
    mockMmkvValues.set(key, value);
  }),
  getString: jest.fn((key: string) => mockMmkvValues.get(key) || 'mock-value'),
};

jest.mock('@/src/lib/store/mmkvStorage', () => ({
  mmkvInstance: mockMmkvInstance,
}));



jest.mock('drizzle-orm', () => ({
  eq: jest.fn((col, val) => ({ col, val })),
}));

jest.mock('@/src/lib/crypto/receipts', () => ({
  generateBlake3ReceiptHash: jest.fn(() => 'mock-hash-123'),
  blake3: jest.fn(() => 'mock-hash-123'),
}));

// Mock SessionProvider
jest.mock('@/context/SessionProvider', () => ({
  useSession: () => ({
    session: {
      user: {
        id: 'test-user-uuid',
        email: 'test@example.com',
      },
    },
    loading: false,
  }),
}));

// Mock expo-router Link
jest.mock('expo-router', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    Link: ({ children, onPress, ...props }: any) => {
      // Create a mock child that intercepts the press
      return React.cloneElement(children, {
        ...props,
        onPress: (e: any) => {
          if (children.props.onPress) children.props.onPress(e);
          if (onPress) onPress(e);
        },
      });
    },
  };
});

const IndexComponent = require('../index').default;

describe('Index Tab Consequence Supervision Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ receipt: { receipt_hash: 'mock-hash-123' } }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should render welcome message with username', async () => {
    const { getByText } = render(<IndexComponent />);

    // Username derived from test@example.com is "test"
    await waitFor(() => {
      expect(getByText('Welcome back, test! 👋')).toBeTruthy();
    });
  });

  test('should trigger volunteer cancellation and show status states', async () => {
    jest.useFakeTimers();
    const { getByTestId, getByText, queryByText, queryByTestId, getAllByText } = render(<IndexComponent />);

    const cancelBtn = getByTestId('volunteer-cancel-btn');

    // Wait for the UI to be ready
    await waitFor(() => {
      expect(getByText('Trigger Volunteer Cancellation')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(cancelBtn);
    });

    // Check loading state (while timer is pending)
    expect(getAllByText('Processing...')[0]).toBeTruthy();
    expect(getAllByText('Processing Sync...')[0]).toBeTruthy();

    // Verify locking overlay and verification spinner are presented
    expect(getByTestId('locking-overlay')).toBeTruthy();
    expect(getByTestId('verification-spinner')).toBeTruthy();

    // Verify checklist items are rendered in the overlay
    expect(getByText('Querying Supabase Authority')).toBeTruthy();
    expect(getByText('Validating BLAKE3 Signature')).toBeTruthy();
    expect(getByText('Persisting to Local Storage')).toBeTruthy();
    expect(getByText('Confirming Database Sync')).toBeTruthy();

    // Advance timers by 800ms to trigger the fetch
    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    // Wait for the mock fetch to resolve and state to update to confirmed
    await waitFor(() => {
      expect(getByText('All Evidence Reconciled')).toBeTruthy();
      expect(getByText('mock-hash-123')).toBeTruthy();
    });

    // Status texts
    expect(getByText('1')).toBeTruthy(); // Confirmed receipts count

    // Verify locking overlay is dismissed (unlocked)
    expect(queryByTestId('locking-overlay')).toBeNull();

    jest.useRealTimers();
  });

  test('should handle API failure gracefully and allow close overlay', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.reject(new Error('Network Error'))
    ) as jest.Mock;

    const { getByTestId, getByText, queryByTestId, queryByText } = render(<IndexComponent />);
    const cancelBtn = getByTestId('volunteer-cancel-btn');

    await act(async () => {
      fireEvent.press(cancelBtn);
    });

    // Verify overlay is active and checklist is rendering
    expect(getByTestId('locking-overlay')).toBeTruthy();
    expect(getByText('Querying Supabase Authority')).toBeTruthy();

    // Advance timers by 800ms to trigger the fetch
    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    // Wait for the failure state
    await waitFor(() => {
      expect(getByText('Reconciliation Failed')).toBeTruthy();
      expect(getByText('Verification Failed')).toBeTruthy();
      expect(getByText('Querying Supabase Authority (failed)')).toBeTruthy();
    });

    // Check that close button is shown in overlay
    const closeBtn = getByTestId('overlay-close-btn');
    expect(closeBtn).toBeTruthy();

    // Click close button
    await act(async () => {
      fireEvent.press(closeBtn);
    });

    // Verify locking overlay is dismissed
    expect(queryByTestId('locking-overlay')).toBeNull();
    
    // Reconciliation Failed should still be on main screen
    expect(getByText('Reconciliation Failed')).toBeTruthy();

    jest.useRealTimers();
  });
});
