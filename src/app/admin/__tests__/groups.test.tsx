import React from 'react';
import { render } from '@testing-library/react-native';
import AdminGroups from '../groups';

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return (props: any) => ReactMock.createElement(View, { ...props, testID: props.name });
});

describe('AdminGroups Screen', () => {
  test('renders Small Groups correctly', () => {
    const { getByText } = render(<AdminGroups />);
    
    expect(getByText('Downtown Community Group')).toBeTruthy();
    expect(getByText('Pastor David Choi')).toBeTruthy();
    expect(getByText('14 members')).toBeTruthy();
    
    expect(getByText('Westside Families Fellowship')).toBeTruthy();
    expect(getByText('Sarah Jenkins')).toBeTruthy();
  });
});
