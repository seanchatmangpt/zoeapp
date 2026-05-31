import React from 'react';
import { render } from '@testing-library/react-native';
import AdminContent from '../content';

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return (props: any) => ReactMock.createElement(View, { ...props, testID: props.name });
});

describe('AdminContent Screen', () => {
  test('renders Content Management correctly', () => {
    const { getByText } = render(<AdminContent />);
    
    expect(getByText('Summer Volunteer Training')).toBeTruthy();
    expect(getByText('May 28, 2026')).toBeTruthy();
    expect(getByText('Join us for our annual volunteer training session in the main hall.')).toBeTruthy();
    
    expect(getByText('Food Drive Campaign')).toBeTruthy();
    expect(getByText('Youth Group Summer Retreat')).toBeTruthy();
  });
});
