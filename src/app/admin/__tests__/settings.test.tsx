import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminSettings from '../settings';
import { mmkvInstance } from '../../../lib/store/mmkvStorage';
import { useActorOpsStore } from '../../../lib/actor/actorOps';

// Mock FontAwesome since it is used in AdminShell
jest.mock('@expo/vector-icons/FontAwesome', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return (props: any) => ReactMock.createElement(View, { ...props, testID: props.name });
});

const mockSession: { session: any } = {
  session: {
    user: {
      email: 'admin@zoeapp.com',
      id: 'admin-uuid-12345',
      email_confirmed_at: '2026-05-30T16:00:00Z',
    },
  },
};

// Mock SessionProvider context hook
jest.mock('../../../../context/SessionProvider', () => ({
  useSession: () => mockSession,
}));

// Mock MMKV storage instance in a self-contained factory
jest.mock('../../../lib/store/mmkvStorage', () => {
  const mockInstance = {
    getBoolean: jest.fn((key: string) => {
      if (key === 'admin_sqlite_wal') return true;
      if (key === 'admin_verbose_logs') return false;
      if (key === 'admin_supervision_restart') return true;
      return false;
    }),
    set: jest.fn(),
    getAllKeys: jest.fn(() => ['dummy-key-1', 'dummy-key-2']),
    clearAll: jest.fn(),
    getString: jest.fn(),
    remove: jest.fn(),
  };
  return {
    mmkvInstance: mockInstance,
    mmkvStorage: {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
    },
  };
});

// Mock Zustand store with actions/state mocks in a self-contained factory
jest.mock('../../../lib/actor/actorOps', () => {
  const mockSetNetworkOnline = jest.fn();
  const mockSetRemoteRejectActive = jest.fn();
  const mockSetLatestReceipt = jest.fn();
  const mockSetLatestEvent = jest.fn();
  const mockSetCounts = jest.fn();

  const mockState = {
    networkOnline: false,
    remoteRejectActive: true,
    setNetworkOnline: mockSetNetworkOnline,
    setRemoteRejectActive: mockSetRemoteRejectActive,
  };

  const mockUse = jest.fn((selector: any) => selector(mockState));
  (mockUse as any).getState = jest.fn(() => ({
    setLatestReceipt: mockSetLatestReceipt,
    setLatestEvent: mockSetLatestEvent,
    setCounts: mockSetCounts,
  }));

  return {
    useActorOpsStore: mockUse,
  };
});

