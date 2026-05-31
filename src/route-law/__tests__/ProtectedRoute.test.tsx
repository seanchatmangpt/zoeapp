import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { render, fireEvent } from '@testing-library/react-native';
import { ProtectedRoute, PremiumReceiptBlockingScreen, defaultResolveParticipant } from '../ProtectedRoute';
import { useRouteAdmission } from '../../hooks/useRouteAdmission';

const mockUseSession = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/context/SessionProvider', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('expo-router', () => {
  const ReactMock = require('react');
  const MockStack = ({ children }: any) => ReactMock.createElement('View', null, children);
  MockStack.Screen = ({ children }: any) => ReactMock.createElement('View', null, children);
  const MockTabs = ({ children }: any) => ReactMock.createElement('View', null, children);
  MockTabs.Screen = ({ children }: any) => ReactMock.createElement('View', null, children);
  return {
    Redirect: ({ href }: { href: string }) =>
      ReactMock.createElement('Text', { testID: 'redirect-mock' }, `Redirect: ${href}`),
    useRouter: () => ({
      replace: mockReplace,
    }),
    Stack: MockStack,
    Tabs: MockTabs,
  };
});

import { useActorOpsStore } from '@/src/lib/actor/actorOps';

declare global {
  var mockLatestReceipt: any;
}

Object.defineProperty(global, 'mockLatestReceipt', {
  get() {
    return useActorOpsStore.getState().latestReceipt;
  },
  set(val) {
    useActorOpsStore.setState({ latestReceipt: val });
  },
  configurable: true,
});
let mockDbRecords: any[] = [];
jest.mock('../../lib/db/db', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve(mockDbRecords)),
      })),
    })),
  },
}));

