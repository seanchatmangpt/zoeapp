import { admitRoute, DEFAULT_IDENTITY_HIERARCHY } from '../guards';

describe('admitRoute', () => {
  it('allows access if no restrictions are specified', () => {
    const { admitted } = admitRoute(undefined, {});
    expect(admitted).toBe(true);
  });

  it('rejects if required boundary is invalid', () => {
    const { admitted, refusal } = admitRoute(undefined, { requiredIdentityBoundary: 'unknown' });
    expect(admitted).toBe(false);
    expect(refusal?.code).toBe('INVALID_CONFIGURATION');
  });

  it('rejects unauthenticated users trying to access protected route', () => {
    const { admitted, refusal } = admitRoute(
      { identityBoundary: 'anonymous', disclosures: [] },
      { requiredIdentityBoundary: 'authenticated' }
    );
    expect(admitted).toBe(false);
    expect(refusal?.code).toBe('UNAUTHENTICATED');
  });

  it('rejects users with insufficient identity level', () => {
    const { admitted, refusal } = admitRoute(
      { identityBoundary: 'authenticated', disclosures: [] },
      { requiredIdentityBoundary: 'verified' }
    );
    expect(admitted).toBe(false);
    expect(refusal?.code).toBe('INSUFFICIENT_IDENTITY_LEVEL');
  });

  it('allows users with exact identity level', () => {
    const { admitted } = admitRoute(
      { identityBoundary: 'verified', disclosures: [] },
      { requiredIdentityBoundary: 'verified' }
    );
    expect(admitted).toBe(true);
  });

  it('allows users with higher identity level', () => {
    const { admitted } = admitRoute(
      { identityBoundary: 'mfa_verified', disclosures: [] },
      { requiredIdentityBoundary: 'verified' }
    );
    expect(admitted).toBe(true);
  });

  it('rejects if missing disclosures', () => {
    const { admitted, refusal } = admitRoute(
      { identityBoundary: 'verified', disclosures: ['terms'] },
      { requiredDisclosures: ['terms', 'age'] }
    );
    expect(admitted).toBe(false);
    expect(refusal?.code).toBe('MISSING_DISCLOSURE');
    expect(refusal?.missingDisclosures).toEqual(['age']);
  });

  it('allows if all disclosures are present', () => {
    const { admitted } = admitRoute(
      { identityBoundary: 'verified', disclosures: ['terms', 'age', 'extra'] },
      { requiredDisclosures: ['terms', 'age'] }
    );
    expect(admitted).toBe(true);
  });

  it('rejects if custom guard fails', () => {
    const customGuard = () => ({ code: 'CUSTOM', message: 'Failed' });
    const { admitted, refusal } = admitRoute(
      { identityBoundary: 'authenticated', disclosures: [] },
      { customGuard }
    );
    expect(admitted).toBe(false);
    expect(refusal?.code).toBe('CUSTOM');
  });

  it('allows if custom guard passes', () => {
    const customGuard = () => null;
    const { admitted } = admitRoute(
      { identityBoundary: 'authenticated', disclosures: [] },
      { customGuard }
    );
    expect(admitted).toBe(true);
  });
});
