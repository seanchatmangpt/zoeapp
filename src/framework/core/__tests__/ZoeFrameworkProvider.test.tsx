import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react-native';
import { ZoeFrameworkProvider } from '../ZoeFrameworkProvider';
import { useMembrane } from '../MembraneProvider';
import { useSession } from '../../../../context/SessionProvider';
import { useVkgEngine } from '../../../components/VkgProvider';
import { useTheme } from '../../ui/theme/useTheme';
import { Text } from 'react-native';

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

// Mock the theme engine
jest.mock('../../ui/theme/useTheme', () => ({
  useTheme: () => ({
    colors: { primary: '#6366f1' },
    fontScale: 1
  })
}));

// A dummy component to test the injected contexts
function ConsumerComponent() {
  const { session } = useSession();
  const vkg = useVkgEngine();
  const membrane = useMembrane();
  const theme = useTheme();

  return (
    <React.Fragment>
      <Text testID="session-user">{(session as any)?.user || 'none'}</Text>
      <Text testID="vkg-state">{(vkg as any)?.engineState || 'none'}</Text>
      <Text testID="membrane-tenant">{membrane.getConfig().tenantId}</Text>
      <Text testID="theme-primary">{theme.colors.primary}</Text>
    </React.Fragment>
  );
}

describe('ZoeFrameworkProvider', () => {
  it('renders correctly and provides all contexts', () => {
    const { getByTestId } = render(
      <ZoeFrameworkProvider membraneConfig={{ tenantId: 'tenant-123' }}>
        <ConsumerComponent />
      </ZoeFrameworkProvider>
    );

    expect(getByTestId('session-user').props.children).toBe('test-user');
    expect(getByTestId('vkg-state').props.children).toBe('running');
    expect(getByTestId('membrane-tenant').props.children).toBe('tenant-123');
    expect(getByTestId('theme-primary').props.children).toBe('#6366f1');
  });

  it('renders suspense fallback when content suspends', () => {
    const LazyComponent = React.lazy(() => new Promise(() => {})); // Never resolves
    
    const { getByText } = render(
      <ZoeFrameworkProvider suspenseFallback={<Text>Loading...</Text>}>
        <LazyComponent />
      </ZoeFrameworkProvider>
    );

    expect(getByText('Loading...')).toBeTruthy();
  });
});
