import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { TransitionOverlay } from '../TransitionOverlay';
import { useSession } from '@/context/SessionProvider';
import { useColorScheme } from '@/src/components/useColorScheme';

// Mock the context and hook dependencies
jest.mock('@/context/SessionProvider', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/src/components/useColorScheme', () => ({
  useColorScheme: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;
const mockUseColorScheme = useColorScheme as jest.Mock;

describe('TransitionOverlay Component', () => {
  let startMock: jest.Mock;
  let stopMock: jest.Mock;
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    startMock = jest.fn();
    stopMock = jest.fn();
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(() => {
      return {
        start: startMock,
        stop: stopMock,
      } as any;
    });

    mockUseSession.mockReturnValue({
      session: null,
      loading: false,
      isTransitioning: false,
      transitionType: null,
      setIsTransitioning: jest.fn(),
    });

    mockUseColorScheme.mockReturnValue('light');
  });

  afterEach(() => {
    timingSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('should not render anything when isTransitioning is false', () => {
    const { toJSON } = render(<TransitionOverlay />);
    expect(toJSON()).toBeNull();
  });

  test('should render welcome text and start timing fade-in animation for signin transition in light mode', () => {
    mockUseSession.mockReturnValue({
      session: null,
      loading: false,
      isTransitioning: true,
      transitionType: 'signin',
      setIsTransitioning: jest.fn(),
    });

    const { getByText } = render(<TransitionOverlay />);

    expect(getByText('Welcome back!')).toBeTruthy();
    expect(getByText('Securing session & preparing your workspace')).toBeTruthy();

    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      })
    );
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  test('should render signing out text and start timing fade-in animation for signout transition in dark mode', () => {
    mockUseSession.mockReturnValue({
      session: null,
      loading: false,
      isTransitioning: true,
      transitionType: 'signout',
      setIsTransitioning: jest.fn(),
    });
    mockUseColorScheme.mockReturnValue('dark');

    const { getByText } = render(<TransitionOverlay />);

    expect(getByText('Signing out...')).toBeTruthy();
    expect(getByText('Clearing session cache & returning to login')).toBeTruthy();

    expect(timingSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      })
    );
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  test('should trigger fade-out animation and hide overlay when transitioning ceases', async () => {
    // Start with transitioning active
    mockUseSession.mockReturnValue({
      session: null,
      loading: false,
      isTransitioning: true,
      transitionType: 'signin',
      setIsTransitioning: jest.fn(),
    });

    const { getByText, queryByText, rerender } = render(<TransitionOverlay />);
    expect(getByText('Welcome back!')).toBeTruthy();
    expect(startMock).toHaveBeenCalledTimes(1);

    // Stop transitioning
    mockUseSession.mockReturnValue({
      session: null,
      loading: false,
      isTransitioning: false,
      transitionType: 'signin',
      setIsTransitioning: jest.fn(),
    });

    // Rerender component to trigger useEffect change
    rerender(<TransitionOverlay />);

    // Timing should be called again with toValue 0, duration 350
    expect(timingSpy).toHaveBeenLastCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      })
    );
    expect(startMock).toHaveBeenCalledTimes(2);

    // Retrieve start callback and trigger completion to verify setVisible(false) unmounts
    const startCallback = startMock.mock.calls[1][0];
    expect(startCallback).toBeInstanceOf(Function);

    await act(async () => {
      startCallback({ finished: true });
    });

    // Component should now return null/be empty
    expect(queryByText('Welcome back!')).toBeNull();
  });

  test('should stop current animation upon unmount', () => {
    mockUseSession.mockReturnValue({
      session: null,
      loading: false,
      isTransitioning: true,
      transitionType: 'signin',
      setIsTransitioning: jest.fn(),
    });

    const { unmount } = render(<TransitionOverlay />);
    expect(stopMock).not.toHaveBeenCalled();

    unmount();
    expect(stopMock).toHaveBeenCalledTimes(1);
  });
});
