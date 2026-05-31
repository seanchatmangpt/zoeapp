import React from 'react';
import { render } from '@testing-library/react-native';
import { OutboxBadge } from '../OutboxBadge';

describe('OutboxBadge', () => {
  it('renders pending status', () => {
    const { getByText } = render(<OutboxBadge status="pending" />);
    expect(getByText('pending')).toBeTruthy();
  });

  it('renders processing status', () => {
    const { getByText } = render(<OutboxBadge status="processing" />);
    expect(getByText('processing')).toBeTruthy();
  });

  it('renders completed status', () => {
    const { getByText } = render(<OutboxBadge status="completed" />);
    expect(getByText('completed')).toBeTruthy();
  });

  it('renders failed status', () => {
    const { getByText } = render(<OutboxBadge status="failed" />);
    expect(getByText('failed')).toBeTruthy();
  });

  it('sets accessibility attributes correctly', () => {
    const { getByTestId } = render(<OutboxBadge status="pending" testID="badge" />);
    const badge = getByTestId('badge');
    expect(badge.props.accessible).toBe(true);
    expect(badge.props.accessibilityLabel).toBe('Outbox status: pending');
  });
});
