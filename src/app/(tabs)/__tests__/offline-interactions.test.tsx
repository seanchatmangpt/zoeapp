import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Index from '../index';
import Account from '../account';
import OpenAI from '../openai';
import AdminOutbox from '../../admin/outbox';

// Mock Stack & Tabs navigation
jest.mock('@/src/components/AvatarRelativeProjection', () => {
  const React = require('react');
  const MockScreen = () => null;
  return {
    Stack: {
      AvatarRelativeProjection: MockScreen,
    },
    Tabs: {
      AvatarRelativeProjection: MockScreen,
    },
  };
});

// Mock expo-router Link and useRouter
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Link: ({ children, onPress, ...props }: any) => {
      return React.cloneElement(children, {
        ...props,
        onPress: (e: any) => {
          if (children.props.onPress) children.props.onPress(e);
          if (onPress) onPress(e);
        },
      });
    },
    useRouter: () => ({
      canGoBack: () => true,
      back: jest.fn(),
      replace: jest.fn(),
    }),
  };
});

// Mock SessionProvider
jest.mock('@/context/SessionProvider', () => ({
  useSession: () => ({
    session: {
      user: {
        id: 'test-user-uuid',
        email: 'test@example.com',
      },
    },
    loading: false,
  }),
}));

// Mock Supabase client
const mockSingle = jest.fn().mockResolvedValue({
  data: {
    username: 'testuser',
    website: 'https://test.com',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  },
  error: null,
  status: 200,
});
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockSupabaseChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: mockSingle,
  upsert: mockUpsert,
};
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseChain),
    auth: {
      signOut: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Mock MMKV storage
jest.mock('../../../lib/store/mmkvStorage', () => {
  const mockInstance = {
    getBoolean: jest.fn(() => false),
    set: jest.fn(),
    getAllKeys: jest.fn(() => []),
    clearAll: jest.fn(),
    getString: jest.fn(() => 'mock-value'),
  };
  return {
    mmkvInstance: mockInstance,
  };
});

// Mock Drizzle DB
jest.mock('../../../lib/db/db', () => ({
  db: {
    insert: jest.fn(() => ({
      values: jest.fn(() => Promise.resolve()),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        orderBy: jest.fn(() => Promise.resolve([])),
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  },
}));





describe('Offline Mode User Interactions & Banner Audit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display offline status banner and disable operations when offline (index/home tab)', async () => {
    // Force Offline State
    (global as any).mockNetworkOnline = false;
    const { useActorOpsStore } = require('../../../lib/actor/actorOps');
    console.log('DEBUG test mockNetworkOnline:', (global as any).mockNetworkOnline);
    console.log('DEBUG test store state:', useActorOpsStore.getState());

    const { getByTestId } = render(<Index />);

    // 1. Audit banner visibility
    await waitFor(() => {
      expect(getByTestId('offline-banner')).toBeTruthy();
    });

    // 2. Audit volunteer cancel button is disabled
    const cancelBtn = getByTestId('volunteer-cancel-btn');
    expect(cancelBtn.props.accessibilityState?.disabled).toBe(true);

    // 3. Audit presence of offline help text
    expect(getByTestId('offline-help-state')).toBeTruthy();
  });

  test('should display offline status banner and disable operations when offline (account tab)', async () => {
    // Force Offline State
    (global as any).mockNetworkOnline = false;

    const { getByTestId } = render(<Account />);

    // 1. Audit banner visibility
    await waitFor(() => {
      expect(getByTestId('offline-banner')).toBeTruthy();
    });

    // 2. Audit save profile changes button is disabled
    const saveBtn = getByTestId('save-profile-button');
    expect(saveBtn.props.accessibilityState?.disabled).toBe(true);

    // 3. Audit presence of offline help text
    expect(getByTestId('account-offline-help')).toBeTruthy();
  });

  test('should display offline status banner and disable openai assistant when offline', async () => {
    // Force Offline State
    (global as any).mockNetworkOnline = false;

    const { getByTestId } = render(<OpenAI />);

    // 1. Audit banner visibility
    await waitFor(() => {
      expect(getByTestId('offline-banner')).toBeTruthy();
    });

    // 2. Audit send button is disabled
    const sendBtn = getByTestId('send-button');
    expect(sendBtn.props.accessibilityState?.disabled).toBe(true);

    // 3. Audit presence of offline message banner
    expect(getByTestId('openai-offline-state')).toBeTruthy();
  });

  test('should disable manual outbox sync actions when offline', async () => {
    // Force Offline State
    (global as any).mockNetworkOnline = false;

    const { getByTestId } = render(<AdminOutbox />);

    // 1. Audit banner visibility (via AdminShell rendering)
    await waitFor(() => {
      expect(getByTestId('offline-banner')).toBeTruthy();
    });

    // 2. Audit outbox sync button is disabled
    const syncBtn = getByTestId('sync-outbox-now');
    expect(syncBtn.props.accessibilityState?.disabled).toBe(true);

    // 3. Audit presence of offline state warnings
    expect(getByTestId('outbox-offline-state')).toBeTruthy();
  });

  test('should enable all actions and hide banners when network is online', async () => {
    // Force Online State
    (global as any).mockNetworkOnline = true;

    const { queryByTestId, getByTestId } = render(<Index />);

    // 1. Audit banner is NOT visible
    expect(queryByTestId('offline-banner')).toBeNull();

    // 2. Audit volunteer cancel button is enabled
    const cancelBtn = getByTestId('volunteer-cancel-btn');
    expect(cancelBtn.props.accessibilityState?.disabled).toBeFalsy();

    // 3. Audit offline help text is NOT visible
    expect(queryByTestId('offline-help-state')).toBeNull();
  });
});
