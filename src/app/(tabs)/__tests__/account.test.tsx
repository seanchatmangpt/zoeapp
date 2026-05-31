import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Account from '../account';
import { mmkvInstance } from '../../../lib/store/mmkvStorage';
import { useActorOpsStore } from '@/src/lib/actor/actorOps';
import { supabase } from '@/lib/supabase';

// Mock Stack from AvatarRelativeProjection
jest.mock('@/src/components/AvatarRelativeProjection', () => {
  const React = require('react');
  const MockScreen = () => null;
  return {
    Stack: {
      AvatarRelativeProjection: MockScreen,
    },
  };
});

// Mock SessionProvider
jest.mock('@/context/SessionProvider', () => {
  const mockFn = jest.fn().mockReturnValue({
    session: {
      user: {
        id: 'test-user-uuid',
        email: 'test@example.com',
      },
    },
  });
  return {
    useSession: mockFn,
  };
});

import { useSession } from '@/context/SessionProvider';
const mockUseSession = useSession as any;

// Mock Supabase client
jest.mock('@/lib/supabase', () => {
  const mockSingle = jest.fn();
  const mockUpsert = jest.fn();
  const mockSignOut = jest.fn();
  const mockSupabaseChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: mockSingle,
    upsert: mockUpsert,
  };
  return {
    supabase: {
      from: jest.fn(() => mockSupabaseChain),
      auth: {
        signOut: mockSignOut,
      },
    },
  };
});

// Mock MMKV storage
jest.mock('../../../lib/store/mmkvStorage', () => {
  const mockInstance = {
    getBoolean: jest.fn((key: string) => {
      if (key === 'sim_dark_mode') return false;
      if (key === 'sim_save_logs') return false;
      return false;
    }),
    set: jest.fn(),
    getAllKeys: jest.fn(() => ['key1', 'key2']),
    clearAll: jest.fn(),
  };
  return {
    mmkvInstance: mockInstance,
  };
});








