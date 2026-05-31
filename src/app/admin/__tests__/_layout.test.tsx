import React from 'react';
import { render } from '@testing-library/react-native';
import AdminLayout from '../_layout';

jest.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children }: any) => <>{children}</>,
    {
      Screen: ({ name }: any) => {
        const { Text } = require('react-native');
        return <Text>{name}</Text>;
      },
    }
  ),
}));

describe('AdminLayout', () => {
  it('renders all screens', () => {
    const { getByText } = render(<AdminLayout />);
    
    expect(getByText('index')).toBeTruthy();
    expect(getByText('consequence-supervision')).toBeTruthy();
    expect(getByText('actor-lab')).toBeTruthy();
    expect(getByText('receipts')).toBeTruthy();
    expect(getByText('outbox')).toBeTruthy();
    expect(getByText('realtime')).toBeTruthy();
    expect(getByText('sermons')).toBeTruthy();
    expect(getByText('settings')).toBeTruthy();
    expect(getByText('church')).toBeTruthy();
    expect(getByText('content')).toBeTruthy();
    expect(getByText('events')).toBeTruthy();
    expect(getByText('groups')).toBeTruthy();
    expect(getByText('people')).toBeTruthy();
    expect(getByText('prayer')).toBeTruthy();
    expect(getByText('volunteers')).toBeTruthy();
  });
});
