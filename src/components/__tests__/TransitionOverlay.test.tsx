import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { TransitionOverlay } from '../TransitionOverlay';
import { useSession } from '@/context/SessionProvider';
import { useColorScheme } from '@/src/components/useColorScheme';

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
  let springSpy: jest.SpyInstance;
  let parallelSpy: jest.SpyInstance;

  beforeEach(() => {
    startMock = jest.fn();
    stopMock = jest.fn();
    timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(() => {
      return {
        start: startMock,
        stop: stopMock,
      } as any;
    });
    springSpy = jest.spyOn(Animated, 'spring').mockImplementation(() => {
      return {
        start: startMock,
        stop: stopMock,
      } as any;
    });
    parallelSpy = jest.spyOn(Animated, 'parallel').mockImplementation(() => {
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
    springSpy.mockRestore();
    parallelSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('should not render anything when isTransitioning is false', () => {
    const { toJSON } = render(<TransitionOverlay />);
    expect(toJSON()).toBeNull();
  });

  test('should render welcome text and start parallel animation for signin transition in light mode', () => {
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
        duration: 300,
        useNativeDriver: true,
      })
    );
    expect(springSpy).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    );
    expect(parallelSpy).toHaveBeenCalled();
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  test('should render signing out text and start parallel animation for signout transition in dark mode', () => {
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
        duration: 300,
        useNativeDriver: true,
      })
    );
    expect(parallelSpy).toHaveBeenCalled();
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  test('should trigger fade-out animation and hide overlay when transitioning ceases', async () => {
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

    mockUseSession.mockReturnValue({
      session: null,
      loading: false,
      isTransitioning: false,
      transitionType: 'signin',
      setIsTransitioning: jest.fn(),
    });

    rerender(<TransitionOverlay />);

    expect(timingSpy).toHaveBeenLastCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      })
    );
    expect(startMock).toHaveBeenCalledTimes(2);

    const startCallback = startMock.mock.calls[1][0];
    expect(startCallback).toBeInstanceOf(Function);

    await act(async () => {
      startCallback({ finished: true });
    });

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
    // Timing and Spring stops are called
    expect(stopMock).toHaveBeenCalledTimes(2);
  });
});
