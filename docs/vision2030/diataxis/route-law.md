# Typestate Gating & Protected Routing System
## Route-Law Admission Control and Cryptographic Proof Gates

This document details the design, verification, and implementation of the **Typestate Gating and Protected Routing System** under the Zoe 2030 Innovation Peak. This framework governs client-side route admission dynamically through identity typestates, user disclosures, and cryptographic receipts.

---

## 1. Tutorial: Learning-Oriented

This tutorial guides you from scratch to gating your first screen component using Route Laws. You will configure type-safe gating constraints, resolve user states from a session, and test programmatic authorization using hooks.

### Step 1: Define Gating Constraints (Route Laws)
Route admission rules are defined declaratively via the `RouteDefinition` interface. Create a configuration file or define the law directly above your screen component.

```typescript
import { RouteDefinition } from '@/src/route-law/types';

// Enforce that the user must be fully authenticated and have accepted the terms of service.
export const membersDashboardRoute: RouteDefinition = {
  requiredIdentityBoundary: 'authenticated',
  requiredDisclosures: ['terms_accepted'],
};
```

### Step 2: Set Up the Protected Wrapper
Use the `ProtectedRoute` component to wrap screen components or navigator views (e.g. Expo Router stacks). When user admission fails, the component automatically redirects the user to the configured auth fallback screen.

Create a screen file `src/screens/MembersDashboard.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProtectedRoute } from '@/src/route-law/ProtectedRoute';
import { membersDashboardRoute } from './routeConfig';

export default function MembersDashboard() {
  return (
    <ProtectedRoute 
      route={membersDashboardRoute}
      redirectPath="/(auth)/login" // Fallback path if access is denied
    >
      <View style={styles.container}>
        <Text style={styles.title}>Secure Member Portal</Text>
        <Text style={styles.text}>
          You have cleared the identity boundaries and disclosures.
        </Text>
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A', // Slate 900
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#94A3B8',
  },
});
```

### Step 3: Enforce Custom Programmatic Guards
For complex calculations (such as age gating or regional restrictions), define a `customGuard` function inside your `RouteDefinition`.

```typescript
import { RouteDefinition } from '@/src/route-law/types';

export const ageRestrictedRoute: RouteDefinition = {
  requiredIdentityBoundary: 'verified',
  customGuard: (participant) => {
    const isAdult = participant.disclosures.includes('age_over_18');
    if (!isAdult) {
      return {
        code: 'AGE_GATING_FAILED',
        message: 'Access requires proof of majority (age >= 18).',
      };
    }
    return null; // Return null to indicate admission approval
  },
};
```

### Step 4: Access Gating State Programmatically
You can query admission rules directly inside event handlers or hooks (without rendering a React wrapper) using the `useRouteAdmission` hook.

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouteAdmission } from '@/src/hooks/useRouteAdmission';
import { ageRestrictedRoute } from './routeConfig';

