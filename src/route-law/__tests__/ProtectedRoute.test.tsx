import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { ProtectedRoute } from '../ProtectedRoute';
import { useRouteAdmission } from '../../hooks/useRouteAdmission';

const mockUseSession = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/context/SessionProvider', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('expo-router', () => {
  const ReactMock = require('react');
  return {
    Redirect: ({ href }: { href: string }) =>
      ReactMock.createElement('Text', { testID: 'redirect-mock' }, `Redirect: ${href}`),
    useRouter: () => ({
      replace: mockReplace,
    }),
  };
});

let mockLatestReceipt: any = null;
jest.mock('../../lib/actor/actorOps', () => {
  const mockStore = jest.fn((selector: any) => selector({ latestReceipt: mockLatestReceipt }));
  return {
    useActorOpsStore: mockStore,
  };
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
});
