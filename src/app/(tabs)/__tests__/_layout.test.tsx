import React from 'react';
import { render } from '@testing-library/react-native';
import TabLayout from '../_layout';
import { useColorScheme } from '@/src/components/useColorScheme';

jest.mock('@/src/components/useColorScheme', () => ({
  useColorScheme: jest.fn(),
}));

jest.mock('@/src/components/useClientOnlyValue', () => ({
  useClientOnlyValue: jest.fn().mockReturnValue(false),
}));

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const { Text } = require('react-native');
  return function MockFontAwesome({ name }: { name: string }) {
    return <Text>{`Icon:${name}`}</Text>;
  };
});

jest.mock('@/src/components/AvatarRelativeProjection', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Tabs = ({ children, avatarRelativeProjectionOptions }: any) => (
    <View testID="tabs" testID-options={JSON.stringify(avatarRelativeProjectionOptions)}>
      {children}
    </View>
  );
  const AvatarRelativeProjectionMock = ({ name, options }: any) => {
    let iconRendered = null;
    if (options.tabBarIcon) {
      iconRendered = options.tabBarIcon({ color: 'red' });
    }
    return (
      <View testID={`tab-${name}`} testID-options={JSON.stringify(options)}>
        {iconRendered}
      </View>
    );
  };
  AvatarRelativeProjectionMock.displayName = 'AvatarRelativeProjection';
  Tabs.AvatarRelativeProjection = AvatarRelativeProjectionMock;
  return { Tabs };
});

describe('TabLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useColorScheme as jest.Mock).mockReturnValue('light');
  });

  it('renders correctly with light theme', () => {
    const { getByTestId, getAllByText } = render(<TabLayout />);
    
    expect(getByTestId('tabs')).toBeTruthy();
    expect(getByTestId('tab-index')).toBeTruthy();
    expect(getByTestId('tab-hooks')).toBeTruthy();
    expect(getByTestId('tab-account')).toBeTruthy();
    expect(getByTestId('tab-admin')).toBeTruthy();
    
    // Verify icons are rendered
    expect(getAllByText('Icon:home')).toBeTruthy();
    expect(getAllByText('Icon:link')).toBeTruthy();
    expect(getAllByText('Icon:user')).toBeTruthy();
    expect(getAllByText('Icon:gears')).toBeTruthy();
  });

  it('renders correctly with dark theme', () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');
    const { getByTestId } = render(<TabLayout />);
    expect(getByTestId('tabs')).toBeTruthy();
  });
});