export function ActionPanel() {
  const { admitted, refusal, loading } = useRouteAdmission(ageRestrictedRoute);

  const handleSensitiveAction = () => {
    if (loading) {
      return;
    }
    if (!admitted) {
      Alert.alert('Admission Blocked', refusal?.message || 'Access Denied');
      return;
    }
    Alert.alert('Success', 'Authorized action executed.');
  };

  return (
    <View style={{ padding: 20 }}>
      <TouchableOpacity 
        onPress={handleSensitiveAction}
        style={{ backgroundColor: '#4F46E5', padding: 12, borderRadius: 8 }}
      >
        <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>
          Execute Gated Action
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 2. How-To Guide: Task-Oriented

### Goal: Enforce Cryptographic Receipt Gates on Premium Routes

In local-first systems under the Zoe Framework, access to advanced features is controlled by cryptographic event proofs. A screen can remain locked until the local runtime stores a verified receipt of a mutation command, signed and cached.

This guide details how to lock a screen until a cryptographic receipt for command ID `cmd-unlock-pro-tier` with a specific BLAKE3 delta hash is resolved in MMKV, Zustand, or the local SQLite database.

> [!IMPORTANT]
> The verification system traverses memory, sync caches, and the SQLite table in that order. When a command is processed, the system automatically triggers a reactive state transition.

### Step-by-Step Code Implementation

Create a premium projection screen under your navigator:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ProtectedRoute } from '@/src/route-law/ProtectedRoute';
import { mmkvInstance } from '@/src/lib/store/mmkvStorage';
import { useActorOpsStore } from '@/src/lib/actor/actorOps';
import { RouteDefinition } from '@/src/route-law/types';

// 1. Define the cryptographic route gating law
const premiumAnalyticsRoute: RouteDefinition = {
  requiredIdentityBoundary: 'verified',
  // Restrict access to a completed transaction proof
  requiredReceiptCommandId: 'cmd-unlock-pro-tier',
  requiredReceiptDeltaHash: 'b3hash-58e1c2d9a3b4f6e80718549301da283f',
};

// 2. Main Screen Component
export default function PremiumAnalyticsScreen() {
  // Simulator helper to programmatically write proof receipts into the local engines
  const simulatePurchaseCompletion = () => {
    const mockReceipt = {
      id: 'rcpt-001',
      commandId: 'cmd-unlock-pro-tier',
      actor: { tenantId: 'tenant-default', kind: 'user', id: 'usr-admin' },
      status: 'applied_local' as const,
      deltaHash: 'b3hash-58e1c2d9a3b4f6e80718549301da283f',
      eventIds: ['evt-101'],
      createdAt: new Date().toISOString(),
    };

    // Fast synchronous cache (MMKV) triggers the listeners reactively
    mmkvInstance.set(
      `receipt_${premiumAnalyticsRoute.requiredReceiptCommandId}`,
      JSON.stringify(mockReceipt)
    );

    // Update in-memory Zustand store for fast bypass
    useActorOpsStore.getState().setLatestReceipt(mockReceipt);
  };

  const clearPurchaseSim = () => {
    mmkvInstance.remove(`receipt_${premiumAnalyticsRoute.requiredReceiptCommandId}`);
    useActorOpsStore.getState().setLatestReceipt(null);
  };

  return (
    <View style={styles.container}>
      <ProtectedRoute 
        route={premiumAnalyticsRoute}
        redirectPath="/(tabs)"
        fallback={(refusal) => (
          <View style={styles.blockedContainer}>
            <Text style={styles.errorHeader}>Access Restricted</Text>
            <Text style={styles.errorSub}>{refusal.message}</Text>
            
            <TouchableOpacity 
              onPress={simulatePurchaseCompletion} 
              style={styles.simButton}
            >
              <Text style={styles.simButtonText}>Simulate Receipt Issuance</Text>
            </TouchableOpacity>
          </View>
        )}
      >
        {/* Rendered only when cryptographic proof is validated */}
        <View style={styles.unlockedContainer}>
          <Text style={styles.unlockedTitle}>✨ PRO Analytics Unlocked</Text>
          <Text style={styles.unlockedText}>
            Proof validated: BLAKE3 Delta matches requirements.
          </Text>

          <TouchableOpacity 
            onPress={clearPurchaseSim} 
            style={[styles.simButton, { backgroundColor: '#EF4444', marginTop: 24 }]}
          >
            <Text style={styles.simButtonText}>Reset Simulation (Lock Screen)</Text>
          </TouchableOpacity>
        </View>
      </ProtectedRoute>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Slate 950
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unlockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EF4444', // Rose 500
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },
  unlockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34D399', // Emerald 400
    marginBottom: 12,
  },
  unlockedText: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  simButton: {
    backgroundColor: '#6366F1', // Indigo 500
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  simButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
```

---

## 3. Reference Guide: Information-Oriented

### Directory Layout

Files related to the routing admission control are distributed across the following directories. The core components are centered in the `src/route-law/` root:

*   [types.ts](file:///Users/sac/zoeapp/src/route-law/types.ts) — Data structures, configurations, and refusal typings.
*   [guards.ts](file:///Users/sac/zoeapp/src/route-law/guards.ts) — Pure logic functions evaluating identity level order.
*   [ProtectedRoute.tsx](file:///Users/sac/zoeapp/src/route-law/ProtectedRoute.tsx) — React Native gateway with overlays, loading spinners, and multi-tier storage checking logic.
*   [guards.test.ts](file:///Users/sac/zoeapp/src/route-law/__tests__/guards.test.ts) — Test suites verifying identity boundaries, disclosure array lookups, and custom guards.
*   [ProtectedRoute.test.tsx](file:///Users/sac/zoeapp/src/route-law/__tests__/ProtectedRoute.test.tsx) — Integrated testing validating Zustand reactives, SQLite connection falls, MMKV listeners, and error triggers.
*   [useRouteAdmission.ts](file:///Users/sac/zoeapp/src/hooks/useRouteAdmission.ts) — Re-exported user-facing programmatic React hook.
*   [createRouteAdmissionHook.ts](file:///Users/sac/zoeapp/src/framework/data/auth/createRouteAdmissionHook.ts) — Hook factory injecting authorization state configurations.

---

### API Contracts

#### Core Gating Configuration: `RouteDefinition`
| Property | Type | Description |
| :--- | :--- | :--- |
| `requiredIdentityBoundary` | `IdentityBoundary` (optional) | The minimum identity clearance level required (e.g. `'verified'`). |
| `requiredDisclosures` | `readonly Disclosure[]` (optional) | Array of claims/consents the user must have signed off on. |
| `customGuard` | `(p: ParticipantBasis) => RefusalReason \| null` (optional) | Function returning a custom refusal error or null. |
| `requiredReceiptCommandId` | `string` (optional) | The UUID/command ID of a cryptographic proof receipt that must exist. |
| `requiredReceiptDeltaHash` | `string` (optional) | The expected BLAKE3 hash of the target receipt state changes. |

#### Participant Context: `ParticipantBasis`
| Property | Type | Description |
| :--- | :--- | :--- |
| `identityBoundary` | `IdentityBoundary` | Active user authorization tier (e.g., `'anonymous'`, `'authenticated'`, `'verified'`, `'mfa_verified'`). |
| `disclosures` | `readonly Disclosure[]` | The set of active consent items, confirmations, or signed flags. |

#### Refusal Details: `RefusalReason`
| Property | Type | Description |
| :--- | :--- | :--- |
| `code` | `string` | Machine-readable rejection code (e.g., `'UNAUTHENTICATED'`, `'INSUFFICIENT_IDENTITY_LEVEL'`, `'MISSING_DISCLOSURE'`, `'RECEIPT_NOT_FOUND'`, `'RECEIPT_HASH_MISMATCH'`). |
| `message` | `string` | Human-readable description of the clearance failure. |
| `requiredIdentityBoundary` | `IdentityBoundary` (optional) | Required security level during boundary checks. |
| `actualIdentityBoundary` | `IdentityBoundary` (optional) | User's active security level during boundary checks. |
| `missingDisclosures` | `readonly Disclosure[]` (optional) | Array of required claims missing from user context. |

---

### Pure Gating Engine: `guards.ts`

#### `admitRoute()`
Pure evaluation function. It yields an `AdmitRouteResult` indicating whether the user clears the specified policy bounds.

```typescript
export function admitRoute(
  participant: ParticipantBasis | null | undefined,
  route: RouteDefinition,
  hierarchy: readonly IdentityBoundary[] = DEFAULT_IDENTITY_HIERARCHY
): AdmitRouteResult;
```

**Evaluation Sequence**:
1. Defaults null/undefined participant context to `{ identityBoundary: 'anonymous', disclosures: [] }`.
2. Resolves hierarchy index. If configured index fails, returns `INVALID_CONFIGURATION`.
3. Checks if the requested boundary exceeds the active boundary. If user is anonymous, yields `UNAUTHENTICATED`. If verified tier is low, yields `INSUFFICIENT_IDENTITY_LEVEL`.
4. Filters missing disclosures. If mismatches exist, returns `MISSING_DISCLOSURE`.
5. Runs `customGuard(participant)` and propagates any yielded refusal.

---

### Component Gate: `ProtectedRoute.tsx`

React Component that wraps layout directories and route subtrees to enforce rules:

```typescript
export const ProtectedRoute: React.FC<ProtectedRouteProps>;
```

#### `ProtectedRouteProps`
| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `route` | `RouteDefinition` | *Required* | Active security laws governing children visibility. |
| `children` | `React.ReactNode` | *Required* | Children contents rendered when checks pass. |
| `redirectPath` | `string` | `undefined` | Target route path for routing redirect on access failures. |
| `loadingComponent` | `React.ReactNode` | `undefined` | Component shown when session is resolving. |
| `fallback` | `React.ReactNode \| ((refusal: RefusalReason) => React.ReactNode)` | `undefined` | Custom visual element/renderer on refusal. |
| `resolveParticipant` | `(session: any) => ParticipantBasis` | `defaultResolveParticipant` | Custom mapper translating Supabase session to participant data. |
| `hierarchy` | `readonly IdentityBoundary[]` | `DEFAULT_IDENTITY_HIERARCHY` | Customs boundary verification rankings. |
| `participant` | `ParticipantBasis` | `undefined` | Overriding context (bypasses active session hook for tests). |

---

## 4. Explanation: Understanding-Oriented

### Architectural Philosophy: Typestate Gating

Under the Zoe Framework, client routing is governed by **Typestates**. Traditional authorization represents auth as a loose collection of boolean flags (`isLoggedIn`, `hasVerifiedEmail`, `hasMfaEnabled`). This leads to invalid states: for example, a user can have `hasMfaEnabled: true` without completing the initial authentication boundary.

In the Zoe routing system, authorization is structured as a progressive linear typestate progression governed by a hierarchy:

```
[anonymous] ──> [authenticated] ──> [verified] ──> [mfa_verified]
```

A participant occupies exactly one **Identity Boundary** at a time. The transition across boundaries represents cryptographic state transformations (e.g. signing a session credential, validating an OTP token, confirming a biometric key). Complementing the identity hierarchy, individual granular declarations (such as accepting terms or signing an NDA) are modeled as **Disclosures**, preventing complex boundary checks from leaking into page navigation systems.

---

### Mathematical Model: The Chatman Equation

The gating mechanism implements a concrete projection of the Chatman Equation:

$$R \vdash A = \mu(O^*)$$

Where:
*   $R$ represents the **Route-Law** ruleset (`RouteDefinition`) that governs access to a visual projection.
*   $O^*$ represents the **Cryptographic Observer State** (the local state of the participant `ParticipantBasis`, including identity level, active disclosures, and local cryptographic receipts).
*   $A$ is the final **Admission Status** (either Admitted or Refused).
*   $\mu$ is the **Admission Function** (implemented as `admitRoute` and the reactive queries in `ProtectedRoute`) which maps the state $O^*$ to $A$ under the policy constraints $R$.

Because the system is designed to be local-first, the computation of $\mu(O^*)$ occurs entirely on the client, utilizing fast local memory or cache layers to ensure instantaneous screen navigation.

---

### Multi-Tier Storage Query Engine

To verify cryptographic receipts (`requiredReceiptCommandId`) without freezing the React render loop or causing layout thrashing, the system uses a **three-tier storage query engine**:

```
[ Attempt Verification ]
           │
           ▼
┌──────────────────────────────────────┐
│ Tier 1: In-Memory Zustand Check      │──► [Found / Matching Hash] ──► Admitted ✅
└──────────────────────────────────────┘
           │ (Miss / Mismatch)
           ▼
┌──────────────────────────────────────┐
│ Tier 2: Sync MMKV Cache Check        │──► [Found / Matching Hash] ──► Admitted ✅
└──────────────────────────────────────┘
           │ (Miss / Mismatch)
           ▼
┌──────────────────────────────────────┐
│ Tier 3: Async SQLite (Drizzle ORM)   │──► [Found / Matching Hash] ──► Admitted ✅
└──────────────────────────────────────┘
           │ (Not Found)
           ▼
[ Render PremiumReceiptBlockingScreen ] ──► (Add MMKV listeners for reactive wakeup)
```

#### Performance and Latency Characteristics
1.  **Tier 1: In-Memory Zustand Bypass (< 1ms)**:
    Checks the latest command receipt stored in `useActorOpsStore`. If the current action matched, it resolves immediately.
2.  **Tier 2: Synchronous MMKV Storage (~1-2ms)**:
    If memory is cold (e.g. on application launch), the engine reads the MMKV key `receipt_${commandId}` synchronously.
3.  **Tier 3: Asynchronous SQLite Database (~5-15ms)**:
    If cache misses occur, the engine queries the `actor_receipts` SQLite table using Drizzle ORM. Because SQLite is asynchronous in React Native, the component displays an interactive loader during this phase.

---

### Concurrency, Reactivity & Listeners

To maintain a responsive UI when commands are executed asynchronously (e.g. when an actor syncs a transaction envelope in the background), the system avoids database polling. Instead, it uses a dynamic listener pattern:

```typescript
// Subscribes dynamically to changes in MMKV
mmkvListener = mmkvInstance.addOnValueChangedListener((key: string) => {
  if (
    key === `receipt_${route.requiredReceiptCommandId}` ||
    key === `receipt_hash_${route.requiredReceiptCommandId}`
  ) {
    verifyReceipt(active); // Reruns database and cache verification immediately
  }
});
```

*   **Reactive Wakeup**: Writing a receipt to MMKV immediately wakes up the blocking screen, triggering a smooth transition into the unlocked route.
*   **Leak Prevention**: The component tracks the active component lifetime (`let active = true`). Upon unmounting, the listener is explicitly destroyed:

```typescript
return () => {
  active = false;
  if (mmkvListener) {
    mmkvListener.remove();
  }
};
```

---

### Dual-Membrane Security Boundaries

> [!CAUTION]
> Gating UI navigation is a **user experience (UX) membrane**, not an absolute security boundary.

In the Zoe 2030 Architecture, the routing gate prevents the UI from rendering unusable screens for unauthenticated users, but it cannot prevent local memory tampering or binary reverse engineering.

True resource protection is enforced by a **Dual Membrane Model**:

1.  **Outer Membrane (UI Route Law)**:
    Ensured by `ProtectedRoute` on the client. Gathers disclosures, checks identity boundaries, and guides user authentication flows.
2.  **Inner Membrane (Runtime Actor Membrane)**:
    Enforced on the dispatcher/server. Commands must be signed by a private key matching the required `Principal` role. Queries are protected at the database level by Row-Level Security (RLS) policies and verified cryptographic event graphs. Even if a user bypasses the UI gate, the network dispatch layer will reject unauthenticated command submissions.
