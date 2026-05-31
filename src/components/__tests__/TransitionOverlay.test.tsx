import React from 'react';
import { render, act } from '@testing-library/react-native';
import { TransitionOverlay } from '../TransitionOverlay';
import { useSession } from '@/context/SessionProvider';
import { useColorScheme } from '@/src/components/useColorScheme';
import * as Reanimated from 'react-native-reanimated';

jest.mock('@/context/SessionProvider', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/src/components/useColorScheme', () => ({
  useColorScheme: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;
const mockUseColorScheme = useColorScheme as jest.Mock;

describe('TransitionOverlay Component', () => {
  let withTimingSpy: jest.SpyInstance;
  let withSpringSpy: jest.SpyInstance;
  let cancelAnimationSpy: jest.SpyInstance;

  beforeEach(() => {
    withTimingSpy = jest.spyOn(Reanimated, 'withTiming');
    withSpringSpy = jest.spyOn(Reanimated, 'withSpring');
    cancelAnimationSpy = jest.spyOn(Reanimated, 'cancelAnimation');

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
    withTimingSpy.mockRestore();
    withSpringSpy.mockRestore();
    cancelAnimationSpy.mockRestore();
    jest.clearAllMocks();
  });

  test('should not render anything when isTransitioning is false', () => {
    const { toJSON } = render(<TransitionOverlay />);
    expect(toJSON()).toBeNull();
  });

  test('should render welcome text and start animations for signin transition in light mode', () => {
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

    expect(withTimingSpy).toHaveBeenCalledWith(1, { duration: 300 });
    expect(withSpringSpy).toHaveBeenCalledWith(1, { damping: 15, stiffness: 100 });
  });

  test('should render signing out text and start animations for signout transition in dark mode', () => {
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

    expect(withTimingSpy).toHaveBeenCalledWith(1, { duration: 300 });
    expect(withSpringSpy).toHaveBeenCalledWith(1, { damping: 15, stiffness: 100 });
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

    mockUseSession.mockReturnValue({
      session: null,
      loading: false,
      isTransitioning: false,
      transitionType: 'signin',
      setIsTransitioning: jest.fn(),
    });

    await act(async () => {
      rerender(<TransitionOverlay />);
    });

    expect(withTimingSpy).toHaveBeenCalledWith(0, { duration: 350 }, expect.any(Function));
    expect(withSpringSpy).toHaveBeenCalledWith(0.95, { damping: 15, stiffness: 100 });

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
    expect(cancelAnimationSpy).not.toHaveBeenCalled();

    unmount();
    expect(cancelAnimationSpy).toHaveBeenCalledTimes(2);
  });

  test('should apply accessibility alert properties correctly when transitioning', () => {
    mockUseSession.mockReturnValue({
      session: null,
      loading: false,
      isTransitioning: true,
      transitionType: 'signin',
      setIsTransitioning: jest.fn(),
    });

    const { getByLabelText } = render(<TransitionOverlay />);
    const overlay = getByLabelText('Welcome back! Securing session & preparing your workspace');
    expect(overlay.props.accessible).toBe(true);
    expect(overlay.props.accessibilityRole).toBe('alert');
    expect(overlay.props.accessibilityLiveRegion).toBe('assertive');
  });
});
