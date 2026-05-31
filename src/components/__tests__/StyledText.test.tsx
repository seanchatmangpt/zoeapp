import React from 'react';
import { render } from '@testing-library/react-native';
import { MonoText } from '../StyledText';

jest.mock('../Themed', () => ({
  Text: ({ children, className, testID }: any) => {
    const { Text } = require('react-native');
    return <Text testID={testID} className={className}>{children}</Text>;
  },
}));

describe('StyledText', () => {
  it('renders correctly', () => {
    const { getByText, getByTestId } = render(
      <MonoText testID="mono-text">Snapshot test!</MonoText>
    );

    const element = getByTestId('mono-text');
    expect(element.props.className).toContain('font-[SpaceMono]');
    expect(getByText('Snapshot test!')).toBeTruthy();
  });
});
