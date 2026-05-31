# Zoe Framework Identity and Authentication Layer

This documentation outlines the architecture, setup, and usage of the Identity and Authentication Layer of the Zoe Framework, designed in accordance with the Diátaxis documentation standard.

---

## 1. Tutorial: Setting up Your First Gated Route

This tutorial guides you through setting up a complete authentication flow in a React Native / React application from scratch. You will configure the `AuthProvider`, create a participant resolver for Role-Based Access Control (RBAC), and gate a screen using `ProtectedRoute`.

### Step 1: Define User and Session Types

First, define the user session structure and how it maps to the core `ParticipantBasis` schema used by the framework's guards. Create a file in your application (e.g., `src/auth-config.ts`):

```typescript
import { ParticipantBasis } from './framework/auth/types';

export interface AppUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  hasAcceptedTerms: boolean;
  mfaVerified: boolean;
}

/**
 * Maps the application-specific user session to the Zoe Framework's ParticipantBasis.
 * This translates user states to boundaries, disclosures, roles, and permissions.
 */
export function resolveAppParticipant(user: AppUser | null): ParticipantBasis {
  if (!user) {
    return {
      identityBoundary: 'anonymous',
      disclosures: [],
      roles: [],
      permissions: [],
    };
  }

  const disclosures: string[] = [];
  if (user.hasAcceptedTerms) {
    disclosures.push('terms_of_service');
  }

  // Determine the highest identity level reached
  let identityBoundary: 'anonymous' | 'authenticated' | 'verified' | 'mfa_verified' = 'authenticated';
  if (user.hasAcceptedTerms) {
    identityBoundary = 'verified';
  }
  if (user.mfaVerified) {
    identityBoundary = 'mfa_verified';
  }

  return {
    identityBoundary,
    disclosures,
    roles: [user.role],
    permissions: user.role === 'admin' ? ['read', 'write', 'delete'] : ['read'],
  };
}
```

### Step 2: Configure the Provider at the App Root

Wrap your root application component with `AuthProvider`. In this example, we mock the initial session fetcher and event changes to make it fully self-contained.

```tsx
import React from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { AuthProvider } from './framework/auth/AuthProvider';
import { resolveAppParticipant, AppUser } from './auth-config';
import { DashboardScreen } from './screens/DashboardScreen';

// Simulated storage lookup for a persisted session
const getInitialSession = async (): Promise<AppUser | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: 'user-987',
        email: 'developer@zoe.framework',
        role: 'user',
        hasAcceptedTerms: false,
        mfaVerified: false,
      });
    }, 1500); // Simulate network latency
  });
};

export default function App() {
  return (
    <AuthProvider<AppUser>
      getInitialSession={getInitialSession}
      resolveParticipant={resolveAppParticipant}
      transitionDurationMs={500}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Zoe Auth Tutorial Application</Text>
        <DashboardScreen />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
```

### Step 3: Implement Gated Screen with Fallback

Create the `DashboardScreen` which contains sections protected by different access control rules. The component uses `ProtectedRoute` to shield sensitive contents.

```tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { ProtectedRoute } from '../framework/auth/ProtectedRoute';
import { useAuth } from '../framework/auth/AuthProvider';
import { resolveAppParticipant, AppUser } from '../auth-config';

export function DashboardScreen() {
  const { session, setSession } = useAuth<AppUser>();

  const handleSignIn = () => {
    setSession({
      id: 'user-987',
      email: 'developer@zoe.framework',
      role: 'user',
      hasAcceptedTerms: true,
      mfaVerified: false,
    });
  };

  const handleSignOut = () => {
    setSession(null);
  };

  const handleVerifyMfa = () => {
    if (session) {
      setSession({
        ...session,
        mfaVerified: true,
      });
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.header}>User Session: {session ? session.email : 'Signed Out'}</Text>
      
      <View style={styles.buttonRow}>
        {!session ? (
          <Button title="Sign In" onPress={handleSignIn} />
        ) : (
          <Button title="Sign Out" onPress={handleSignOut} color="red" />
        )}
      </View>

      {/* Route requiring 'verified' boundary (Terms accepted) */}
      <ProtectedRoute
        route={{ requiredIdentityBoundary: 'verified' }}
        resolveParticipant={resolveAppParticipant}
        loadingComponent={<Text>Checking identity level...</Text>}
        fallback={
          <View style={styles.refusalBlock}>
            <Text style={styles.errorText}>Access Denied: You must accept our Terms of Service.</Text>
            <Button
              title="Accept Terms & Verify"
              onPress={() => {
                if (session) setSession({ ...session, hasAcceptedTerms: true });
              }}
            />
          </View>
        }
      >
        <View style={styles.gatedArea}>
          <Text style={styles.gatedText}>🔓 Verified Identity Area: Welcome to the Platform Dashboard!</Text>
        </View>

        {/* Deeply Nested Route requiring MFA */}
        <ProtectedRoute
          route={{ requiredIdentityBoundary: 'mfa_verified' }}
          resolveParticipant={resolveAppParticipant}
          fallback={
            <View style={styles.refusalBlock}>
              <Text style={styles.errorText}>MFA Required to access high-security controls.</Text>
              <Button title="Authenticate with MFA" onPress={handleVerifyMfa} />
            </View>
          }
        >
          <View style={styles.criticalArea}>
            <Text style={styles.gatedText}>🛡️ High Security Area: Admin Panel & Key Storage</Text>
          </View>
        </ProtectedRoute>
      </ProtectedRoute>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  refusalBlock: {
    marginVertical: 10,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 6,
    borderColor: '#ffcdd2',
    borderWidth: 1,
  },
  errorText: {
    color: '#c62828',
    marginBottom: 8,
  },
  gatedArea: {
    marginVertical: 10,
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    borderColor: '#c8e6c9',
    borderWidth: 1,
  },
  criticalArea: {
    marginVertical: 10,
    padding: 16,
    backgroundColor: '#e0f7fa',
    borderRadius: 6,
    borderColor: '#b2ebf2',
    borderWidth: 1,
  },
  gatedText: {
    fontSize: 14,
    color: '#006064',
    fontWeight: '500',
  },
});
```

---

## 2. How-To Guide: Securing Sensitive Actions

This guide demonstrates how to protect a critical business transaction (e.g., executing a financial transfer) using a combination of **Multi-Factor Authentication (MFA)**, **Zero-Knowledge Proof (ZKP) claims**, and **Continuous Behavioral Biometrics**.

### Objective
Before allowing a money transfer, the app must:
1. Ensure the transaction is wrapped in a dynamic, promise-based MFA challenge (`TOTP`).
2. Verify a ZKP claim confirming the sender is an authorized citizen over 18 without revealing their actual ID parameters.
3. Validate that the user's continuous behavioral biometrics (keystroke rhythm, navigation speed) indicate a human operator with a high trust score ($\geq 0.8$).

### Code Implementation

The following complete component contains mock handlers simulating cryptographic proof and verification callbacks:

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { MfaProvider } from '../framework/auth/mfa/MfaProvider';
import { useMfaVerification } from '../framework/auth/mfa/useMfaVerification';
import { useZkClaimVerifier } from '../framework/auth/zkp/hooks';
import { useBehavioralAuth } from '../framework/auth/behavioral/useBehavioralAuth';
import { ZkClaim, ZkProof } from '../framework/auth/zkp/types';

// Mock MFA Handlers
const onInitiateChallenge = async (strategy: string) => {
  return {
    id: `mfa-chal-${Math.random().toString(36).substr(2, 9)}`,
    strategy: strategy as any,
    expiresAt: Date.now() + 120000,
    metadata: { info: 'Code sent to registered mobile' },
  };
};

const onVerifyCode = async (challengeId: string, code: string) => {
  // Simulating validation. In production, this posts to a cryptographic server.
  if (code === '654321') {
    return { success: true, token: 'session-mfa-token-abc' };
  }
  throw new Error('Invalid verification code. Please try again.');
};

export default function SecureTransferApp() {
  return (
    <MfaProvider
      onInitiateChallenge={onInitiateChallenge}
      onVerifyCode={onVerifyCode}
      verificationGracePeriod={30000} // 30 seconds bypass grace
    >
      <SecureTransferForm />
    </MfaProvider>
  );
}

