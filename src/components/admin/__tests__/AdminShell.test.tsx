import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AdminShell } from '../AdminShell';

// Mock expo-router
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
}));

describe('AdminShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, subtitle, and children correctly', () => {
    const { getByText } = render(
      <AdminShell title="Test Title" subtitle="Test Subtitle">
        <Text>Shell Content</Text>
      </AdminShell>
    );

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Subtitle')).toBeTruthy();
    expect(getByText('Shell Content')).toBeTruthy();
  });

  it('navigates back when back button is pressed and can go back', () => {
    mockCanGoBack.mockReturnValue(true);
    const { getByTestId } = render(
      <AdminShell title="Test Title">
        <Text>Content</Text>
      </AdminShell>
    );

    fireEvent.press(getByTestId('admin-back-btn'));
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('replaces to consequence-supervision when back button is pressed and cannot go back', () => {
    mockCanGoBack.mockReturnValue(false);
    const { getByTestId } = render(
      <AdminShell title="Test Title">
        <Text>Content</Text>
      </AdminShell>
    );

    fireEvent.press(getByTestId('admin-back-btn'));
    expect(mockReplace).toHaveBeenCalledWith('/admin/consequence-supervision');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('navigates via top navigation bar', () => {
    const { getByTestId } = render(
      <AdminShell title="Consequence Supervision">
        <Text>Content</Text>
      </AdminShell>
    );

    fireEvent.press(getByTestId('nav-actor-lab'));
    expect(mockReplace).toHaveBeenCalledWith('/admin/actor-lab');
  });

  it('applies accessibility attributes to header and navigation buttons', () => {
    const { getByTestId, getByText, getAllByText } = render(
      <AdminShell title="Consequence Supervision" subtitle="Overview">
        <Text>Content</Text>
      </AdminShell>
    );

    // Header Title and Subtitle Roles
    expect(getAllByText('Consequence Supervision')[0].props.accessibilityRole).toBe('header');
    expect(getByText('Overview').props.accessibilityRole).toBe('header');

    // Back button
    const backBtn = getByTestId('admin-back-btn');
    expect(backBtn.props.accessible).toBe(true);
    expect(backBtn.props.accessibilityRole).toBe('button');
    expect(backBtn.props.accessibilityLabel).toBe('Go back');

    // Tab buttons accessibility
    const supervisionTab = getByTestId('nav-consequence-supervision');
    expect(supervisionTab.props.accessible).toBe(true);
    expect(supervisionTab.props.accessibilityRole).toBe('button');
    expect(supervisionTab.props.accessibilityLabel).toBe('Consequence Supervision navigation button');
    expect(supervisionTab.props.accessibilityState).toEqual({ selected: true });

    const actorLabTab = getByTestId('nav-actor-lab');
    expect(actorLabTab.props.accessibilityState).toEqual({ selected: false });
  });
});
