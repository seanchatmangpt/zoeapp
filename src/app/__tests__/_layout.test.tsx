import React from 'react';
import { render } from '@testing-library/react-native';
import RootLayout from '../_layout';
import { useSession } from '../../../context/SessionProvider';

// Mock dependencies
jest.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: any) => <>{children}</>,
    {
      AvatarRelativeProjection: ({ name }: any) => <>{name}</>,
      Protected: ({ children, guard }: any) => (guard ? <>{children}</> : null),
    }
  ),
  ErrorBoundary: () => null,
}));

jest.mock('expo-router/react-navigation', () => ({
  DefaultTheme: { colors: {} },
  DarkTheme: { colors: {} },
  ThemeProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('../../../context/SessionProvider', () => ({
  SessionProvider: ({ children }: any) => <>{children}</>,
  useSession: jest.fn(),
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}));

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  font: {},
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('@/src/components/VkgProvider', () => ({
  VkgProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/src/components/TransitionOverlay', () => ({
  TransitionOverlay: () => <></>,
}));

jest.mock('@/src/components/AvatarRelativeProjection', () => ({
  Stack: Object.assign(
    ({ children }: any) => <>{children}</>,
    {
      AvatarRelativeProjection: ({ name }: any) => {
        const { Text } = require('react-native');
        return <Text>{name}</Text>;
      },
      Protected: ({ children, guard }: any) => (guard ? <>{children}</> : null),
    }
  ),
}));

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly for authenticated user', () => {
    (useSession as jest.Mock).mockReturnValue({
      session: { user: { id: '123' } },
      loading: false,
    });

    const { getByText, queryByText } = render(<RootLayout />);
    
    // Protected routes for authenticated user
    expect(getByText('(tabs)')).toBeTruthy();
    expect(getByText('admin')).toBeTruthy();
    expect(getByText('modal')).toBeTruthy();
    
    // Auth routes should not be rendered
    expect(queryByText('(auth)')).toBeNull();
  });

  it('renders correctly for unauthenticated user', () => {
    (useSession as jest.Mock).mockReturnValue({
      session: null,
      loading: false,
    });

    const { getByText, queryByText } = render(<RootLayout />);
    
    // Protected routes should not be rendered
    expect(queryByText('(tabs)')).toBeNull();
    expect(queryByText('admin')).toBeNull();
    expect(queryByText('modal')).toBeNull();
    
    // Auth routes should be rendered
    expect(getByText('(auth)')).toBeTruthy();
  });
});