describe('AdminSettings Screen - Developer Resets & Diagnostics', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSession.session = {
      user: {
        email: 'admin@zoeapp.com',
        id: 'admin-uuid-12345',
        email_confirmed_at: '2026-05-30T16:00:00Z',
      },
    };
    
    // Spy on Alert.alert to simulate confirmation presses automatically
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      // Find the confirm/clear button in the Alert configuration and execute its onPress callback
      const confirmButton = buttons?.find(
        (btn) => btn.text === 'Clear All' || btn.text === 'Reset Store'
      );
      if (confirmButton && confirmButton.onPress) {
        confirmButton.onPress();
      }
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  test('renders authorization context correctly', () => {
    const { getByText } = render(<AdminSettings />);
    
    // Verify email and UUID rendering
    expect(getByText('admin@zoeapp.com')).toBeTruthy();
    expect(getByText('admin-uuid-12345')).toBeTruthy();
    expect(getByText('Yes')).toBeTruthy(); // Email confirmed yes
  });

  test('displays key counts and toggles local config state in MMKV', async () => {
    const { getByText } = render(<AdminSettings />);
    
    // Verify MMKV key count is loaded and shown
    expect(getByText('2')).toBeTruthy(); // getAllKeys length is 2

    // Toggle WAL mode
    const walToggle = getByText('SQLite WAL Mode');
    await act(async () => {
      fireEvent.press(walToggle);
    });
    // It toggles from true (default mock) to false and sets in MMKV
    expect(mmkvInstance.set).toHaveBeenCalledWith('admin_sqlite_wal', false);

    // Toggle Verbose Logs
    const verboseToggle = getByText('Verbose Sync Logging');
    await act(async () => {
      fireEvent.press(verboseToggle);
    });
    expect(mmkvInstance.set).toHaveBeenCalledWith('admin_verbose_logs', true);

    // Toggle Supervision Restart
    const supervisionToggle = getByText('Supervision Auto-Restart');
    await act(async () => {
      fireEvent.press(supervisionToggle);
    });
    expect(mmkvInstance.set).toHaveBeenCalledWith('admin_supervision_restart', false);
  });

  test('triggers and executes MMKV cache wipe action', async () => {
    const { getByText } = render(<AdminSettings />);
    
    const wipeMmkvButton = getByText('Wipe MMKV Cache Storage');
    await act(async () => {
      fireEvent.press(wipeMmkvButton);
    });

    // Check that alert was presented
    expect(alertSpy).toHaveBeenCalledWith(
      'Wipe MMKV Cache',
      expect.any(String),
      expect.any(Array)
    );

    // Verify clearAll was successfully invoked on mmkvInstance
    expect(mmkvInstance.clearAll).toHaveBeenCalledTimes(1);
    
    // Verify success alert is triggered afterward
    expect(alertSpy).toHaveBeenCalledWith('Success', 'MMKV Cache cleared.');
  });

  test('triggers and executes AsyncStorage cache wipe action', async () => {
    const { getByText } = render(<AdminSettings />);

    const wipeAsyncButton = getByText('Wipe AsyncStorage Cache');
    await act(async () => {
      fireEvent.press(wipeAsyncButton);
    });

    // Check that alert was presented
    expect(alertSpy).toHaveBeenCalledWith(
      'Wipe AsyncStorage Cache',
      expect.any(String),
      expect.any(Array)
    );

    // Verify AsyncStorage.clear was invoked
    expect(AsyncStorage.clear).toHaveBeenCalledTimes(1);
    
    // Verify success alert is triggered afterward
    expect(alertSpy).toHaveBeenCalledWith('Success', 'AsyncStorage cache cleared.');
  });

  test('triggers and executes Zustand local stores reset actions', async () => {
    const { getByText } = render(<AdminSettings />);

    const resetStoresButton = getByText('Reset Local Zustand Stores');
    await act(async () => {
      fireEvent.press(resetStoresButton);
    });

    // Check that alert was presented
    expect(alertSpy).toHaveBeenCalledWith(
      'Reset Local Actor Ops Store',
      expect.any(String),
      expect.any(Array)
    );

    // Retrieve spy functions from our mocked store state/getState
    const mockSetNetworkOnline = useActorOpsStore((state: any) => state.setNetworkOnline);
    const mockSetRemoteRejectActive = useActorOpsStore((state: any) => state.setRemoteRejectActive);
    const mockSetLatestReceipt = useActorOpsStore.getState().setLatestReceipt;
    const mockSetLatestEvent = useActorOpsStore.getState().setLatestEvent;
    const mockSetCounts = useActorOpsStore.getState().setCounts;

    // Verify Zustand state mutations are called
    expect(mockSetNetworkOnline).toHaveBeenCalledWith(true);
    expect(mockSetRemoteRejectActive).toHaveBeenCalledWith(false);
    expect(mockSetLatestReceipt).toHaveBeenCalledWith(null);
    expect(mockSetLatestEvent).toHaveBeenCalledWith(null);
    expect(mockSetCounts).toHaveBeenCalledWith(0, 0);

    // Verify success alert is triggered afterward
    expect(alertSpy).toHaveBeenCalledWith('Success', 'Zustand operations store reset completed.');
  });

  test('seeds sandbox parameters into MMKV successfully', async () => {
    const { getByText } = render(<AdminSettings />);

    const seedButton = getByText('Seed Sandbox Parameters');
    await act(async () => {
      fireEvent.press(seedButton);
    });

    // Verify MMKV seeds
    expect(mmkvInstance.set).toHaveBeenCalledWith('sandbox_seeded_at', expect.any(String));
    expect(mmkvInstance.set).toHaveBeenCalledWith('sandbox_tenant_ref', 'tenant-test-override-999');
    expect(mmkvInstance.set).toHaveBeenCalledWith('sandbox_sync_facade', 'Supabase Realtime CDC Facade');
    
    // Verify success alert is triggered
    expect(alertSpy).toHaveBeenCalledWith('Success', 'Sandbox parameters seeded into MMKV store.');
  });

  test('toggles network online and remote rejection states in Zustand store', async () => {
    const { getByText } = render(<AdminSettings />);
    
    // Toggle Network Simulator
    const networkToggle = getByText('Network Simulator');
    await act(async () => {
      fireEvent.press(networkToggle);
    });
    const mockSetNetworkOnline = useActorOpsStore((state: any) => state.setNetworkOnline);
    expect(mockSetNetworkOnline).toHaveBeenCalledWith(true);

    // Toggle Remote Rejections
    const remoteToggle = getByText('Remote Rejections');
    await act(async () => {
      fireEvent.press(remoteToggle);
    });
    const mockSetRemoteRejectActive = useActorOpsStore((state: any) => state.setRemoteRejectActive);
    expect(mockSetRemoteRejectActive).toHaveBeenCalledWith(false);
  });

  test('renders fallback labels when user context is null or empty', () => {
    // Override session context mock value
    mockSession.session = null;
    
    const { getByText, queryAllByText } = render(<AdminSettings />);
    
    // Principal User fallback 'N/A'
    expect(getByText('Principal User')).toBeTruthy();
    expect(getByText('User UUID')).toBeTruthy();
    
    // Auth Confirmed fallback should show 'No'
    expect(getByText('No')).toBeTruthy();
    
    // There should be 'N/A' texts (for Principal User and User UUID)
    const naElements = queryAllByText('N/A');
    expect(naElements.length).toBeGreaterThanOrEqual(1);
  });

  test('handles MMKV cache wipe errors gracefully', async () => {
    const testError = new Error('MMKV wipe failed database locked');
    (mmkvInstance.clearAll as jest.Mock).mockImplementationOnce(() => {
      throw testError;
    });

    const { getByText } = render(<AdminSettings />);
    
    const wipeMmkvButton = getByText('Wipe MMKV Cache Storage');
    await act(async () => {
      fireEvent.press(wipeMmkvButton);
    });

    // Verify MMKV.clearAll was called
    expect(mmkvInstance.clearAll).toHaveBeenCalledTimes(1);

    // Verify error alert was shown
    expect(alertSpy).toHaveBeenCalledWith('Error', 'MMKV wipe failed database locked');
  });

  test('handles AsyncStorage clear errors gracefully', async () => {
    const testError = new Error('AsyncStorage clear failed disk full');
    jest.spyOn(AsyncStorage, 'clear').mockRejectedValueOnce(testError);

    const { getByText } = render(<AdminSettings />);
    
    const wipeAsyncButton = getByText('Wipe AsyncStorage Cache');
    await act(async () => {
      fireEvent.press(wipeAsyncButton);
    });

    // Verify AsyncStorage.clear was called
    expect(AsyncStorage.clear).toHaveBeenCalledTimes(1);

    // Verify error alert was shown
    expect(alertSpy).toHaveBeenCalledWith('Error', 'AsyncStorage clear failed disk full');
  });

  test('handles Zustand store reset errors gracefully', async () => {
    const testError = new Error('Zustand store reset failed');
    const mockSetNetworkOnline = useActorOpsStore((state: any) => state.setNetworkOnline);
    (mockSetNetworkOnline as jest.Mock).mockImplementationOnce(() => {
      throw testError;
    });

    const { getByText } = render(<AdminSettings />);
    
    const resetStoresButton = getByText('Reset Local Zustand Stores');
    await act(async () => {
      fireEvent.press(resetStoresButton);
    });

    // Verify error alert was shown
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Zustand store reset failed');
  });

  test('handles sandbox parameters seeding errors gracefully', async () => {
    const testError = new Error('Sandbox seeding failed write permission denied');
    (mmkvInstance.set as jest.Mock).mockImplementationOnce(() => {
      throw testError;
    });

    const { getByText } = render(<AdminSettings />);
    
    const seedButton = getByText('Seed Sandbox Parameters');
    await act(async () => {
      fireEvent.press(seedButton);
    });

    // Verify error alert was shown
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Sandbox seeding failed write permission denied');
  });

  test('handles errors during MMKV property load and refresh', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Simulate error during initial load
    (mmkvInstance.getBoolean as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Initial load failure');
    });

    const { getByText } = render(<AdminSettings />);
    expect(warnSpy).toHaveBeenCalledWith('Failed to load MMKV properties:', expect.any(Error));

    // Simulate error during refresh
    (mmkvInstance.getAllKeys as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Refresh keys failure');
    });

    // Trigger a toggle to hit refreshMMKVKeyCount
    const walToggle = getByText('SQLite WAL Mode');
    await act(async () => {
      fireEvent.press(walToggle);
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.any(Error));
    warnSpy.mockRestore();
  });
});
