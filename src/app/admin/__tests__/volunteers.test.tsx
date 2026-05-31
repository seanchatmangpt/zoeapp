import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AdminVolunteers from '../volunteers';

describe('AdminVolunteers Component', () => {
  it('renders the header correctly', () => {
    const { getByText } = render(<AdminVolunteers />);
    expect(getByText('Volunteer Assignments')).toBeTruthy();
    expect(getByText('Volunteer ministries team allocations')).toBeTruthy();
  });

  it('renders a list of volunteer assignments', () => {
    const { getByText, getAllByText } = render(<AdminVolunteers />);
    
    // Check titles
    expect(getByText('Welcoming / Ushers')).toBeTruthy();
    expect(getByText('Worship / AV Sound')).toBeTruthy();
    expect(getByText('Kids Church Helpers')).toBeTruthy();

    // Check coordinators
    expect(getByText('Sarah Jenkins')).toBeTruthy();
    expect(getByText('Michael Chang')).toBeTruthy();
    expect(getByText('Jenny Choi')).toBeTruthy();

    // Check counts
    expect(getByText('12 Volunteers')).toBeTruthy();
    expect(getByText('6 Volunteers')).toBeTruthy();
    expect(getByText('14 Volunteers')).toBeTruthy();

    // Check statuses
    expect(getAllByText('Optimal').length).toBe(2);
    expect(getByText('Needs Volunteers')).toBeTruthy();
  });

  it('has interactive manage buttons for each assignment', () => {
    const { getAllByText } = render(<AdminVolunteers />);
    const buttons = getAllByText('Manage');
    expect(buttons.length).toBe(3);

    // Verify they are clickable (fireEvent won't fail)
    fireEvent.press(buttons[0]);
  });
});
