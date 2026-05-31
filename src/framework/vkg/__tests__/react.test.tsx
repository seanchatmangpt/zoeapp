import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { VkgProvider, useVkg } from '../react';

// We mock the base implementation to ensure our facade correctly wraps and delegates.
jest.mock('../../../components/VkgProvider', () => {
  return {
    VkgProvider: ({ children }: { children: React.ReactNode }) => (
      <div testID="base-provider">{children}</div>
    ),
    useVkgEngine: () => ({ isMockEngine: true }),
  };
});

describe('VKG Framework - React Context', () => {
  it('renders the VkgProvider wrapper', () => {
    render(
      <VkgProvider>
        <div testID="child" />
      </VkgProvider>
    );

    expect(screen.getByTestId('base-provider')).toBeTruthy();
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('useVkg correctly aliases useVkgEngine', () => {
    let contextValue;

    const TestComponent = () => {
      contextValue = useVkg();
      return <div testID="hook-consumer" />;
    };

    render(<TestComponent />);
    
    expect(screen.getByTestId('hook-consumer')).toBeTruthy();
    expect(contextValue).toEqual({ isMockEngine: true });
  });
});
