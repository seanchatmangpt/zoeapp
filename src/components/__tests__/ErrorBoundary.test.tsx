import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { useColorScheme } from '../useColorScheme';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('../useColorScheme', () => ({
  useColorScheme: jest.fn(),
}));

describe('ErrorBoundary Component', () => {
  const mockRetry = jest.fn();
  const testError = new Error('Database sync timeout tension');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correct error information in light mode', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { getByText, getAllByText, getByTestId } = render(
      <ErrorBoundary error={testError} retry={mockRetry} />
    );

    expect(getByText('Avatar Projection Exception')).toBeTruthy();
    expect(getAllByText(/Database sync timeout tension/).length).toBeGreaterThan(0);
    expect(getByTestId('error-boundary-retry-button')).toBeTruthy();
    expect(getByTestId('error-boundary-home-button')).toBeTruthy();
  });

  it('renders correct error information in dark mode', () => {
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const { getByText, getAllByText } = render(
      <ErrorBoundary error={testError} retry={mockRetry} />
    );

    expect(getByText('Avatar Projection Exception')).toBeTruthy();
    expect(getAllByText(/Database sync timeout tension/).length).toBeGreaterThan(0);
  });

  it('triggers retry callback when retry button is pressed', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { getByTestId } = render(
      <ErrorBoundary error={testError} retry={mockRetry} />
    );

    const retryBtn = getByTestId('error-boundary-retry-button');
    fireEvent.press(retryBtn);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('navigates to home when home button is pressed', () => {
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { getByTestId } = render(
      <ErrorBoundary error={testError} retry={mockRetry} />
    );

    const homeBtn = getByTestId('error-boundary-home-button');
    fireEvent.press(homeBtn);

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
