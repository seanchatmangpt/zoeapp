import React from 'react';
import { render } from '@testing-library/react-native';
import EditProjectionInfo from '../EditProjectionInfo';

jest.mock('../ExternalLink', () => ({
  ExternalLink: ({ children, href, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text testID="external-link" {...props}>{children}</Text>;
  },
}));

jest.mock('../StyledText', () => ({
  MonoText: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text testID="mono-text" {...props}>{children}</Text>;
  },
}));

jest.mock('../Themed', () => {
  const { Text, View } = require('react-native');
  return {
    Text: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
    View: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

describe('EditProjectionInfo', () => {
  it('renders correctly with the given path', () => {
    const { getByText, getByTestId } = render(<EditProjectionInfo path="src/app/index.tsx" />);

    expect(getByText('Open up the code for this Avatar-Relative Projection:')).toBeTruthy();
    expect(getByTestId('mono-text').props.children).toBe('src/app/index.tsx');
    expect(getByText('Change any of the text, save the file, and your app will automatically update.')).toBeTruthy();
    expect(getByText("Tap here if your app doesn't automatically update")).toBeTruthy();
  });
});