function SecureTransferForm() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  // 1. MFA hook
  const { verify, confirm, cancel, activeChallenge, isPending } = useMfaVerification();

  // 2. ZKP hook
  const { verifyClaim, isVerifying: isZkVerifying, error: zkError } = useZkClaimVerifier();

  // 3. Behavioral biometrics hook
  const { trustScore, recordKeystroke, recordInteraction } = useBehavioralAuth({
    updateInterval: 2000,
    sensitivity: 0.8,
  });

  const handleAmountChange = (text: string) => {
    setAmount(text);
    recordKeystroke(); // Feed metrics to behavioral trust framework
  };

  const handleRecipientChange = (text: string) => {
    setRecipient(text);
    recordKeystroke();
  };

  const handleExecuteTransfer = async () => {
    recordInteraction();
    setStatusMessage(null);

    // Guard: Behavioral Biometrics
    if (trustScore < 0.8) {
      setStatusMessage(`❌ Transaction Aborted: Behavioral anomaly detected (Trust Score: ${trustScore.toFixed(2)}). Try typing more naturally.`);
      return;
    }

    // Step A: Generate and verify ZK Proof that User Age is >= 18
    const ageClaim: ZkClaim = {
      id: 'age-claim-18',
      field: 'age',
      operator: 'GTE',
      threshold: 18,
      description: 'Verify age is greater than or equal to 18',
    };

    const mockProof: ZkProof = {
      claimId: 'age-claim-18',
      proofData: 'ZKP_CRYPTOGRAPHIC_PI_STRUCTURE_BASE64',
      publicSignals: ['18'],
    };

    setStatusMessage('Generating Zero-Knowledge Proof locally...');
    const zkResult = await verifyClaim(ageClaim, mockProof);
    
    if (!zkResult.verified) {
      setStatusMessage(`❌ ZKP Verification Failed: ${zkResult.error || 'Invalid proof structures'}`);
      return;
    }

    setStatusMessage('ZKP Verification Passed. Starting MFA Challenge verification...');

    // Step B: Trigger promise-based MFA challenge
    const mfaResult = await verify({ strategy: 'totp', reason: 'Authorize Transaction' });
    if (!mfaResult.verified) {
      setStatusMessage('❌ Transaction Aborted: Multi-Factor Authentication canceled or failed.');
      return;
    }

    // Final transaction execution
    setStatusMessage(`🎉 Transfer of $${amount} to ${recipient} successfully executed securely!`);
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.header}>Secure Vault Transfer</Text>

      {/* Behavioral Indicator */}
      <View style={[styles.trustBadge, { backgroundColor: trustScore >= 0.8 ? '#e8f5e9' : '#ffebee' }]}>
        <Text style={{ color: trustScore >= 0.8 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>
          Continuous Behavioral Trust Score: {trustScore.toFixed(2)}
        </Text>
      </View>

      <Text style={styles.label}>Recipient Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter recipient account"
        value={recipient}
        onChangeText={handleRecipientChange}
      />

      <Text style={styles.label}>Amount ($)</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        keyboardType="numeric"
        value={amount}
        onChangeText={handleAmountChange}
      />

      <View style={styles.submitSection}>
        {isZkVerifying ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : (
          <Button title="Initiate Secure Transfer" onPress={handleExecuteTransfer} />
        )}
      </View>

      {/* Inline MFA Challenge modal sheet overlay */}
      {isPending && activeChallenge && (
        <View style={styles.mfaContainer}>
          <Text style={styles.mfaHeader}>Security Check: Enter MFA Code</Text>
          <Text style={styles.mfaSubText}>A challenge has been generated. Please type '654321' to pass.</Text>
          
          <TextInput
            style={styles.mfaInput}
            keyboardType="number-pad"
            maxLength={6}
            value={mfaCode}
            onChangeText={(text) => {
              setMfaCode(text);
              recordKeystroke();
            }}
          />

          <View style={styles.mfaButtons}>
            <Button
              title="Confirm Code"
              onPress={async () => {
                const verified = await confirm(mfaCode);
                if (!verified) {
                  setStatusMessage('❌ Incorrect MFA code.');
                }
              }}
            />
            <Button title="Cancel" color="grey" onPress={cancel} />
          </View>
        </View>
      )}

      {statusMessage && (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>{statusMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    width: 340,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cccccc',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  trustBadge: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  submitSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  alertBox: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#eceff1',
    marginTop: 10,
  },
  alertText: {
    fontSize: 13,
    color: '#37474f',
    textAlign: 'center',
  },
  mfaContainer: {
    padding: 16,
    backgroundColor: '#fff9c4',
    borderRadius: 8,
    borderColor: '#fbc02d',
    borderWidth: 1.5,
    marginVertical: 14,
  },
  mfaHeader: {
    fontWeight: 'bold',
    color: '#f57f17',
    fontSize: 15,
    marginBottom: 6,
  },
  mfaSubText: {
    fontSize: 12,
    color: '#5d4037',
    marginBottom: 10,
  },
  mfaInput: {
    borderWidth: 1,
    borderColor: '#f57f17',
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 8,
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 8,
    marginBottom: 12,
  },
  mfaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
```

---

## 3. Reference Guide: API Contract & Architecture Layout

### Directory Layout

The identity and authentication layer is housed under `src/framework/auth`. Click the absolute file links below to inspect the source implementations directly:

* **Core Gating Architecture**
  * Core Type Interfaces: [types.ts](file:///Users/sac/zoeapp/src/framework/auth/types.ts)
  * Evaluation & Guards: [guards.ts](file:///Users/sac/zoeapp/src/framework/auth/guards.ts)
  * React Context Provider: [AuthProvider.tsx](file:///Users/sac/zoeapp/src/framework/auth/AuthProvider.tsx)
  * Declarative Gating Wrapper: [ProtectedRoute.tsx](file:///Users/sac/zoeapp/src/framework/auth/ProtectedRoute.tsx)
  * RBAC and Hooks: [hooks.ts](file:///Users/sac/zoeapp/src/framework/auth/hooks.ts)
  * Unified Exports: [index.ts](file:///Users/sac/zoeapp/src/framework/auth/index.ts)

* **Continuous Behavioral Biometrics**
  * Type Specifications: [behavioral/types.ts](file:///Users/sac/zoeapp/src/framework/auth/behavioral/types.ts)
  * Metric Tracking Hook: [behavioral/useBehavioralAuth.ts](file:///Users/sac/zoeapp/src/framework/auth/behavioral/useBehavioralAuth.ts)

* **Biometric & Passwordless Framework**
  * Native System Declarations: [biometric/types.ts](file:///Users/sac/zoeapp/src/framework/auth/biometric/types.ts)

* **Multi-Tenant Identity Management**
  * Type Definitions: [identity/types.ts](file:///Users/sac/zoeapp/src/framework/auth/identity/types.ts)
  * Hierarchy Controller Class: [identity/IdentityManager.ts](file:///Users/sac/zoeapp/src/framework/auth/identity/IdentityManager.ts)
  * Identity Domain Export: [identity/index.ts](file:///Users/sac/zoeapp/src/framework/auth/identity/index.ts)

* **Interactive Multi-Factor Authentication (MFA)**
  * Strategy & State Types: [mfa/types.ts](file:///Users/sac/zoeapp/src/framework/auth/mfa/types.ts)
  * State Machine Provider: [mfa/MfaProvider.tsx](file:///Users/sac/zoeapp/src/framework/auth/mfa/MfaProvider.tsx)
  * High-level verification hooks: [mfa/useMfaVerification.ts](file:///Users/sac/zoeapp/src/framework/auth/mfa/useMfaVerification.ts)
  * Public MFA Entry: [mfa/index.ts](file:///Users/sac/zoeapp/src/framework/auth/mfa/index.ts)

* **Zero-Knowledge Proofs (ZKP) Verification**
  * Circuit & Proof schemas: [zkp/types.ts](file:///Users/sac/zoeapp/src/framework/auth/zkp/types.ts)
  * Verification Engine Singleton: [zkp/engine.ts](file:///Users/sac/zoeapp/src/framework/auth/zkp/engine.ts)
  * Verification Hook: [zkp/hooks.ts](file:///Users/sac/zoeapp/src/framework/auth/zkp/hooks.ts)
  * ZKP Public exports: [zkp/index.ts](file:///Users/sac/zoeapp/src/framework/auth/zkp/index.ts)

* **Verification & Test Suites**
  * Guard Engine Verification: [guards.test.ts](file:///Users/sac/zoeapp/src/framework/auth/__tests__/guards.test.ts)
  * Context Provider Verification: [AuthProvider.test.tsx](file:///Users/sac/zoeapp/src/framework/auth/__tests__/AuthProvider.test.tsx)
  * Gating Verification Suite: [ProtectedRoute.test.tsx](file:///Users/sac/zoeapp/src/framework/auth/__tests__/ProtectedRoute.test.tsx)
  * RBAC Hook Verification: [hooks.test.tsx](file:///Users/sac/zoeapp/src/framework/auth/__tests__/hooks.test.tsx)
  * Behavioral Hook Verification: [useBehavioralAuth.test.ts](file:///Users/sac/zoeapp/src/framework/auth/behavioral/__tests__/useBehavioralAuth.test.ts)
  * Multi-Tenant Context Verification: [IdentityManager.test.ts](file:///Users/sac/zoeapp/src/framework/auth/identity/__tests__/IdentityManager.test.ts)
  * MFA Async Challenge Verification: [mfa.test.tsx](file:///Users/sac/zoeapp/src/framework/auth/mfa/__tests__/mfa.test.tsx)
  * ZKP Proof Verification Suite: [zkp.test.ts](file:///Users/sac/zoeapp/src/framework/auth/zkp/__tests__/zkp.test.ts)

---

### Core Security APIs & Interfaces

#### Core Gating Types

| Type/Interface | Declaration Details & Properties | Description |
| :--- | :--- | :--- |
| `IdentityBoundary` | `string` | Represents security level classification in hierarchy (e.g. `'anonymous'`, `'authenticated'`, `'verified'`, `'mfa_verified'`). |
| `Disclosure` | `string` | Represents disclosures or consents the user must accept. |
| `Role` | `string` | User access role. |
| `Permission` | `string` | Specific operations allowed. |
| `ParticipantBasis` | `identityBoundary: IdentityBoundary`<br>`disclosures: readonly Disclosure[]`<br>`roles?: readonly Role[]`<br>`permissions?: readonly Permission[]` | Absolute structural basis representing subject context. |
| `RouteDefinition` | `requiredIdentityBoundary?: IdentityBoundary`<br>`requiredDisclosures?: readonly Disclosure[]`<br>`requiredRoles?: readonly Role[]`<br>`requiredPermissions?: readonly Permission[]`<br>`customGuard?: (participant: ParticipantBasis) => RefusalReason \| null` | Set of constraints checked by the admitting guards. |

#### Function: `admitRoute`
Pure evaluation checking logic. Evaluates candidate against target requirements.

```typescript
export function admitRoute(
  participant: ParticipantBasis | null | undefined,
  route: RouteDefinition,
  hierarchy: readonly IdentityBoundary[] = DEFAULT_IDENTITY_HIERARCHY
): AdmitRouteResult;
```

**Parameters**:
- `participant`: Current state representation of the user subject.
- `route`: The target access constraints.
- `hierarchy`: The ordered list representing the progression of identity levels.

**Returns**:
- `AdmitRouteResult`: `{ admitted: boolean; refusal?: RefusalReason }`

---

### Multi-Tenant IdentityManager API

The `IdentityManager` handles group structure navigation, tenant boundaries, and roles/permissions inheritance dynamically.

```typescript
export class IdentityManager {
  constructor(
    initialState: IdentityState,
    tenants?: Tenant[],
    groups?: Group[],
    roles?: Role[]
  );

  public switchTenant(tenantId: TenantId): this;
  public switchGroup(groupId: GroupId): this;
  public getContext(): IdentityContext;
  public admitToGroup(groupId: GroupId, roleIds: RoleId[]): this;
  public getState(): Readonly<IdentityState>;
}
```

* **`switchTenant(tenantId)`**: Sets the active tenant. Automatically checks membership. If the active group does not belong to the new tenant, it resets group focus.
* **`switchGroup(groupId)`**: Resolves group-level active context. Validates that the group belongs to the active tenant. Grants access if the user has a direct membership or an inherited membership via a parent group.
* **`getContext()`**: Returns a unified snapshot of active details:
  ```typescript
  export interface IdentityContext {
    user: User;
    tenant?: Tenant;
    group?: Group;
    roles: readonly Role[];
    permissions: readonly string[];
  }
  ```
  It resolves permissions hierarchically by accumulating roles assigned at the Tenant level, the Group level, and inherited from parent groups.

---

### Interactive MFA Verification Hook API

`useMfaVerification()` provides hooks to run programmatic checks that prompt the client directly.

```typescript
export function useMfaVerification(): {
  verify: (options?: MfaVerificationOptions) => Promise<MfaVerificationResult>;
  confirm: (code: string) => Promise<boolean>;
  cancel: () => void;
  withMfa: <T>(action: () => Promise<T> | T, options?: MfaVerificationOptions) => Promise<T | null>;
  activeChallenge: MfaChallenge | null;
  isPending: boolean;
  isVerified: boolean;
  lastVerifiedAt?: number;
};
```

* **`verify(options)`**: Signals provider to start authentication. Triggers `onInitiateChallenge` callback and returns a Promise that suspends execution until verified, canceled, or timed out.
* **`confirm(code)`**: Submits candidate code. Resolves verification Promise upon server match.
* **`withMfa(action, options)`**: Wrapper method executing `action` if MFA resolves to true, returning `null` otherwise.

---

### Zero-Knowledge Proof Hook API

`useZkClaimVerifier()` provides React bindings to run ZKP verifications.

```typescript
export function useZkClaimVerifier(): {
  verifyClaim: (claim: ZkClaim, proof: ZkProof) => Promise<ZkVerificationResult>;
  isVerifying: boolean;
  result: ZkVerificationResult | null;
  error: string | null;
  reset: () => void;
};
```

* **`verifyClaim(claim, proof)`**: Evaluates ZkProof against ZkClaim metadata via `ZkEngine`. Updates local hook states (`isVerifying`, `result`, `error`).

---

### Continuous Behavioral Biometrics API

`useBehavioralAuth()` handles continuous capture and heuristic trust evaluations.

```typescript
export function useBehavioralAuth(options?: BehavioralAuthOptions): BehavioralAuthState;
```

**Options**:
* `updateInterval?: number` (Default: `5000`ms): Rate at which trust scores are recalculated.
* `sensitivity?: number` (Default: `0.5`): Scalar modifier adjusting how drastically anomalies affect score values.

**Returned State**:
* `trustScore: number`: Normalized float between `0.0` and `1.0`.
* `metrics: BehavioralMetrics`: Current raw metrics `{ typingSpeed, touchPressure, navigationRhythm, lastUpdated }`.
* `isActive: boolean`: Metric stream status.
* `recordKeystroke: () => void`: Logs keystroke events for speed calculations.
* `recordInteraction: () => void`: Logs touch/navigation frequencies.

---

## 4. Explanation: Architectural Core & Mathematical Alignment

### Component Orchestration Flow

The Zoe Framework Identity layer operates as a multi-stage security filter. When a user requests access to a route or initiates a sensitive action, they go through hierarchical evaluation stages:

```mermaid
flowchart TD
    A[User Event Triggered] --> B{Continuous Behavioral check}
    B -- Trust Score < 0.8 --Reject--> C[Raise Security Exception]
    B -- Trust Score >= 0.8 --> D{Route Gating guards.ts}
    D -- Insufficient level / Missing Role --Reject--> E[Redirect to Fallback / Ask Login]
    D -- Gating check passed --> F{Interactive MFA Trigger}
    F -- Cancel / Incorrect Code --Reject--> G[Terminate Flow]
    F -- Verified --> H{ZKP Circuit Validation}
    H -- Signature Mismatch --Reject--> I[Raise Cryptographic Refusal]
    H -- Proof Validated --> J{Asynchronous External state verification}
    J -- External Check Fail --Reject--> K[Render Fallback View]
    J -- Verified --> L[Admit Access / Render Children]
```

### The Chatman Equation in Zoe 2030

The authentication pipeline translates the formal logic of Zoe's Innovation Peak into execution logic using the Chatman Equation:

$$R \vdash A = \mu(O^*)$$

Where:
* **$R$ (Ruleset)** represents the collection of constraints defined by the system security policies: `RouteDefinition` (boundary requirements, roles, permissions), `ZkClaim` (circuit boundaries), and multi-tenant isolation contexts.
* **$A$ (Action/Admission)** represents admitting the client request (rendering gated child components, or resolving the callback of a protected transaction like `withMfa`).
* **$\mu(O^*)$ (Observer Measurement)** represents the active security state measured cryptographically and behaviorally:
  * Identity bounds resolved from verified user tokens.
  * Verified cryptographic zero-knowledge proofs.
  * Continuous trust score measurements derived from interaction metrics.
* **$\vdash$ (Turnstile)** represents formal verification. Admission $A$ is granted under Ruleset $R$ if and only if the system derives a proof satisfying the mathematical constraints of the measured observer $\mu(O^*)$.

Through this mathematical alignment, the framework moves beyond one-time static login gates. Security is modeled as a continuous mathematical proof validated at runtime.

---

### Design Trade-offs & Decisions

#### 1. Interactive Promise-Based MFA vs. Navigation Redirection
Traditional web security shifts users away to an MFA page (e.g. `/mfa`), disrupting flow. The Zoe Framework uses an interactive Promise suspension model in React Context.

* **Advantages**: Allows hooks like `withMfa` to suspend operations in-line, letting the UI overlay an OTP sheet, collect codes, and resume the transaction seamlessly without navigation state loss.
* **Disadvantages**: Keeping promise resolvers in React state (`pendingVerification`) can cause memory leaks if components unmount before the promise completes. The framework handles this defensively by exposing clear cleanup handlers (`cancel`, `useEffect` unmount hooks).

#### 2. JavaScript Event Capture for Behavioral Biometrics
Continuous behavioral biometrics are captured using listeners attached to the browser window or manual event logging hooks in React Native.

* **Advantages**: High portability. Developers can run behavioral heuristics directly in Javascript without native Android/iOS biometric package overhead.
* **Disadvantages**: JavaScript execution runs on the single main thread. Recording too many interactions can degrade UI rendering performance. To mitigate this, timestamps are throttled and historical entries are pruned within a sliding time window (10 seconds for typing intervals, 60 seconds for navigation rhythm).

#### 3. Client-Side Decoupled Verification Guards
The guards are written as pure functions (`admitRoute`) that execute on the client.

* **Advantages**: Enables instant, reactive UI feedback, allowing the app to hide buttons, render custom fallback prompts, and switch tenant screens with zero latency.
* **Disadvantages**: Client-side execution cannot guarantee server-side security. The Zoe Framework treats client-side guards strictly as a **User Experience (UX) aid**. All actions must be cryptographically re-validated on server endpoints or WASM execution environments.

#### 4. Hierarchical Group and Tenant Inheritance
Roles and permissions are resolved by traversing the organizational hierarchy upward (descendant groups inherit parent group permissions, which in turn inherit tenant permissions).

* **Advantages**: Simplifies membership administration. Adding a manager at a department level automatically yields authorization across child projects.
* **Disadvantages**: Calculating context dynamically via recursion (`isDescendant`) can scale poorly for deep trees. The `IdentityManager` optimizes this by memoizing resolved permissions and capping membership recursion depths.

---

### Concurrency & Security Boundaries

#### State Synchronization
Because session switches (e.g. changing tenants) trigger state changes, race conditions can occur. To prevent raw state mismatches:
- The `AuthProvider` implements transition states (`isTransitioning`, `transitionType`) during which UI interactions are disabled, allowing layout trees to safely unmount and reconstruct.
- The `IdentityManager` state is fully read-only when accessed outside of the manager (`getState()` returns an frozen clone), preserving immutability principles in state stores.

#### Cryptographic Boundaries
The ZKP implementation isolates cryptographic verification in the `ZkEngine`. This design lets developers use mock proofs during development, and swap in native WASM libraries (such as SnarkJS verifiers) for production deployment without changing hook invocations or components.
