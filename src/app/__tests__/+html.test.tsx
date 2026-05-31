import React from 'react';
import { render } from '@testing-library/react-native';
import Root from '../+html';

// Mock ScrollViewStyleReset
jest.mock('expo-router/html', () => ({
  ScrollViewStyleReset: () => <meta name="mock-scroll-view-style-reset" />,
}));

describe('+html', () => {
  it('renders correctly', () => {
    // The html root uses dangerouslySetInnerHTML, which RNTL may not fully parse natively
    // We will render it and check if the children are rendered
    const { Text } = require('react-native');
    const { getByText } = render(
      <Root>
        <Text testID="child-div">Child Content</Text>
      </Root>
    );
    
    expect(getByText('Child Content')).toBeTruthy();
  });
});
