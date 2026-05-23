/**
 * @fileoverview Pure guard checking functions for the Typestate Gating framework.
 * Houses the core business rules for route admission.
 */

import { ParticipantBasis, RouteDefinition, RefusalReason, IdentityBoundary } from './types';

/**
 * Default hierarchy of identity boundaries, from least verified/trusted to most verified/trusted.
 */
export const DEFAULT_IDENTITY_HIERARCHY: readonly IdentityBoundary[] = [
  'anonymous',
  'authenticated',
  'verified',
  'mfa_verified',
];

/**
 * Result structure of a route admission check.
 */
export interface AdmitRouteResult {
  /** True if the participant meets all constraints of the route */
  admitted: boolean;
  /** Detailed reason if the participant is refused, otherwise undefined */
  refusal?: RefusalReason;
}

/**
 * Pure checking function that evaluates whether a participant meets a route's gating requirements.
 *
 * @param participant The participant seeking admission (null/undefined defaults to anonymous with no disclosures)
 * @param route The route definition containing the required constraints
 * @param hierarchy The ordering of identity boundaries from least to most trusted
 * @returns An object indicating admission status and optional refusal reason
 */
export function admitRoute(
  participant: ParticipantBasis | null | undefined,
  route: RouteDefinition,
  hierarchy: readonly IdentityBoundary[] = DEFAULT_IDENTITY_HIERARCHY
): AdmitRouteResult {
  // 1. Resolve participant state. If null/undefined, treat as anonymous with no disclosures.
  const activeParticipant: ParticipantBasis = participant ?? {
    identityBoundary: 'anonymous',
    disclosures: [],
  };

  // 2. Evaluate identity boundary requirement if specified
  if (route.requiredIdentityBoundary) {
    const requiredIndex = hierarchy.indexOf(route.requiredIdentityBoundary);
    const actualIndex = hierarchy.indexOf(activeParticipant.identityBoundary);

    // If required identity boundary is not in hierarchy, configuration is invalid
    if (requiredIndex === -1) {
      return {
        admitted: false,
        refusal: {
          code: 'INVALID_CONFIGURATION',
          message: `Required identity boundary "${route.requiredIdentityBoundary}" is not recognized in the hierarchy configuration.`,
          requiredIdentityBoundary: route.requiredIdentityBoundary,
          actualIdentityBoundary: activeParticipant.identityBoundary,
        },
      };
    }

    // Check if participant is anonymous but route requires an authenticated/higher identity
    if (
      activeParticipant.identityBoundary === 'anonymous' &&
      route.requiredIdentityBoundary !== 'anonymous'
    ) {
      return {
        admitted: false,
        refusal: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required to access this route.',
          requiredIdentityBoundary: route.requiredIdentityBoundary,
          actualIdentityBoundary: activeParticipant.identityBoundary,
        },
      };
    }

    // Check if actual boundary is lower than required boundary in the hierarchy
    if (actualIndex < requiredIndex) {
      return {
        admitted: false,
        refusal: {
          code: 'INSUFFICIENT_IDENTITY_LEVEL',
          message: `Identity level "${activeParticipant.identityBoundary}" is insufficient. Required: "${route.requiredIdentityBoundary}".`,
          requiredIdentityBoundary: route.requiredIdentityBoundary,
          actualIdentityBoundary: activeParticipant.identityBoundary,
        },
      };
    }
  }

  // 3. Evaluate required disclosures
  if (route.requiredDisclosures && route.requiredDisclosures.length > 0) {
    const participantDisclosuresSet = new Set(activeParticipant.disclosures);
    const missingDisclosures = route.requiredDisclosures.filter(
      (disclosure) => !participantDisclosuresSet.has(disclosure)
    );

    if (missingDisclosures.length > 0) {
      return {
        admitted: false,
        refusal: {
          code: 'MISSING_DISCLOSURE',
          message: `Missing required disclosure(s): ${missingDisclosures.join(', ')}.`,
          missingDisclosures,
        },
      };
    }
  }

  // 4. Run custom guard if specified
  if (route.customGuard) {
    const customRefusal = route.customGuard(activeParticipant);
    if (customRefusal) {
      return {
        admitted: false,
        refusal: customRefusal,
      };
    }
  }

  return { admitted: true };
}
