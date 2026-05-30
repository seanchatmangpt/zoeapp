/**
 * @fileoverview React component for guarding routes.
 * Integrates with Expo Router and SessionProvider to enforce admission checks.
 */

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '@/context/SessionProvider';
import { useActorOpsStore } from '../lib/actor/actorOps';
import { mmkvInstance } from '../lib/store/mmkvStorage';
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
  const latestReceipt = useActorOpsStore((state: any) => state.latestReceipt);
  const [receiptVerified, setReceiptVerified] = React.useState(false);
  const [checkingReceipt, setCheckingReceipt] = React.useState(!!route.requiredReceiptCommandId);

  React.useEffect(() => {
    let active = true;
    let mmkvListener: { remove: () => void } | null = null;

    async function verifyReceipt() {
      if (!route.requiredReceiptCommandId) {
        if (active) {
          setReceiptVerified(true);
          setCheckingReceipt(false);
        }
        return;
      }

      if (active) {
        setCheckingReceipt(true);
      }

      try {
        // 1. Check Zustand store's latestReceipt first (fast local check)
        if (latestReceipt && latestReceipt.commandId === route.requiredReceiptCommandId) {
          if (!route.requiredReceiptDeltaHash || latestReceipt.deltaHash === route.requiredReceiptDeltaHash) {
            if (active) {
              setReceiptVerified(true);
              setCheckingReceipt(false);
            }
            return;
          }
        }

        // 2. Check MMKV (fast synchronous lookup)
        const mmkvReceiptJson = mmkvInstance.getString(`receipt_${route.requiredReceiptCommandId}`);
        const mmkvHash = mmkvInstance.getString(`receipt_hash_${route.requiredReceiptCommandId}`);
        
        let foundInMMKV = false;
        if (mmkvReceiptJson) {
          const receipt = JSON.parse(mmkvReceiptJson);
          if (!route.requiredReceiptDeltaHash || receipt.deltaHash === route.requiredReceiptDeltaHash) {
            foundInMMKV = true;
          }
        } else if (mmkvHash) {
          if (!route.requiredReceiptDeltaHash || mmkvHash === route.requiredReceiptDeltaHash) {
            foundInMMKV = true;
          }
        }

        if (foundInMMKV) {
          if (active) {
            setReceiptVerified(true);
            setCheckingReceipt(false);
          }
          return;
        }

        // 3. Check SQLite if not found in MMKV/Zustand
        const { db } = require('../lib/db/db');
        const { actorReceipts } = require('../lib/db/schema');
        const { eq } = require('drizzle-orm');

        const records = await db
          .select()
          .from(actorReceipts)
          .where(eq(actorReceipts.commandId, route.requiredReceiptCommandId));

        if (records.length > 0) {
          const record = records[0];
          
          if (route.requiredReceiptDeltaHash) {
            if (record.deltaHash === route.requiredReceiptDeltaHash) {
              if (active) {
                setReceiptVerified(true);
              }
            } else {
              if (active) {
                setReceiptVerified(false);
              }
            }
          } else {
            if (active) {
              setReceiptVerified(true);
            }
          }
        } else {
          if (active) {
            setReceiptVerified(false);
          }
        }
      } catch (err) {
        if (active) {
          setReceiptVerified(false);
        }
      } finally {
        if (active) {
          setCheckingReceipt(false);
        }
      }
    }

    verifyReceipt();

    // Subscribe to MMKV changes dynamically
    if (route.requiredReceiptCommandId) {
      try {
        mmkvListener = mmkvInstance.addOnValueChangedListener((key: string) => {
          if (
            key === `receipt_${route.requiredReceiptCommandId}` ||
            key === `receipt_hash_${route.requiredReceiptCommandId}`
          ) {
            verifyReceipt();
          }
        });
      } catch (err) {
        console.warn('Failed to subscribe to MMKV changes in ProtectedRoute:', err);
      }
    }

    return () => {
      active = false;
      if (mmkvListener) {
        mmkvListener.remove();
      }
    };
  }, [route.requiredReceiptCommandId, route.requiredReceiptDeltaHash, latestReceipt]);

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

  if (!admitted) {
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
  }

  // If admitted but receipt check is in progress, show loading spinner
  if (checkingReceipt) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // If receipt verification failed, refuse access
  if (!receiptVerified) {
    const receiptRefusal: RefusalReason = {
      code: 'RECEIPT_NOT_FOUND',
      message: `Required BLAKE3 receipt for command '${route.requiredReceiptCommandId}' was not found in local storage.`,
    };

    if (fallback) {
      if (typeof fallback === 'function') {
        return <>{fallback(receiptRefusal)}</>;
      }
      return <>{fallback}</>;
    }

    const resolvedRedirectPath = redirectPath ?? '/(tabs)';
    return <Redirect href={resolvedRedirectPath as any} />;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
