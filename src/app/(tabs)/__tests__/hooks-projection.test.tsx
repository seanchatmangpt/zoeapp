import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { VkgProvider } from '@/src/components/VkgProvider';
import HooksScreen from '../hooks';

describe('Truex Hooks Screen View', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'settled', receipt: 'hash_abc' }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render cockpit, allow avatar switching, and show projection details', async () => {
    const { getByText, queryByText } = render(
      <VkgProvider>
        <HooksScreen />
      </VkgProvider>
    );

    // Initial title
    expect(getByText('Truex Hook Cockpit')).toBeTruthy();

    // Default avatar is member, wait for HELP INVITATION projection to load asynchronously
    await waitFor(() => {
      expect(getByText('HELP INVITATION')).toBeTruthy();
    });

    // Switch to guest avatar
    const guestBtn = getByText('guest');
    await act(async () => {
      fireEvent.press(guestBtn);
    });

    // Projections for guest are hidden
    expect(getByText('[HIDDEN] No projection visible for guest avatar.')).toBeTruthy();

    // Switch to volunteer avatar
    const volunteerBtn = getByText('volunteer');
    await act(async () => {
      fireEvent.press(volunteerBtn);
    });

    // Check shift prompt surface
    expect(getByText('SHIFT PROMPT')).toBeTruthy();
  });
});
