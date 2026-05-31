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

  it('replaces to dashboard when back button is pressed and cannot go back', () => {
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
      <AdminShell title="Dashboard">
        <Text>Content</Text>
      </AdminShell>
    );

    fireEvent.press(getByTestId('nav-actor-lab'));
    expect(mockReplace).toHaveBeenCalledWith('/admin/actor-lab');
  });
});
