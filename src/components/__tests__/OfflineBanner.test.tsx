import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { OfflineBanner } from '../OfflineBanner';
import { useActorOpsStore } from '@/src/lib/actor/actorOps';

describe('OfflineBanner Component', () => {
  beforeEach(() => {
    // Reset state to online by default
    act(() => {
      useActorOpsStore.getState().setNetworkOnline(true);
    });
    jest.useRealTimers();
  });

  test('should render nothing when device is online', () => {
    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
  });

  test('should render offline banner when device is offline', () => {
    // Set state to offline
    act(() => {
      useActorOpsStore.getState().setNetworkOnline(false);
    });

    const { getByTestId, getByText } = render(<OfflineBanner />);
    
    const banner = getByTestId('offline-banner');
    expect(banner).toBeTruthy();
    expect(getByText('Device Offline — Using Pre-Admission Tension Queue')).toBeTruthy();
  });

  test('should have accessibility properties configured correctly', () => {
    // Set state to offline
    act(() => {
      useActorOpsStore.getState().setNetworkOnline(false);
    });

    const { getByTestId } = render(<OfflineBanner />);
    const banner = getByTestId('offline-banner');

    expect(banner.props.accessible).toBe(true);
    expect(banner.props.accessibilityRole).toBe('alert');
    expect(banner.props.accessibilityLabel).toBe('Device Offline — Using Pre-Admission Tension Queue');
  });

  test('should enter reconnecting state and eventually trigger setNetworkOnline(true)', () => {
    jest.useFakeTimers();
    act(() => {
      useActorOpsStore.getState().setNetworkOnline(false);
    });

    const setNetworkOnlineSpy = jest.spyOn(useActorOpsStore.getState(), 'setNetworkOnline');

    const { getByTestId, getByText, queryByTestId } = render(<OfflineBanner />);
    
    const reconnectButton = getByTestId('reconnect-button');
    expect(reconnectButton).toBeTruthy();

    // Trigger reconnect press
    act(() => {
      fireEvent.press(reconnectButton);
    });

    // Check we entered reconnecting state
    expect(getByText('Reconnecting to Truex Membrane...')).toBeTruthy();
    expect(getByTestId('reconnecting-indicator')).toBeTruthy();
    expect(queryByTestId('reconnect-button')).toBeNull();

    // Advance timers to trigger the actual network state change
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(setNetworkOnlineSpy).toHaveBeenCalledWith(true);
    setNetworkOnlineSpy.mockRestore();
  });

  test('should display success connection message when transitioning to online, then disappear', async () => {
    jest.useFakeTimers();
    act(() => {
      useActorOpsStore.getState().setNetworkOnline(false);
    });

    const { getByText, queryByTestId, rerender } = render(<OfflineBanner />);
    
    // Simulate transitioning to online using the store action
    act(() => {
      useActorOpsStore.getState().setNetworkOnline(true);
    });

    // Rerender component to receive the mock hook state update
    rerender(<OfflineBanner />);

    // Let the state update propagate in React lifecycle
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Check that we see connection restored message
    expect(getByText('Connection Restored')).toBeTruthy();

    // Check that it's still there before 1.5s
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(getByText('Connection Restored')).toBeTruthy();

    // Advance beyond 1.5s + 350ms anim duration to ensure it is completely idle and returns null
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Rerender to reflect the idle state in the tree after animations finish
    rerender(<OfflineBanner />);

    expect(queryByTestId('offline-banner')).toBeNull();
  });
});
