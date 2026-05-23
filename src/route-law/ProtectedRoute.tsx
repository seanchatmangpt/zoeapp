/**
 * @fileoverview React component for guarding routes.
 * Integrates with Expo Router and SessionProvider to enforce admission checks.
 */

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '@/context/SessionProvider';
import { admitRoute, DEFAULT_IDENTITY_HIERARCHY } from './guards';
import { RouteDefinition, ParticipantBasis, RefusalReason, IdentityBoundary } from './types';

/**
 * Props for the ProtectedRoute component.
 */
export interface ProtectedRouteProps {
  /** The gating requirements for the protected route */
  route: RouteDefinition;
  /** Content to render if the participant is admitted */
  children: React.ReactNode;
  /**
   * Optional custom redirect destination path if admission is refused.
   * If not specified, defaults to '/(auth)' for unauthenticated users and '/' for other refusal types.
   */
  redirectPath?: string;
  /** Custom UI to display while session authentication is loading */
  loadingComponent?: React.ReactNode;
  /**
   * Optional React node or function to render when denied.
   * If a function is provided, it receives the refusal details.
   * If omitted, a Redirect component is rendered to redirect the user.
   */
  fallback?: React.ReactNode | ((refusal: RefusalReason) => React.ReactNode);
  /** Optional custom resolver to convert the raw session to a ParticipantBasis */
  resolveParticipant?: (session: any) => ParticipantBasis;
  /** Optional custom identity hierarchy list */
  hierarchy?: readonly IdentityBoundary[];
  /** Optional explicit participant basis to bypass default useSession check (useful for testing or nested context) */
  participant?: ParticipantBasis;
}

/**
 * Default resolver that maps a Supabase session structure to a ParticipantBasis.
 * Handles automatic extraction of email verification, metadata, etc.
 *
 * @param session The active Supabase session
 * @returns The resolved ParticipantBasis
 */
export function defaultResolveParticipant(session: any): ParticipantBasis {
  if (!session || !session.user) {
    return {
      identityBoundary: 'anonymous',
      disclosures: [],
    };
  }

  const disclosures: string[] = [];

  // 1. Extract common Supabase user attributes as automatic disclosures
  if (session.user.email_confirmed_at) {
    disclosures.push('email_verified');
  }
  if (session.user.phone_confirmed_at) {
    disclosures.push('phone_verified');
  }

  // 2. Check user metadata for explicit disclosures or flags
  const metadata = session.user.user_metadata || {};
  if (Array.isArray(metadata.disclosures)) {
    disclosures.push(...metadata.disclosures.map(String));
  }
  if (metadata.accepted_terms || metadata.acceptedTerms) {
    disclosures.push('terms_accepted');
  }

  // 3. Determine identity boundary level
  let identityBoundary: string = 'authenticated';
  if (session.user.email_confirmed_at || session.user.phone_confirmed_at) {
    identityBoundary = 'verified';
  }
  if (session.user.factors && session.user.factors.length > 0) {
    identityBoundary = 'mfa_verified';
  }

  // Allow explicit metadata overrides
  if (typeof metadata.identity_boundary === 'string') {
    identityBoundary = metadata.identity_boundary;
  } else if (typeof metadata.identityBoundary === 'string') {
    identityBoundary = metadata.identityBoundary;
  }

  return {
    identityBoundary,
    disclosures,
  };
}

/**
 * ProtectedRoute component that gates access to child components.
 * Employs typestate checks on the participant identity and disclosures.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  route,
  children,
  redirectPath,
  loadingComponent,
  fallback,
  resolveParticipant = defaultResolveParticipant,
  hierarchy = DEFAULT_IDENTITY_HIERARCHY,
  participant,
}) => {
  const { session, loading } = useSession();

  // If loading and no explicit participant is provided, render loading UI
  if (loading && !participant) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Resolve participant details (explicit override takes precedence)
  const activeParticipant = participant ?? resolveParticipant(session);

  // Evaluate admission constraints
  const { admitted, refusal } = admitRoute(activeParticipant, route, hierarchy);

  if (admitted) {
    return <>{children}</>;
  }

  // Access denied: format refusal logic
  const activeRefusal: RefusalReason = refusal ?? {
    code: 'REFUSED',
    message: 'Access is restricted.',
  };

  // Render custom fallback if defined
  if (fallback) {
    if (typeof fallback === 'function') {
      return <>{fallback(activeRefusal)}</>;
    }
    return <>{fallback}</>;
  }

  // Otherwise, fallback to routing redirect
  const resolvedRedirectPath =
    redirectPath ?? (activeRefusal.code === 'UNAUTHENTICATED' ? '/(auth)' : '/');

  return <Redirect href={resolvedRedirectPath as any} />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
