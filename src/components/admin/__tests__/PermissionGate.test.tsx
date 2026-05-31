import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PermissionGate } from '../PermissionGate';

// Mock the store hook
jest.mock('../../../lib/actor/actorOps', () => ({
  useActorOpsStore: jest.fn(),
}));

import { useActorOpsStore } from '../../../lib/actor/actorOps';

describe('PermissionGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children if role is allowed', () => {
    (useActorOpsStore as unknown as jest.Mock).mockReturnValue({
      currentPrincipal: { role: 'admin' }
    });

    const { getByText } = render(
      <PermissionGate allowedRoles={['admin']}>
        <Text>Secret Content</Text>
      </PermissionGate>
    );

    expect(getByText('Secret Content')).toBeTruthy();
  });

  it('renders default fallback if role is not allowed', () => {
    (useActorOpsStore as unknown as jest.Mock).mockReturnValue({
      currentPrincipal: { role: 'member' }
    });

    const { getByText } = render(
      <PermissionGate allowedRoles={['admin']}>
        <Text>Secret Content</Text>
      </PermissionGate>
    );

    expect(getByText('Access Restricted')).toBeTruthy();
    expect(getByText(/Requires one of: \[admin\]/)).toBeTruthy();
  });

  it('renders custom fallback if provided and role is not allowed', () => {
    (useActorOpsStore as unknown as jest.Mock).mockReturnValue({
      currentPrincipal: { role: 'guest' }
    });

    const { getByText, queryByText } = render(
      <PermissionGate allowedRoles={['admin', 'member']} fallback={<Text>Custom Fallback</Text>}>
        <Text>Secret Content</Text>
      </PermissionGate>
    );

    expect(getByText('Custom Fallback')).toBeTruthy();
    expect(queryByText('Secret Content')).toBeNull();
    expect(queryByText('Access Restricted')).toBeNull();
  });
});
