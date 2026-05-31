import React from 'react';
import { render } from '@testing-library/react-native';
import AdminChurch from '../church';

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return (props: any) => ReactMock.createElement(View, { ...props, testID: props.name });
});

describe('AdminChurch Screen', () => {
  test('renders Church Profile correctly', () => {
    const { getByText } = render(<AdminChurch />);
    
    expect(getByText('Identity details')).toBeTruthy();
    expect(getByText('Church')).toBeTruthy();
    expect(getByText('Zoe Community Church')).toBeTruthy();
    
    expect(getByText('Location details')).toBeTruthy();
    expect(getByText('1200 Cathedral Way')).toBeTruthy();
    expect(getByText('Seattle')).toBeTruthy();
    expect(getByText('WA')).toBeTruthy();
    
    expect(getByText('Contact points')).toBeTruthy();
    expect(getByText('info@zoecommunity.church')).toBeTruthy();
  });
});
