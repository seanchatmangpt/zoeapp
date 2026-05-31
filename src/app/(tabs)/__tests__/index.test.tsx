import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Index from '../index';

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

describe('Index Tab Dashboard Unit Tests', () => {
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
    const { getByText } = render(<Index />);

    // Username derived from test@example.com is "test"
    await waitFor(() => {
      expect(getByText('Welcome back, test! 👋')).toBeTruthy();
    });
  });

  test('should trigger volunteer cancellation and show status states', async () => {
    jest.useFakeTimers();
    const { getByTestId, getByText, queryByText } = render(<Index />);

    const cancelBtn = getByTestId('volunteer-cancel-btn');

    // Wait for the UI to be ready
    await waitFor(() => {
      expect(getByText('Trigger Volunteer Cancellation')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(cancelBtn);
    });

    // Check loading state (while timer is pending)
    expect(getByText('Processing...')).toBeTruthy();
    expect(getByText('Processing Sync...')).toBeTruthy();

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
    jest.useRealTimers();
  });

  test('should handle API failure gracefully', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.reject(new Error('Network Error'))
    ) as jest.Mock;

    const { getByTestId, getByText } = render(<Index />);
    const cancelBtn = getByTestId('volunteer-cancel-btn');

    await act(async () => {
      fireEvent.press(cancelBtn);
    });

    // Advance timers by 800ms to trigger the fetch
    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(getByText('Reconciliation Failed')).toBeTruthy();
    });
    jest.useRealTimers();
  });
});
