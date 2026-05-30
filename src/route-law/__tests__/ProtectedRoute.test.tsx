import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { ProtectedRoute } from '../ProtectedRoute';
import { useRouteAdmission } from '../../hooks/useRouteAdmission';

const mockUseSession = jest.fn();

jest.mock('@/context/SessionProvider', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('expo-router', () => {
  const ReactMock = require('react');
  return {
    Redirect: ({ href }: { href: string }) =>
      ReactMock.createElement('Text', { testID: 'redirect-mock' }, `Redirect: ${href}`),
  };
});

describe('ProtectedRoute Component and useRouteAdmission Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
