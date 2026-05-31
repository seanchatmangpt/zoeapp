import React from 'react';
import { render, act } from '@testing-library/react-native';
import { TransitionOverlay } from '../TransitionOverlay';
import { useSession } from '@/context/SessionProvider';
import { useColorScheme } from '../../../components/useColorScheme';

jest.mock('@/context/SessionProvider', () => ({
  useSession: jest.fn(),
}));

jest.mock('../../../components/useColorScheme', () => ({
  useColorScheme: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn((cb) => cb()),
    withTiming: jest.fn((val, config, cb) => {
      if (cb) cb(true);
      return val;
    }),
    withSpring: jest.fn((val) => val),
    runOnJS: jest.fn((fn) => fn),
    cancelAnimation: jest.fn(),
  };
});

describe('TransitionOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    (useSession as jest.Mock).mockReturnValue({ isTransitioning: false, transitionType: null });
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { toJSON } = render(<TransitionOverlay />);
    expect(toJSON()).toBeNull();
  });

  it('renders correctly when transitioning to signin in light mode', () => {
    (useSession as jest.Mock).mockReturnValue({ isTransitioning: true, transitionType: 'signin' });
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { getByText } = render(<TransitionOverlay />);
    expect(getByText('Welcome back!')).toBeTruthy();
    expect(getByText('Securing session & preparing your workspace')).toBeTruthy();
  });

  it('renders correctly when transitioning to signout in dark mode', () => {
    (useSession as jest.Mock).mockReturnValue({ isTransitioning: true, transitionType: 'signout' });
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const { getByText } = render(<TransitionOverlay />);
    expect(getByText('Signing out...')).toBeTruthy();
    expect(getByText('Clearing session cache & returning to login')).toBeTruthy();
  });

  it('handles transition state change from true to false', () => {
    (useSession as jest.Mock).mockReturnValue({ isTransitioning: true, transitionType: 'signin' });
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { getByText, rerender } = render(<TransitionOverlay />);
    expect(getByText('Welcome back!')).toBeTruthy();

    (useSession as jest.Mock).mockReturnValue({ isTransitioning: false, transitionType: 'signin' });
    rerender(<TransitionOverlay />);
    
    // In our mock withTiming, callback is called immediately so visible becomes false.
    // wait for JS queue
    act(() => {});
  });
});
