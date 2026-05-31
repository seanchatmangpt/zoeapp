import React from 'react';
import { render } from '@testing-library/react-native';
import AdminPeople from '../people';

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return (props: any) => ReactMock.createElement(View, { ...props, testID: props.name });
});

describe('AdminPeople Screen', () => {
  test('renders Pastoral Staff correctly', () => {
    const { getByText } = render(<AdminPeople />);
    
    expect(getByText('Pastor David Choi')).toBeTruthy();
    expect(getByText('Lead Pastor')).toBeTruthy();
    expect(getByText('david@zoecommunity.church')).toBeTruthy();
    
    expect(getByText('Sarah Jenkins')).toBeTruthy();
    expect(getByText('Michael Chang')).toBeTruthy();
  });
});
