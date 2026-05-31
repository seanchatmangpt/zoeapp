import React from 'react';
import { render } from '@testing-library/react-native';
import AdminEvents from '../events';

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return (props: any) => ReactMock.createElement(View, { ...props, testID: props.name });
});

describe('AdminEvents Screen', () => {
  test('renders Church Calendar Events correctly', () => {
    const { getByText } = render(<AdminEvents />);
    
    expect(getByText('Sunday Morning Worship')).toBeTruthy();
    expect(getByText('Every Sunday, 9:00 AM & 11:00 AM')).toBeTruthy();
    expect(getByText('Main Sanctuary')).toBeTruthy();
    
    expect(getByText('Midweek Prayer Gathering')).toBeTruthy();
    expect(getByText('Chapel')).toBeTruthy();
  });
});
