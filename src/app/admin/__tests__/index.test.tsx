import React from 'react';
import { render } from '@testing-library/react-native';
import AdminIndex from '../index';
import { Redirect } from 'expo-router';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

describe('AdminIndex', () => {
  it('renders a Redirect to /admin/actor-lab', () => {
    render(<AdminIndex />);
    expect((Redirect as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({ href: '/admin/actor-lab' })
    );
  });
});
