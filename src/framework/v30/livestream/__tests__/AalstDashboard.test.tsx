import React from 'react';
import { render } from '@testing-library/react-native';
import { AalstDashboard } from '../AalstDashboard';
import { useAalstStream } from '../useAalstStream';

jest.mock('../useAalstStream');

const mockedUseAalstStream = useAalstStream as jest.Mock;

describe('AalstDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders disconnected state and empty list correctly', () => {
    mockedUseAalstStream.mockReturnValue({
      isConnected: false,
      logs: [],
    });

    const { getByTestId } = render(<AalstDashboard />);
    
    expect(getByTestId('connection-status').children[0]).toBe('Disconnected');
    expect(getByTestId('empty-text').children[0]).toBe('No logs yet');
  });

  it('renders connected state and log items correctly', () => {
    const mockLogs = [
      { id: '1', type: 'PETRI_NET', payload: 'Log 1', timestamp: 1000 },
      { id: '2', type: 'ALIGNMENT', payload: 'Log 2', timestamp: 2000 },
    ];

    mockedUseAalstStream.mockReturnValue({
      isConnected: true,
      logs: mockLogs,
    });

    const { getByTestId, getByText } = render(<AalstDashboard />);
    
    expect(getByTestId('connection-status').children[0]).toBe('Connected');
    expect(getByTestId('log-item-1')).toBeTruthy();
    expect(getByTestId('log-item-2')).toBeTruthy();
    expect(getByText('PETRI_NET')).toBeTruthy();
    expect(getByText('Log 1')).toBeTruthy();
    expect(getByText('ALIGNMENT')).toBeTruthy();
    expect(getByText('Log 2')).toBeTruthy();
  });
});