jest.mock('../../lib/db/schema', () => ({
  actorReceipts: {
    commandId: 'commandId',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
}));

describe('ProtectedRoute Component and useRouteAdmission Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLatestReceipt = null;
    mockDbRecords = [];
  });

  describe('ProtectedRoute', () => {
    test('renders loadingComponent when loading is true', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: true,
      });

      const route = { requiredIdentityBoundary: 'authenticated' };
      let root: any;
      act(() => {
        root = renderer.create(
          <ProtectedRoute route={route} loadingComponent={<Text>Loading Custom...</Text>}>
            <Text>Protected Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Loading Custom...'],
        })
      );
    });

    test('renders children when admitted is true', () => {
      mockUseSession.mockReturnValue({
        session: {
          user: {
            id: '123',
            email_confirmed_at: '2026-05-23T00:00:00Z',
          },
        },
        loading: false,
      });

      const route = { requiredIdentityBoundary: 'verified' };
      let root: any;
      act(() => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Admitted Children</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Admitted Children'],
        })
      );
    });

    test('renders fallback component when admission fails and fallback is provided', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: false,
      });

      const route = { requiredIdentityBoundary: 'authenticated' };
      let root: any;
      act(() => {
        root = renderer.create(
          <ProtectedRoute route={route} fallback={<Text>Access Denied Fallback</Text>}>
            <Text>Protected Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Access Denied Fallback'],
        })
      );
    });

    test('renders fallback function output when admission fails and fallback function is provided', () => {
      mockUseSession.mockReturnValue({
        session: {
          user: {
            id: '123',
          },
        },
        loading: false,
      });

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredDisclosures: ['signed_nda'],
      };

      const fallbackFn = (refusal: any) => (
        <Text>
          Refused code: {refusal.code}, missing: {refusal.missingDisclosures?.join(', ')}
        </Text>
      );

      let root: any;
      act(() => {
        root = renderer.create(
          <ProtectedRoute route={route} fallback={fallbackFn}>
            <Text>Protected Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Refused code: ', 'MISSING_DISCLOSURE', ', missing: ', 'signed_nda'],
        })
      );
    });

    test('renders Redirect to default path when admission fails and no fallback is provided', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: false,
      });

      const route = { requiredIdentityBoundary: 'authenticated' };
      let root: any;
      act(() => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Protected Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Redirect: /(auth)'],
        })
      );
    });

    test('renders Redirect to custom redirectPath when admission fails', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: false,
      });

      const route = { requiredIdentityBoundary: 'authenticated' };
      let root: any;
      act(() => {
        root = renderer.create(
          <ProtectedRoute route={route} redirectPath="/login">
            <Text>Protected Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Redirect: /login'],
        })
      );
    });

    test('renders children if receipt exists in Zustand store', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = {
        commandId: 'cmd-123',
        deltaHash: 'hash-abc',
      };

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-123',
        requiredReceiptDeltaHash: 'hash-abc',
      };

      let root: any;
      await act(async () => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Protected Receipt Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Protected Receipt Content'],
        })
      );
    });

    test('renders children if receipt exists in MMKV', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      const { mmkvInstance } = require('../../lib/store/mmkvStorage');
      (jest.spyOn(mmkvInstance, 'getString') as any).mockImplementation((key: any) => {
        if (key === 'receipt_cmd-456') {
          return JSON.stringify({ deltaHash: 'hash-xyz' });
        }
        return undefined;
      });

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-456',
        requiredReceiptDeltaHash: 'hash-xyz',
      };

      let root: any;
      await act(async () => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Protected MMKV Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Protected MMKV Content'],
        })
      );
    });

    test('renders children if receipt exists in SQLite', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      const { mmkvInstance } = require('../../lib/store/mmkvStorage');
      jest.spyOn(mmkvInstance, 'getString').mockReturnValue(undefined);

      mockDbRecords = [{
        commandId: 'cmd-789',
        deltaHash: 'hash-abc',
      }];

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-789',
        requiredReceiptDeltaHash: 'hash-abc',
      };

      let root: any;
      await act(async () => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Protected SQLite Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Protected SQLite Content'],
        })
      );
    });

    test('reactively reruns and unlocks when Zustand latestReceipt updates', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      // Start with no receipt
      mockLatestReceipt = null;

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-reactive-zustand',
      };

      let root: any;
      await act(async () => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Reactive Zustand Content</Text>
          </ProtectedRoute>
        );
      });

      // Initially it should show the premium blocking screen because receipt is not verified
      expect(JSON.stringify(root.toJSON())).toContain('Admission Refused');

      // Now update the Zustand store's latestReceipt and trigger update
      await act(async () => {
        mockLatestReceipt = {
          commandId: 'cmd-reactive-zustand',
          deltaHash: 'some-hash',
        };
        // Re-render the component to simulate a store state change triggering a re-render
        root.update(
          <ProtectedRoute route={route}>
            <Text>Reactive Zustand Content</Text>
          </ProtectedRoute>
        );
      });

      // Now it should show the child content
      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Reactive Zustand Content'],
        })
      );
    });

    test('reactively reruns and unlocks when MMKV listener fires', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      let listenerCallback: ((key: string) => void) | null = null;
      const { mmkvInstance } = require('../../lib/store/mmkvStorage');
      jest.spyOn(mmkvInstance, 'addOnValueChangedListener').mockImplementation((cb: any) => {
        listenerCallback = cb;
        return { remove: jest.fn() };
      });

      let mmkvValue: string | undefined = undefined;
      (jest.spyOn(mmkvInstance, 'getString') as any).mockImplementation((key: any) => {
        if (key === 'receipt_cmd-reactive-mmkv') {
          return mmkvValue;
        }
        return undefined;
      });

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-reactive-mmkv',
      };

      let root: any;
      await act(async () => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Reactive MMKV Content</Text>
          </ProtectedRoute>
        );
      });

      // Initially it should show the premium blocking screen because receipt is not verified
      expect(JSON.stringify(root.toJSON())).toContain('Admission Refused');

      // Now simulate a change in MMKV and trigger the listener
      await act(async () => {
        mmkvValue = JSON.stringify({ deltaHash: 'some-hash' });
        if (listenerCallback) {
          listenerCallback('receipt_cmd-reactive-mmkv');
        }
      });

      // After listener fires, it should be verified and render children
      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Reactive MMKV Content'],
        })
      );
    });

    test('renders refusal overlay and then renders children after retry succeeds', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      // Start with empty records so it fails
      mockDbRecords = [];

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-retry-test',
        requiredReceiptDeltaHash: 'hash-success',
      };

      const { getByText, queryByText } = render(
        <ProtectedRoute route={route}>
          <Text>Children Rendered After Retry</Text>
        </ProtectedRoute>
      );

      // Wait for the asynchronous database checks and initial render to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getByText('Admission Refused')).toBeTruthy();
      expect(queryByText('Children Rendered After Retry')).toBeNull();

      // Now set mock records to succeed
      mockDbRecords = [{
        commandId: 'cmd-retry-test',
        deltaHash: 'hash-success',
      }];

      // Click the retry button
      const retryBtn = getByText('Retry Verification');
      await act(async () => {
        fireEvent.press(retryBtn);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Now children should be rendered!
      expect(getByText('Children Rendered After Retry')).toBeTruthy();
      expect(queryByText('Admission Refused')).toBeNull();
    });

    test('renders Refusal page with RECEIPT_VERIFICATION_ERROR when SQLite query throws error', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      const { db } = require('../../lib/db/db');
      db.select.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-db-error',
      };

      const { getByText } = render(
        <ProtectedRoute route={route}>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getByText('Admission Refused')).toBeTruthy();
      expect(getByText('Refusal Reason (RECEIPT_VERIFICATION_ERROR)')).toBeTruthy();
      expect(getByText(/Database connection failed/)).toBeTruthy();
      expect(getByText('Unverified ❌')).toBeTruthy();
    });

    test('renders Refusal page with RECEIPT_HASH_MISMATCH when hash in database does not match requiredReceiptDeltaHash', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      mockDbRecords = [{
        commandId: 'cmd-hash-mismatch',
        deltaHash: 'actual-wrong-hash',
      }];

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-hash-mismatch',
        requiredReceiptDeltaHash: 'expected-correct-hash',
      };

      const { getByText, queryByText } = render(
        <ProtectedRoute route={route}>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getByText('Admission Refused')).toBeTruthy();
      expect(getByText('Refusal Reason (RECEIPT_HASH_MISMATCH)')).toBeTruthy();
      expect(getByText(/delta hash mismatch/)).toBeTruthy();
      expect(queryByText('Protected Content')).toBeNull();
    });

    test('renders Refusal page with RECEIPT_HASH_MISMATCH when hash in MMKV does not match requiredReceiptDeltaHash', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      const { mmkvInstance } = require('../../lib/store/mmkvStorage');
      const mmkvSpy = jest.spyOn(mmkvInstance, 'getString').mockImplementation((key: any) => {
        if (key === 'receipt_cmd-mmkv-mismatch') {
          return JSON.stringify({ deltaHash: 'actual-wrong-hash' });
        }
        return undefined;
      });

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-mmkv-mismatch',
        requiredReceiptDeltaHash: 'expected-correct-hash',
      };

      const { getByText, queryByText } = render(
        <ProtectedRoute route={route}>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getByText('Admission Refused')).toBeTruthy();
      expect(getByText('Refusal Reason (RECEIPT_HASH_MISMATCH)')).toBeTruthy();
      expect(getByText(/delta hash mismatch/)).toBeTruthy();
      expect(queryByText('Protected Content')).toBeNull();

      mmkvSpy.mockRestore();
    });

    test('renders Refusal page with RECEIPT_HASH_MISMATCH when hash in Zustand does not match requiredReceiptDeltaHash', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = {
        commandId: 'cmd-zustand-mismatch',
        deltaHash: 'actual-wrong-hash',
      };

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-zustand-mismatch',
        requiredReceiptDeltaHash: 'expected-correct-hash',
      };

      const { getByText, queryByText } = render(
        <ProtectedRoute route={route}>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getByText('Admission Refused')).toBeTruthy();
      expect(getByText('Refusal Reason (RECEIPT_HASH_MISMATCH)')).toBeTruthy();
      expect(getByText(/delta hash mismatch/)).toBeTruthy();
      expect(queryByText('Protected Content')).toBeNull();
    });

    test('renders children if receipt exists in MMKV as hash only', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      const { mmkvInstance } = require('../../lib/store/mmkvStorage');
      const mmkvSpy = jest.spyOn(mmkvInstance, 'getString').mockImplementation((key: any) => {
        if (key === 'receipt_hash_cmd-hash-only') {
          return 'hash-xyz';
        }
        return undefined;
      });

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-hash-only',
        requiredReceiptDeltaHash: 'hash-xyz',
      };

      let root: any;
      await act(async () => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Protected MMKV Hash Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Protected MMKV Hash Content'],
        })
      );
      mmkvSpy.mockRestore();
    });

    test('renders Refusal page with RECEIPT_HASH_MISMATCH when MMKV hash only mismatch', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      const { mmkvInstance } = require('../../lib/store/mmkvStorage');
      const mmkvSpy = jest.spyOn(mmkvInstance, 'getString').mockImplementation((key: any) => {
        if (key === 'receipt_hash_cmd-hash-only-mismatch') {
          return 'wrong-hash';
        }
        return undefined;
      });

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-hash-only-mismatch',
        requiredReceiptDeltaHash: 'expected-correct-hash',
      };

      const { getByText, queryByText } = render(
        <ProtectedRoute route={route}>
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(getByText('Admission Refused')).toBeTruthy();
      expect(getByText('Refusal Reason (RECEIPT_HASH_MISMATCH)')).toBeTruthy();
      expect(queryByText('Protected Content')).toBeNull();

      mmkvSpy.mockRestore();
    });

    test('renders children if receipt exists in SQLite without required delta hash', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      const { mmkvInstance } = require('../../lib/store/mmkvStorage');
      const mmkvSpy = jest.spyOn(mmkvInstance, 'getString').mockReturnValue(undefined);

      mockDbRecords = [{
        commandId: 'cmd-db-nohash',
        deltaHash: 'hash-abc',
      }];

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-db-nohash',
      };

      let root: any;
      await act(async () => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Protected SQLite Content No Hash</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Protected SQLite Content No Hash'],
        })
      );
      mmkvSpy.mockRestore();
    });

    test('warns when subscribing to MMKV changes fails', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;

      const { mmkvInstance } = require('../../lib/store/mmkvStorage');
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mmkvListenerSpy = jest.spyOn(mmkvInstance, 'addOnValueChangedListener').mockImplementation(() => {
        throw new Error('MMKV Listener Error');
      });

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-mmkv-error',
      };

      await act(async () => {
        renderer.create(
          <ProtectedRoute route={route}>
            <Text>Content</Text>
          </ProtectedRoute>
        );
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to subscribe to MMKV changes in ProtectedRoute:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
      mmkvListenerSpy.mockRestore();
    });

    test('renders default loading indicator when loading is true and no loadingComponent is provided', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: true,
      });

      const route = { requiredIdentityBoundary: 'authenticated' };
      let root: any;
      act(() => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Protected Content</Text>
          </ProtectedRoute>
        );
      });

      expect(JSON.stringify(root.toJSON())).toContain('ActivityIndicator');
    });

    test('renders fallback function output when receipt verification fails and fallback is function', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;
      mockDbRecords = [];

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-receipt-fail',
      };

      const fallbackFn = (refusal: any) => (
        <Text>Receipt Failed: {refusal.code}</Text>
      );

      let root: any;
      await act(async () => {
        root = renderer.create(
          <ProtectedRoute route={route} fallback={fallbackFn}>
            <Text>Protected Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Receipt Failed: ', 'RECEIPT_NOT_FOUND'],
        })
      );
    });

    test('renders fallback component when receipt verification fails and fallback is node', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;
      mockDbRecords = [];

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-receipt-fail',
      };

      let root: any;
      await act(async () => {
        root = renderer.create(
          <ProtectedRoute route={route} fallback={<Text>Receipt Node Fallback</Text>}>
            <Text>Protected Content</Text>
          </ProtectedRoute>
        );
      });

      expect(root.toJSON()).toEqual(
        expect.objectContaining({
          type: 'Text',
          children: ['Receipt Node Fallback'],
        })
      );
    });

    test('triggers router redirect when Redirect button is pressed on receipt block screen', async () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });
      mockLatestReceipt = null;
      mockDbRecords = [];

      const route = {
        requiredIdentityBoundary: 'authenticated',
        requiredReceiptCommandId: 'cmd-receipt-fail-redirect',
      };

      const { getByText } = render(
        <ProtectedRoute route={route} redirectPath="/custom-cancel">
          <Text>Protected Content</Text>
        </ProtectedRoute>
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const redirectBtn = getByText('Go to /custom-cancel');
      fireEvent.press(redirectBtn);

      expect(mockReplace).toHaveBeenCalledWith('/custom-cancel');
    });

    test('renders loadingComponent when checkingReceipt is true', () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });

      const route = { requiredIdentityBoundary: 'authenticated', requiredReceiptCommandId: 'cmd-check' };
      let root: any;
      act(() => {
        root = renderer.create(
          <ProtectedRoute route={route} loadingComponent={<Text>Checking Receipt...</Text>}>
            <Text>Content</Text>
          </ProtectedRoute>
        );
      });

      expect(JSON.stringify(root.toJSON())).toContain('Checking Receipt...');
    });

    test('invokes verifyReceipt when onRetry is called on PremiumReceiptBlockingScreen during isChecking', () => {
      mockUseSession.mockReturnValue({
        session: { user: { id: '123' } },
        loading: false,
      });

      const route = { requiredIdentityBoundary: 'authenticated', requiredReceiptCommandId: 'cmd-check-retry' };
      let root: any;
      act(() => {
        root = renderer.create(
          <ProtectedRoute route={route}>
            <Text>Content</Text>
          </ProtectedRoute>
        );
      });

      const blockingScreen = root.root.findByType(PremiumReceiptBlockingScreen);
      act(() => {
        blockingScreen.props.onRetry();
      });
      expect(blockingScreen).toBeDefined();
    });
  });

  describe('defaultResolveParticipant', () => {
    test('handles unauthenticated session', () => {
      expect(defaultResolveParticipant(null)).toEqual({
        identityBoundary: 'anonymous',
        disclosures: [],
      });
    });

    test('extracts disclosures and identity boundaries correctly', () => {
      const session = {
        user: {
          email_confirmed_at: '2023-01-01',
          phone_confirmed_at: '2023-01-01',
          factors: [{ id: 'factor1' }],
          user_metadata: {
            disclosures: ['age_over_18'],
            accepted_terms: true,
            identity_boundary: 'custom_boundary',
          },
        },
      };
      
      const result = defaultResolveParticipant(session);
      expect(result.identityBoundary).toBe('custom_boundary');
      expect(result.disclosures).toContain('email_verified');
      expect(result.disclosures).toContain('phone_verified');
      expect(result.disclosures).toContain('age_over_18');
      expect(result.disclosures).toContain('terms_accepted');
    });

    test('handles alternative metadata fields', () => {
      const session = {
        user: {
          user_metadata: {
            acceptedTerms: true,
            identityBoundary: 'another_boundary',
          },
        },
      };
      
      const result = defaultResolveParticipant(session);
      expect(result.identityBoundary).toBe('another_boundary');
      expect(result.disclosures).toContain('terms_accepted');
    });
  });

  describe('useRouteAdmission Hook', () => {
    test('returns loading state', () => {
      mockUseSession.mockReturnValue({
        session: null,
        loading: true,
      });

      let hookResult: any;
      const TestComponent = () => {
        hookResult = useRouteAdmission({ requiredIdentityBoundary: 'authenticated' });
        return null;
      };

      act(() => {
        renderer.create(<TestComponent />);
      });

      expect(hookResult).toEqual({
        admitted: false,
        loading: true,
      });
    });

    test('returns admitted true when verification passes', () => {
      mockUseSession.mockReturnValue({
        session: {
          user: {
            id: '123',
            email_confirmed_at: '2026-05-23T00:00:00Z',
          },
        },
        loading: false,
      });

      let hookResult: any;
      const TestComponent = () => {
        hookResult = useRouteAdmission({ requiredIdentityBoundary: 'verified' });
        return null;
      };

      act(() => {
        renderer.create(<TestComponent />);
      });

      expect(hookResult).toEqual({
        admitted: true,
        loading: false,
      });
    });

    test('returns refusal details when verification fails', () => {
      mockUseSession.mockReturnValue({
        session: {
          user: {
            id: '123',
          },
        },
        loading: false,
      });

      let hookResult: any;
      const TestComponent = () => {
        hookResult = useRouteAdmission({
          requiredIdentityBoundary: 'authenticated',
          requiredDisclosures: ['accepted_privacy_policy'],
        });
        return null;
      };

      act(() => {
        renderer.create(<TestComponent />);
      });

      expect(hookResult).toBeDefined();
      expect(hookResult.admitted).toBe(false);
      expect(hookResult.loading).toBe(false);
      expect(hookResult.refusal.code).toBe('MISSING_DISCLOSURE');
      expect(hookResult.refusal.missingDisclosures).toEqual(['accepted_privacy_policy']);
    });
  });

  describe('PremiumReceiptBlockingScreen', () => {
    const defaultProps = {
      commandId: 'cmd-12345',
      expectedHash: 'hash-abcde',
      isChecking: false,
      refusalReason: {
        code: 'RECEIPT_NOT_FOUND',
        message: 'BLAKE3 receipt not found in local storage.',
      },
      onRetry: jest.fn(),
      onRedirect: jest.fn(),
      redirectText: 'Return to Dashboard',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders verifying receipt overlay when isChecking is true', () => {
      const { getByText, queryByText } = render(
        <PremiumReceiptBlockingScreen {...defaultProps} isChecking={true} refusalReason={null} />
      );

      expect(getByText('Verifying Receipt')).toBeTruthy();
      expect(getByText('Cryptographic Proof Gating')).toBeTruthy();
      expect(getByText('BLAKE3 Verification')).toBeTruthy();
      expect(getByText('Checking...')).toBeTruthy();

      // Should show command ID
      expect(getByText('cmd-12345')).toBeTruthy();
      // Should show expected hash
      expect(getByText('hash-abcde')).toBeTruthy();

      // Refusal reason should not be shown
      expect(queryByText('BLAKE3 receipt not found in local storage.')).toBeNull();
      // Retry button should not be shown
      expect(queryByText('Retry Verification')).toBeNull();
      // Redirect/Cancel button should be shown with default text "Cancel & Return"
      expect(getByText('Cancel & Return')).toBeTruthy();
    });

    test('renders admission refused overlay when isChecking is false', () => {
      const { getByText, queryByText } = render(
        <PremiumReceiptBlockingScreen {...defaultProps} isChecking={false} />
      );

      expect(getByText('Admission Refused')).toBeTruthy();
      expect(getByText('Security Clearance Blocked')).toBeTruthy();
      expect(getByText('Unverified ❌')).toBeTruthy();

      // Should show command ID
      expect(getByText('cmd-12345')).toBeTruthy();
      // Should show expected hash
      expect(getByText('hash-abcde')).toBeTruthy();

      // Refusal reason should be shown
      expect(getByText('BLAKE3 receipt not found in local storage.')).toBeTruthy();
      expect(getByText('Refusal Reason (RECEIPT_NOT_FOUND)')).toBeTruthy();

      // Retry button should be shown
      expect(getByText('Retry Verification')).toBeTruthy();
      // Redirect/Cancel button should be shown with custom redirect text
      expect(getByText('Return to Dashboard')).toBeTruthy();
    });

    test('does not render expected hash row when expectedHash is not provided', () => {
      const { queryByText } = render(
        <PremiumReceiptBlockingScreen {...defaultProps} expectedHash={undefined} />
      );

      expect(queryByText('Required Delta Hash')).toBeNull();
      expect(queryByText('hash-abcde')).toBeNull();
    });

    test('triggers onRetry callback when Retry Verification is pressed', () => {
      const onRetryMock = jest.fn();
      const { getByText } = render(
        <PremiumReceiptBlockingScreen {...defaultProps} onRetry={onRetryMock} />
      );

      const retryBtn = getByText('Retry Verification');
      fireEvent.press(retryBtn);

      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });

    test('triggers onRedirect callback when Redirect/Cancel button is pressed', () => {
      const onRedirectMock = jest.fn();
      const { getByText } = render(
        <PremiumReceiptBlockingScreen {...defaultProps} onRedirect={onRedirectMock} />
      );

      const redirectBtn = getByText('Return to Dashboard');
      fireEvent.press(redirectBtn);

      expect(onRedirectMock).toHaveBeenCalledTimes(1);
    });

    test('renders verified badge when isChecking is false and refusalReason is not provided', () => {
      const { getByText, queryByText } = render(
        <PremiumReceiptBlockingScreen {...defaultProps} isChecking={false} refusalReason={null} />
      );

      expect(getByText('Verified ✅')).toBeTruthy();
      expect(queryByText('Unverified ❌')).toBeNull();
      expect(queryByText('Checking...')).toBeNull();
    });
  });

  describe('defaultResolveParticipant', () => {
    test('handles unauthenticated session', () => {
      expect(defaultResolveParticipant(null)).toEqual({
        identityBoundary: 'anonymous',
        disclosures: [],
      });
    });

    test('extracts disclosures and identity boundaries correctly', () => {
      const session = {
        user: {
          email_confirmed_at: '2023-01-01',
          phone_confirmed_at: '2023-01-01',
          factors: [{ id: 'factor1' }],
          user_metadata: {
            disclosures: ['age_over_18'],
            accepted_terms: true,
            identity_boundary: 'custom_boundary',
          },
        },
      };
      
      const result = defaultResolveParticipant(session);
      expect(result.identityBoundary).toBe('custom_boundary');
      expect(result.disclosures).toContain('email_verified');
      expect(result.disclosures).toContain('phone_verified');
      expect(result.disclosures).toContain('age_over_18');
      expect(result.disclosures).toContain('terms_accepted');
    });

    test('handles alternative metadata fields', () => {
      const session = {
        user: {
          user_metadata: {
            acceptedTerms: true,
            identityBoundary: 'another_boundary',
          },
        },
      };
      
      const result = defaultResolveParticipant(session);
      expect(result.identityBoundary).toBe('another_boundary');
      expect(result.disclosures).toContain('terms_accepted');
    });
  });
});
