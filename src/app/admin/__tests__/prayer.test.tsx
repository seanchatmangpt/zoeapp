import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AdminPrayer from '../prayer';

describe('AdminPrayer Component', () => {
  it('renders the shell headers', () => {
    const { getByText } = render(<AdminPrayer />);
    expect(getByText('Community Prayer Requests')).toBeTruthy();
    expect(getByText('Monitor prayer needs and visibility policies')).toBeTruthy();
  });

  it('renders prayer requests with correct data', () => {
    const { getByText } = render(<AdminPrayer />);
    
    // Names
    expect(getByText('John Henderson')).toBeTruthy();
    expect(getByText('Michael Chang')).toBeTruthy();
    expect(getByText('Sarah Jenkins')).toBeTruthy();

    // Visibility Badges
    expect(getByText('Pastors Only')).toBeTruthy();
    expect(getByText('Public Community')).toBeTruthy();
    expect(getByText('Staff Only')).toBeTruthy();

    // Request texts
    expect(getByText(/"Healing for Mrs. Henderson during chemotherapy."/)).toBeTruthy();
    expect(getByText(/"Safe travels for the youth mission team."/)).toBeTruthy();
    expect(getByText(/"Guidance in finding a new group coordinator."/)).toBeTruthy();
  });

  it('contains interaction buttons for prayer items', () => {
    const { getAllByText } = render(<AdminPrayer />);
    
    const prayingBtns = getAllByText('Praying');
    expect(prayingBtns.length).toBe(3);

    const changeVisBtns = getAllByText('Change Visibility');
    expect(changeVisBtns.length).toBe(3);

    // Verify interaction
    fireEvent.press(prayingBtns[0]);
    fireEvent.press(changeVisBtns[0]);
  });
});
