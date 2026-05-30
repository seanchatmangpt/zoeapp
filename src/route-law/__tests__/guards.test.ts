import { admitRoute } from '../guards';
import { ParticipantBasis, RouteDefinition } from '../types';

describe('Typestate Gating - admitRoute', () => {
  const anonymousParticipant: ParticipantBasis = {
    identityBoundary: 'anonymous',
    disclosures: [],
  };

  const authenticatedParticipant: ParticipantBasis = {
    identityBoundary: 'authenticated',
    disclosures: [],
  };

  const verifiedParticipant: ParticipantBasis = {
    identityBoundary: 'verified',
    disclosures: ['email_verified'],
  };

  const mfaVerifiedParticipant: ParticipantBasis = {
    identityBoundary: 'mfa_verified',
    disclosures: ['email_verified', 'terms_accepted'],
  };

  test('should admit any participant if route has no constraints', () => {
    const route: RouteDefinition = {};

    expect(admitRoute(null, route)).toEqual({ admitted: true });
    expect(admitRoute(anonymousParticipant, route)).toEqual({ admitted: true });
    expect(admitRoute(authenticatedParticipant, route)).toEqual({ admitted: true });
  });

  test('should gate on requiredIdentityBoundary', () => {
    const route: RouteDefinition = {
      requiredIdentityBoundary: 'authenticated',
    };

    // Anonymous should be refused with UNAUTHENTICATED
    const resultAnon = admitRoute(anonymousParticipant, route);
    expect(resultAnon.admitted).toBe(false);
    expect(resultAnon.refusal?.code).toBe('UNAUTHENTICATED');

    // Authenticated should be admitted
    expect(admitRoute(authenticatedParticipant, route)).toEqual({ admitted: true });
    expect(admitRoute(verifiedParticipant, route)).toEqual({ admitted: true });
  });

  test('should check hierarchy order for identity boundaries', () => {
    const route: RouteDefinition = {
      requiredIdentityBoundary: 'verified',
    };

    // Authenticated is lower than verified, should be refused with INSUFFICIENT_IDENTITY_LEVEL
    const resultAuth = admitRoute(authenticatedParticipant, route);
    expect(resultAuth.admitted).toBe(false);
    expect(resultAuth.refusal?.code).toBe('INSUFFICIENT_IDENTITY_LEVEL');

    // Verified is equal, should be admitted
    expect(admitRoute(verifiedParticipant, route)).toEqual({ admitted: true });

    // MFA Verified is higher, should be admitted
    expect(admitRoute(mfaVerifiedParticipant, route)).toEqual({ admitted: true });
  });

  test('should gate on requiredDisclosures', () => {
    const route: RouteDefinition = {
      requiredDisclosures: ['terms_accepted', 'email_verified'],
    };

    // Verified participant only has email_verified, missing terms_accepted
    const resultVerified = admitRoute(verifiedParticipant, route);
    expect(resultVerified.admitted).toBe(false);
    expect(resultVerified.refusal?.code).toBe('MISSING_DISCLOSURE');
    expect(resultVerified.refusal?.missingDisclosures).toEqual(['terms_accepted']);

    // MFA verified has both, should be admitted
    expect(admitRoute(mfaVerifiedParticipant, route)).toEqual({ admitted: true });
  });

  test('should evaluate customGuard function', () => {
    const route: RouteDefinition = {
      customGuard: (p) => {
        if (p.identityBoundary === 'mfa_verified') {
          return {
            code: 'MFA_COOLDOWN',
            message: 'MFA authentication is too old, please re-authenticate.',
          };
        }
        return null;
      },
    };

    expect(admitRoute(verifiedParticipant, route)).toEqual({ admitted: true });

    const resultMfa = admitRoute(mfaVerifiedParticipant, route);
    expect(resultMfa.admitted).toBe(false);
    expect(resultMfa.refusal?.code).toBe('MFA_COOLDOWN');
  });

  test('should handle invalid identity boundary configuration gracefully', () => {
    const route: RouteDefinition = {
      requiredIdentityBoundary: 'super_admin_status',
    };

    const result = admitRoute(authenticatedParticipant, route);
    expect(result.admitted).toBe(false);
    expect(result.refusal?.code).toBe('INVALID_CONFIGURATION');
  });
});
