import React from 'react';
import { render } from '@testing-library/react-native';
import { ReceiptBadge } from '../ReceiptBadge';
import { ReceiptStatus } from '../../../lib/actor/types';

describe('ReceiptBadge', () => {
  const statuses: ReceiptStatus[] = [
    'accepted_pending',
    'rejected_local',
    'applied_local',
    'applied_remote',
    'rejected_remote',
    'quarantined'
  ];

  statuses.forEach(status => {
    it(`renders ${status} status correctly and replaces underscores`, () => {
      const { getByText } = render(<ReceiptBadge status={status} />);
      const formattedStatus = status.replace('_', ' ');
      expect(getByText(formattedStatus)).toBeTruthy();
    });
  });
});
