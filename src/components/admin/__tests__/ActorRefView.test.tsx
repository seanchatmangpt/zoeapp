import React from 'react';
import { render } from '@testing-library/react-native';
import { ActorRefView } from '../ActorRefView';

describe('ActorRefView', () => {
  it('renders correctly with object prop', () => {
    const actorRef = { tenantId: 't1', kind: 'user', id: 'u123' };
    const { getByText } = render(<ActorRefView actorRef={actorRef} />);
    
    expect(getByText('user')).toBeTruthy();
    expect(getByText('u123')).toBeTruthy();
  });

  it('renders correctly with stringified JSON prop', () => {
    const actorRef = JSON.stringify({ tenantId: 't1', kind: 'system', id: 'sys1' });
    const { getByText } = render(<ActorRefView actorRef={actorRef} />);
    
    expect(getByText('system')).toBeTruthy();
    expect(getByText('sys1')).toBeTruthy();
  });

  it('renders error state on invalid JSON', () => {
    const { getByText } = render(<ActorRefView actorRef="not-json" />);
    expect(getByText('Invalid ActorRef')).toBeTruthy();
  });

  it('renders error state on missing fields', () => {
    const { getByText } = render(<ActorRefView actorRef={{ foo: 'bar' } as any} />);
    expect(getByText('Invalid ActorRef')).toBeTruthy();
  });
});