describe('Account Tab Consequence Supervision Unit Tests', () => {
  let alertSpy: jest.SpyInstance;
  let mockFromSpy: jest.Mock;
  let mockUpsertSpy: jest.Mock;
  let mockSingleSpy: jest.Mock;

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    if (AsyncStorage.clear && (AsyncStorage.clear as any).mockClear) {
      (AsyncStorage.clear as any).mockClear();
    }

    (global as any).mockNetworkOnline = true;
    (global as any).mockRemoteRejectActive = false;
    (global as any).mockSetNetworkOnline.mockReset();
    (global as any).mockSetNetworkOnline.mockImplementation((val: boolean) => {
      (global as any).mockNetworkOnline = val;
    });
    (global as any).mockSetRemoteRejectActive.mockReset();
    (global as any).mockSetRemoteRejectActive.mockImplementation((val: boolean) => {
      (global as any).mockRemoteRejectActive = val;
    });
    (global as any).mockSetLatestReceipt.mockReset();
    (global as any).mockSetLatestEvent.mockReset();
    (global as any).mockSetCounts.mockReset();

    // Retrieve database spy references from the mocked supabase instance
    mockFromSpy = supabase.from as jest.Mock;
    const profilesTableMock = mockFromSpy('profiles');
    mockUpsertSpy = profilesTableMock.upsert as jest.Mock;
    mockSingleSpy = profilesTableMock.select().eq('id', 'test-user-uuid').single as jest.Mock;

    // Reset default profile mock return values
    mockSingleSpy.mockResolvedValue({
      data: {
        username: 'initialuser',
        website: 'https://initialwebsite.com',
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      },
      error: null,
      status: 200,
    });
    mockUpsertSpy.mockResolvedValue({ error: null });
    mockUseSession.mockReturnValue({
      session: {
        user: {
          id: 'test-user-uuid',
          email: 'test@example.com',
        },
      },
      loading: false,
    });

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      if (buttons && buttons.length > 0) {
        const confirmButton = buttons.find(
          (btn) => btn.text === 'Clear All' || btn.text === 'Reset Store State' || btn.text === 'Clear' || btn.text === 'Sign Out'
        );
        if (confirmButton && confirmButton.onPress) {
          confirmButton.onPress();
        }
      }
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  test('should render profile data from Supabase and show simulation settings', async () => {
    const { getByText, getByTestId } = render(<Account />);

    // Wait for the mock profile data to load and render
    await waitFor(() => {
      expect(getByTestId('username-input').props.value).toBe('initialuser');
    }, { timeout: 4000 });

    expect(getByText('test@example.com')).toBeTruthy();

    // Check key inputs are pre-populated
    expect(getByTestId('username-input').props.value).toBe('initialuser');
    expect(getByTestId('website-input').props.value).toBe('https://initialwebsite.com');

    // MMKV keys count should render based on mocked getAllKeys length (2)
    expect(getByText('2')).toBeTruthy();
  });

  test('should handle username and website changes, and update profile successfully', async () => {
    const { getByTestId, getByText } = render(<Account />);

    // Wait for profile load
    await waitFor(() => {
      expect(getByTestId('username-input').props.value).toBe('initialuser');
    });

    const usernameInput = getByTestId('username-input');
    const websiteInput = getByTestId('website-input');
    const saveButton = getByTestId('save-profile-button');

    // Change username and website fields
    fireEvent.changeText(usernameInput, 'newusername');
    fireEvent.changeText(websiteInput, 'https://newwebsite.com');

    // Press save button
    await act(async () => {
      fireEvent.press(saveButton);
    });

    // Verify upsert call to profiles with updated information
    expect(mockFromSpy).toHaveBeenCalledWith('profiles');
    expect(mockUpsertSpy).toHaveBeenCalledWith({
      id: 'test-user-uuid',
      username: 'newusername',
      website: 'https://newwebsite.com',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      updated_at: expect.any(String),
    });

    // Verify success alert is displayed
    expect(alertSpy).toHaveBeenCalledWith('Success', 'Profile updated successfully!');
  });

  test('should validate username (required, length, characters)', async () => {
    const { getByTestId, queryByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('username-input').props.value).toBe('initialuser');
    });

    const usernameInput = getByTestId('username-input');

    // 1. Test empty username
    fireEvent.changeText(usernameInput, '');
    expect(getByTestId('username-error').props.children).toBe('Username is required');

    // 2. Test short username
    fireEvent.changeText(usernameInput, 'ab');
    expect(getByTestId('username-error').props.children).toBe('Username must be at least 3 characters');

    // 3. Test long username
    fireEvent.changeText(usernameInput, 'a'.repeat(21));
    expect(getByTestId('username-error').props.children).toBe('Username must be at most 20 characters');

    // 4. Test invalid characters
    fireEvent.changeText(usernameInput, 'user name');
    expect(getByTestId('username-error').props.children).toBe('Username can only contain alphanumeric characters, underscores, hyphens, and periods');

    // 5. Test valid username clears error
    fireEvent.changeText(usernameInput, 'valid_user.1');
    expect(queryByTestId('username-error')).toBeNull();
  });

  test('should validate website URL format', async () => {
    const { getByTestId, queryByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('website-input').props.value).toBe('https://initialwebsite.com');
    });

    const websiteInput = getByTestId('website-input');

    // 1. Test invalid URL
    fireEvent.changeText(websiteInput, 'not-a-url');
    expect(getByTestId('website-error').props.children).toBe('Please enter a valid website URL');

    // 2. Test empty URL is allowed (optional)
    fireEvent.changeText(websiteInput, '');
    expect(queryByTestId('website-error')).toBeNull();

    // 3. Test valid URL
    fireEvent.changeText(websiteInput, 'https://example.com');
    expect(queryByTestId('website-error')).toBeNull();
  });

  test('should validate custom avatar URL format', async () => {
    const { getByTestId, queryByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('camera-toggle')).toBeTruthy();
    });

    // Toggle camera picker to render custom avatar input
    fireEvent.press(getByTestId('camera-toggle'));
    const customAvatarInput = getByTestId('custom-avatar-input');

    // 1. Test invalid URL
    fireEvent.changeText(customAvatarInput, 'invalid-avatar-url');
    expect(getByTestId('avatar-error').props.children).toBe('Please enter a valid image URL');

    // 2. Test empty URL is allowed
    fireEvent.changeText(customAvatarInput, '');
    expect(queryByTestId('avatar-error')).toBeNull();

    // 3. Test valid URL
    fireEvent.changeText(customAvatarInput, 'https://placehold.co/150.jpg');
    expect(queryByTestId('avatar-error')).toBeNull();
  });

  test('should block profile update and alert on validation errors', async () => {
    const { getByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('username-input').props.value).toBe('initialuser');
    });

    // Enter invalid username and website
    fireEvent.changeText(getByTestId('username-input'), 'ab');
    fireEvent.changeText(getByTestId('website-input'), 'invalid-url');

    const saveButton = getByTestId('save-profile-button');
    await act(async () => {
      fireEvent.press(saveButton);
    });

    // Verify Supabase upsert is NOT called
    expect(mockUpsertSpy).not.toHaveBeenCalled();

    // Verify warning alert is displayed
    expect(alertSpy).toHaveBeenCalledWith(
      'Validation Error',
      'Please correct the highlighted errors before saving.'
    );
  });

  test('should handle focus/blur states styling for input fields', async () => {
    const { getByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('username-input')).toBeTruthy();
    });

    const usernameInput = getByTestId('username-input');

    // Focus username
    fireEvent(usernameInput, 'focus');
    expect(usernameInput.props.className).toContain('border-blue-500 bg-white');

    // Blur username
    fireEvent(usernameInput, 'blur');
    expect(usernameInput.props.className).not.toContain('border-blue-500 bg-white');

    // Enter invalid username to verify error styling
    fireEvent.changeText(usernameInput, 'ab');
    fireEvent(usernameInput, 'blur');
    expect(usernameInput.props.className).toContain('border-red-400 bg-red-50/5');

    // Toggle camera picker to render custom avatar input
    fireEvent.press(getByTestId('camera-toggle'));
    const customAvatarInput = getByTestId('custom-avatar-input');
    fireEvent(customAvatarInput, 'focus');
    expect(customAvatarInput.props.className).toContain('border-blue-500');
    fireEvent(customAvatarInput, 'blur');
    expect(customAvatarInput.props.className).not.toContain('border-blue-500');
  });

  test('should handle avatar picker toggling, selecting presets, and custom URL edits', async () => {
    const { getByTestId, queryByTestId } = render(<Account />);

    // Wait for initial load
    await waitFor(() => {
      expect(getByTestId('camera-toggle')).toBeTruthy();
    });

    // Preset picker is hidden by default
    expect(queryByTestId('custom-avatar-input')).toBeNull();

    // Toggle camera picker
    const cameraToggle = getByTestId('camera-toggle');
    fireEvent.press(cameraToggle);

    // Now picker elements should render
    const customAvatarInput = getByTestId('custom-avatar-input');
    expect(customAvatarInput).toBeTruthy();

    // Click preset avatar 4
    const preset4Btn = getByTestId('preset-avatar-4');
    fireEvent.press(preset4Btn);

    // Edit custom URL text
    fireEvent.changeText(customAvatarInput, 'https://custom-avatar-url.jpg');

    // Check if Save Profile changes incorporates custom URL
    const saveButton = getByTestId('save-profile-button');
    await act(async () => {
      fireEvent.press(saveButton);
    });

    expect(mockUpsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar_url: 'https://custom-avatar-url.jpg',
      })
    );
  });

  test('should handle Zustand sync and rejections simulation triggers', async () => {
    const { getByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('toggle-offline')).toBeTruthy();
    });

    // Retrieve state setter spies dynamically
    const mockSetNetworkOnline = useActorOpsStore((state: any) => state.setNetworkOnline);
    const mockSetRemoteRejectActive = useActorOpsStore((state: any) => state.setRemoteRejectActive);

    console.log('DEBUG: mockSetNetworkOnline from store:', mockSetNetworkOnline);
    console.log('DEBUG: global mockSetNetworkOnline:', (global as any).mockSetNetworkOnline);

    // Toggle network simulation switch
    const offlineToggle = getByTestId('toggle-offline');
    fireEvent.press(offlineToggle);
    // Since mock networkOnline is true initially, it should toggle to false
    expect(mockSetNetworkOnline).toHaveBeenCalledWith(false);

    // Toggle rejection simulation switch
    const rejectionToggle = getByTestId('toggle-rejections');
    fireEvent.press(rejectionToggle);
    // Since mock remoteRejectActive is false initially, it should toggle to true
    expect(mockSetRemoteRejectActive).toHaveBeenCalledWith(true);
  });

  test('should handle simulation toggles (dark mode and save logs) persisting to MMKV', async () => {
    const { getByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('toggle-dark-mode')).toBeTruthy();
    });

    // Toggle Dark Mode
    const darkModeToggle = getByTestId('toggle-dark-mode');
    fireEvent.press(darkModeToggle);
    expect(mmkvInstance.set).toHaveBeenCalledWith('sim_dark_mode', true);

    // Toggle Save Logs
    const saveLogsToggle = getByTestId('toggle-save-logs');
    fireEvent.press(saveLogsToggle);
    expect(mmkvInstance.set).toHaveBeenCalledWith('sim_save_logs', true);
  });

  test('should trigger MMKV cache clear procedures on developer actions', async () => {
    const { getByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('clear-mmkv-button')).toBeTruthy();
    });

    const clearButton = getByTestId('clear-mmkv-button');
    fireEvent.press(clearButton);

    // Verify warning alert is prompted
    expect(alertSpy).toHaveBeenCalledWith(
      'Clear MMKV Cache ⚠️',
      expect.any(String),
      expect.any(Array)
    );

    // Verify clearAll and success confirmation
    expect(mmkvInstance.clearAll).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Success', 'MMKV Storage successfully wiped.');
  });

  test('should trigger Zustand state resets on developer actions', async () => {
    const { getByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('reset-zustand-button')).toBeTruthy();
    });

    // Retrieve Zustand state reset spy functions
    const mockSetNetworkOnline = useActorOpsStore((state: any) => state.setNetworkOnline);
    const mockSetRemoteRejectActive = useActorOpsStore((state: any) => state.setRemoteRejectActive);
    const mockSetLatestReceipt = useActorOpsStore.getState().setLatestReceipt;
    const mockSetLatestEvent = useActorOpsStore.getState().setLatestEvent;
    const mockSetCounts = useActorOpsStore.getState().setCounts;

    const resetBtn = getByTestId('reset-zustand-button');
    fireEvent.press(resetBtn);

    // Verify reset alert is prompted
    expect(alertSpy).toHaveBeenCalledWith(
      'Reset Zustand Store 🔄',
      expect.any(String),
      expect.any(Array)
    );

    // Verify reset state actions are triggered
    expect(mockSetNetworkOnline).toHaveBeenCalledWith(true);
    expect(mockSetRemoteRejectActive).toHaveBeenCalledWith(false);
    expect(mockSetLatestReceipt).toHaveBeenCalledWith(null);
    expect(mockSetLatestEvent).toHaveBeenCalledWith(null);
    expect(mockSetCounts).toHaveBeenCalledWith(0, 0);

    expect(alertSpy).toHaveBeenCalledWith('Success', 'Zustand operations store reset.');
  });

  test('should trigger AsyncStorage cache clear on developer actions', async () => {
    const { getByTestId } = render(<Account />);

    await waitFor(() => {
      expect(getByTestId('clear-async-storage-button')).toBeTruthy();
    });

    const clearSpy = jest.spyOn(AsyncStorage, 'clear').mockResolvedValue();
    const clearBtn = getByTestId('clear-async-storage-button');
    fireEvent.press(clearBtn);

    // Verify warning alert is prompted using robust string matcher
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Clear AsyncStorage'),
      expect.any(String),
      expect.any(Array)
    );

    // Verify AsyncStorage.clear execution asynchronously
    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Success', 'AsyncStorage flushed.');
    });

    clearSpy.mockRestore();
  });

  test('should handle profile load errors (status != 406) and alert', async () => {
    mockSingleSpy.mockResolvedValueOnce({
      data: null,
      error: new Error('Database connection failed'),
      status: 500,
    });
    
    render(<Account />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error loading profile', 'Database connection failed');
    });
  });

  test('should handle refreshMMKVKeyCount error', async () => {
    const { getByTestId } = render(<Account />);
    await waitFor(() => {
      expect(getByTestId('toggle-dark-mode')).toBeTruthy();
    });

    (mmkvInstance.getAllKeys as jest.Mock).mockImplementationOnce(() => {
      throw new Error('MMKV read failed');
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    fireEvent.press(getByTestId('toggle-dark-mode'));

    expect(warnSpy).toHaveBeenCalledWith(expect.any(Error));
    warnSpy.mockRestore();
  });

  test('should handle update profile error when session user is missing', async () => {
    mockUseSession.mockReturnValue({ session: { user: null }, loading: false });
    
    const { getByTestId } = render(<Account />);
    await waitFor(() => {
      expect(getByTestId('save-profile-button')).toBeTruthy();
    });
    
    await act(async () => {
      fireEvent.changeText(getByTestId('username-input'), 'validuser');
    });
    
    await act(async () => {
      fireEvent.press(getByTestId('save-profile-button'));
    });
    
    expect(alertSpy).toHaveBeenCalledWith('Error updating profile', 'No user on the session!');
  });

  test('should handle update profile error from supabase', async () => {
    mockUpsertSpy.mockResolvedValueOnce({ error: new Error('Upsert failed') });
    
    const { getByTestId } = render(<Account />);
    await waitFor(() => {
      expect(getByTestId('save-profile-button')).toBeTruthy();
    });
    
    await act(async () => {
      fireEvent.press(getByTestId('save-profile-button'));
    });
    
    expect(alertSpy).toHaveBeenCalledWith('Error updating profile', 'Upsert failed');
  });

  test('should handle getInitials falling back to email or ??', async () => {
    mockSingleSpy.mockResolvedValueOnce({
      data: { username: '', website: '', avatar_url: '' },
      error: null,
      status: 200,
    });
    
    const { getByText, rerender } = render(<Account />);
    
    await waitFor(() => {
      expect(getByText('TE')).toBeTruthy();
    });

    mockUseSession.mockReturnValue({ session: { user: { id: 'test-user-uuid', email: '' } }, loading: false });
    
    mockSingleSpy.mockResolvedValueOnce({
      data: { username: '', website: '', avatar_url: '' },
      error: null,
      status: 200,
    });
    
    rerender(<Account />);
    
    await waitFor(() => {
      expect(getByText('??')).toBeTruthy();
    });
  });

  test('should handle developer tool errors', async () => {
    const { getByTestId } = render(<Account />);
    await waitFor(() => {
      expect(getByTestId('clear-mmkv-button')).toBeTruthy();
    });

    (mmkvInstance.clearAll as any).mockImplementationOnce(() => {
      throw new Error('clearAll failed');
    });
    fireEvent.press(getByTestId('clear-mmkv-button'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'clearAll failed');

    const mockSetNetworkOnline = (global as any).mockSetNetworkOnline;
    mockSetNetworkOnline.mockImplementationOnce(() => {
      throw new Error('reset failed');
    });
    fireEvent.press(getByTestId('reset-zustand-button'));
    

    
    expect(alertSpy).toHaveBeenCalledWith('Error', 'reset failed');

    const clearSpy = jest.spyOn(AsyncStorage, 'clear').mockRejectedValueOnce(new Error('async clear failed'));
    fireEvent.press(getByTestId('clear-async-storage-button'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'async clear failed');
    });
    clearSpy.mockRestore();
  });

  test('should handle image fallback on error', async () => {
    const { getByTestId, getByText } = render(<Account />);
    await waitFor(() => {
      expect(getByTestId('avatar-image')).toBeTruthy();
    });
    
    fireEvent(getByTestId('avatar-image'), 'onError');
    
    await waitFor(() => {
      expect(getByText('IN')).toBeTruthy();
    });
  });

  test('should handle Sign Out', async () => {
    const { getByText } = render(<Account />);
    await waitFor(() => {
      expect(getByText('Sign Out')).toBeTruthy();
    });

    fireEvent.press(getByText('Sign Out'));

    const mockSignOut = supabase.auth.signOut;
    expect(alertSpy).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.any(Array)
    );
    expect(mockSignOut).toHaveBeenCalled();
  });
});
