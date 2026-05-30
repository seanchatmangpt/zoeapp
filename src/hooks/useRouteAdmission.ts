/**
 * @fileoverview React Hook to evaluate route admission constraints programmatically.
 */

import { useSession } from '../../context/SessionProvider';
import { admitRoute, DEFAULT_IDENTITY_HIERARCHY } from '../route-law/guards';
import { RouteDefinition, RefusalReason, ParticipantBasis, IdentityBoundary } from '../route-law/types';
import { defaultResolveParticipant } from '../route-law/ProtectedRoute';

/**
 * Options for customizing useRouteAdmission hook evaluation.
 */
export interface UseRouteAdmissionOptions {
  /** Optional custom resolver to convert the raw session to a ParticipantBasis */
  resolveParticipant?: (session: any) => ParticipantBasis;
  /** Optional custom identity hierarchy list */
  hierarchy?: readonly IdentityBoundary[];
  /** Optional explicit participant basis to bypass default useSession resolution */
  participant?: ParticipantBasis;
}

/**
 * Result structure returned by useRouteAdmission.
 */
export interface UseRouteAdmissionResult {
  /** True if the user meets all gating conditions of the route */
  admitted: boolean;
  /** Detailed reason why admission was denied, if applicable */
  refusal?: RefusalReason;
  /** True if the underlying session check is still loading */
  loading: boolean;
}

/**
 * Custom hook to check if the current user/session meets the requirements for a route.
 *
 * @param route The RouteDefinition to check against
 * @param options Optional configuration parameters for resolver, hierarchy, or participant override
 * @returns Object containing admission status, optional refusal reason, and loading status
 */
export function useRouteAdmission(
  route: RouteDefinition,
  options?: UseRouteAdmissionOptions
): UseRouteAdmissionResult {
  const { session, loading } = useSession();

  const hierarchy = options?.hierarchy ?? DEFAULT_IDENTITY_HIERARCHY;
  const resolver = options?.resolveParticipant ?? defaultResolveParticipant;

  // Use explicit participant if provided, otherwise resolve from session context
  const activeParticipant = options?.participant ?? resolver(session);

  // If session state is still loading and no explicit participant override is present, defer check
  if (loading && !options?.participant) {
    return {
      admitted: false,
      loading: true,
    };
  }

  const checkResult = admitRoute(activeParticipant, route, hierarchy);

  return {
    admitted: checkResult.admitted,
    refusal: checkResult.refusal,
    loading: false,
  };
}
