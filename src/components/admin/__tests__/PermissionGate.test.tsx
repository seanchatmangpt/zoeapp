import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PermissionGate } from '../PermissionGate';
import { useActorOpsStore } from '../../../lib/actor/actorOps';

describe('PermissionGate', () => {
  it('renders children if role is allowed', () => {
    useActorOpsStore.setState({
      currentPrincipal: { id: 'admin-id', role: 'admin' }
    });

    const { getByText } = render(
      <PermissionGate allowedRoles={['admin']}>
        <Text>Secret Content</Text>
      </PermissionGate>
    );

    expect(getByText('Secret Content')).toBeTruthy();
  });

  it('renders default fallback if role is not allowed', () => {
    useActorOpsStore.setState({
      currentPrincipal: { id: 'member-id', role: 'member' }
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
    useActorOpsStore.setState({
      currentPrincipal: { id: 'guest-id', role: 'guest' }
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
