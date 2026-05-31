import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ZoeFrameworkProvider } from '../ZoeFrameworkProvider';
import { useMembrane } from '../MembraneProvider';
import { useSession } from '../../../../context/SessionProvider';
import { useVkgEngine } from '../../../components/VkgProvider';

// Mock dependencies
jest.mock('../../../../context/SessionProvider', () => {
  const React = require('react');
  const SessionContext = React.createContext({ session: null, loading: false });
  return {
    SessionProvider: ({ children }: { children: React.ReactNode }) => (
      <SessionContext.Provider value={{ session: { user: 'test-user' }, loading: false }}>
        {children}
      </SessionContext.Provider>
    ),
    useSession: () => React.useContext(SessionContext),
  };
});

jest.mock('../../../components/VkgProvider', () => {
  const React = require('react');
  const VkgContext = React.createContext({ engineState: 'running' });
  return {
    VkgProvider: ({ children }: { children: React.ReactNode }) => (
      <VkgContext.Provider value={{ engineState: 'running' }}>
        {children}
      </VkgContext.Provider>
    ),
    useVkgEngine: () => React.useContext(VkgContext),
  };
});

// A dummy component to test the injected contexts
function ConsumerComponent() {
  const { session } = useSession();
  const vkg = useVkgEngine();
  const membrane = useMembrane();

  return (
    <React.Fragment>
      <div testID="session-user">{session?.user || 'none'}</div>
      <div testID="vkg-state">{vkg?.engineState || 'none'}</div>
      <div testID="membrane-tenant">{membrane.getConfig().tenantId}</div>
    </React.Fragment>
  );
}

describe('ZoeFrameworkProvider', () => {
  it('should render children and inject all contexts successfully', () => {
    render(
      <ZoeFrameworkProvider membraneConfig={{ tenantId: 'test-tenant' }}>
        <ConsumerComponent />
      </ZoeFrameworkProvider>
    );

    expect(screen.getByTestId('session-user').props.children).toBe('test-user');
    expect(screen.getByTestId('vkg-state').props.children).toBe('running');
    expect(screen.getByTestId('membrane-tenant').props.children).toBe('test-tenant');
  });

  it('should throw error when useMembrane is used outside provider', () => {
    // Suppress console.error for expected error thrown in render
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ConsumerComponent />);
    }).toThrow('useMembrane must be used within a MembraneProvider');

    consoleSpy.mockRestore();
  });
});
