import React from 'react';
import { render } from '@testing-library/react-native';
import NotFoundScreen from '../+not-found';

jest.mock('expo-router', () => ({
  Link: ({ children, href }: any) => {
    const { cloneElement } = require('react');
    return cloneElement(children, { testID: `link-${href}` });
  },
}));

jest.mock('@/src/components/AvatarRelativeProjection', () => ({
  Stack: Object.assign(
    () => <></>,
    {
      AvatarRelativeProjection: ({ options }: any) => {
        const { Text } = require('react-native');
        return <Text>{options.title}</Text>;
      },
    }
  ),
}));

describe('NotFoundScreen', () => {
  it('renders correctly', () => {
    const { getByText, getByTestId } = render(<NotFoundScreen />);
    
    expect(getByText('Page Not Found')).toBeTruthy();
    expect(getByText('Oops! Page Not Found')).toBeTruthy();
    expect(getByText('The page you\'re looking for doesn\'t exist or may have been moved.')).toBeTruthy();
    expect(getByText('What happened?')).toBeTruthy();
    expect(getByTestId('link-/')).toBeTruthy();
  });
});
