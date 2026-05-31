# Shared React Components & Projections Reference

This document serves as the comprehensive technical guide and reference for the shared React and React Native components of the Zoe Framework located under the target directory `src/components`. These components form the dynamic user interface membrane of the **Zoe 2030 Innovation Peak**, enabling optimistic rendering, cryptographic receipt logging, role-based access gating, and self-healing state transitions governed by the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

---

## 1. Tutorial: Constructing an Avatar-Relative Projection Surface

This tutorial guides you from scratch through setting up the core context provider (`VkgProvider`), handling web-native hydration mismatches safely, and rendering an interactive, role-restricted state projection surface.

### Step 1: Wrap Your Application in the `VkgProvider`

The [VkgProvider.tsx](file:///Users/sac/zoeapp/src/components/VkgProvider.tsx) orchestrates the local actor runtime instances, listens to background telemetry events (messages and supervisor quarantines), and handles outbox synchronizations. 

Create or edit your application's root layout component (e.g., `src/app/_layout.tsx`) to wrap your navigation stack in the provider:

```tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VkgProvider } from '../../components/VkgProvider';
import { TransitionOverlay } from '../../components/TransitionOverlay';
import { Slot } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <VkgProvider>
        {/* Dynamic transition loading layer */}
        <TransitionOverlay />
        <Slot />
      </VkgProvider>
    </SafeAreaProvider>
  );
}
```

---

### Step 2: Handle Web-Native Hydration and Color Scheme Matching

Because the Zoe Framework operates on both React Native (native app) and web environments, styling alignment during SSR/static compilation is essential. Mismatches between server-rendered HTML and client-side hydration lead to layout glitches.

Use [useClientOnlyValue.ts](file:///Users/sac/zoeapp/src/components/useClientOnlyValue.ts) and [useColorScheme.ts](file:///Users/sac/zoeapp/src/components/useColorScheme.ts) (with their corresponding `.web.ts` files) to defer client-only settings until after mount.

Here is how you can render a header bar that matches light/dark themes and prevents SSR warnings:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from '../components/useColorScheme';
import { useClientOnlyValue } from '../components/useClientOnlyValue';

export function HydrationAlignedHeader() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Returns 'light' during server builds, but dynamically resolves client choice upon hydration
  const activeTheme = useClientOnlyValue('light', colorScheme);

  return (
    <View style={[
      styles.header, 
      activeTheme === 'dark' ? styles.headerDark : styles.headerLight
    ]}>
      <Text style={activeTheme === 'dark' ? styles.textDark : styles.textLight}>
        Zoe Membrane Engine
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerLight: {
    backgroundColor: '#F8FAFC',
    borderBottomColor: '#E2E8F0',
  },
  headerDark: {
    backgroundColor: '#0F172A',
    borderBottomColor: '#1E293B',
  },
  textLight: {
    color: '#0F172A',
    fontWeight: '700',
  },
  textDark: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
});
```

---

### Step 3: Integrate the Interactive Projection Matrix View

Now, let's render the [AvatarRelativeProjection.tsx](file:///Users/sac/zoeapp/src/components/AvatarRelativeProjection.tsx) grid. This allows developers to simulate the state of the system through the eyes of different authorized user roles (Guest, Member, Volunteer, Team Lead, Pastor, Admin, Operator).

Import and place the interactive matrix component inside a developer tab or debug page:

```tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AvatarRelativeProjectionMatrixView } from '../../components/AvatarRelativeProjection';

export default function DebugMatrixScreen() {
  const mockInitialData = {
    openSlots: 4,
    candidates: ['Sarah Brown', 'Michael Green', 'David White'],
    shortageRatio: 0.5,
    runId: 'run-7742',
    history: [
      { timestamp: '09:41:00', event: 'slot_opened', detail: 'Slot opened via cancellation' },
      { timestamp: '09:30:15', event: 'shift_assigned', detail: 'David White assigned by teamLead' }
    ],
    topology: { nodes: 8, channels: 2, supervisorStatus: 'healthy' },
    stateHash: 'vkg_genesis_f12b'
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Avatar-Relative Projection Portal</Text>
        <Text style={styles.description}>
          Simulate how underlying data structures transform dynamically based on current permission gates.
        </Text>
      </View>
      <AvatarRelativeProjectionMatrixView initialData={mockInitialData} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
});
```

---

### Step 4: Add the Connection Indicator (`OfflineBanner`)

To support optimistic mutations and queue state deltas when disconnected, add the [OfflineBanner.tsx](file:///Users/sac/zoeapp/src/components/OfflineBanner.tsx) near the top of your screen layouts.

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OfflineBanner } from '../components/OfflineBanner';
import { HydrationAlignedHeader } from './HydrationAlignedHeader';

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <OfflineBanner />
      <HydrationAlignedHeader />
      <View style={styles.body}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  body: {
    flex: 1,
    padding: 16,
  },
});
```

---

## 2. How-To Guide: Building a Role-Gated State Telemetry Dashboard

### Goal
Implement a role-restricted administrative dashboard featuring dynamic permission checks, asynchronous command dispatching, transaction statuses (Receipt Badges), and visual payload inspection.

### Architectural Layout

```
 ┌──────────────────────────────────────────────────────────┐
 │                       AdminShell                         │
 ├──────────────────────────────────────────────────────────┤
 │                      OfflineBanner                       │
 ├──────────────────────────────────────────────────────────┤
 │ ┌──────────────────────────────────────────────────────┐ │
 │ │                   PermissionGate                     │ │
 │ │                 (Role Check: admin)                  │ │
 │ ├──────────────────────────────────────────────────────┤ │
 │ │  ┌────────────────────────────────────────────────┐  │ │
 │ │  │                  AdminCard                     │  │ │
 │ │  ├────────────────────────────────────────────────┤  │ │
 │ │  │ ┌───────────────┐ ┌──────────────┐             │  │ │
 │ │  │ │ AdminMetric   │ │ AdminMetric  │             │  │ │
 │ │  │ └───────────────┘ └──────────────┘             │  │ │
 │ │  │                                                │  │ │
 │ │  │ Actor Ref: [ActorRefView]                      │  │ │
 │ │  │                                                │  │ │
 │ │  │ command: [CommandButton]  Outbox: [OutboxBadge]│  │ │
 │ │  │ status: [ReceiptBadge]                         │  │ │
 │ │  │                                                │  │ │
 │ │  │ ┌────────────────────────────────────────────┐ │  │ │
 │ │  │ │               JsonInspector                │ │  │ │
 │ │  │ └────────────────────────────────────────────┘ │  │ │
 │ │  └────────────────────────────────────────────────┘  │ │
 │ └──────────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────┘
```

### Complete Page Code (`src/app/admin/actor-lab.tsx`)

This guide uses:
- [AdminShell.tsx](file:///Users/sac/zoeapp/src/components/admin/AdminShell.tsx) to supply navigation frames and connectivity signals.
- [PermissionGate.tsx](file:///Users/sac/zoeapp/src/components/admin/PermissionGate.tsx) to block non-administrators.
- [AdminCard.tsx](file:///Users/sac/zoeapp/src/components/admin/AdminCard.tsx) and [AdminMetric.tsx](file:///Users/sac/zoeapp/src/components/admin/AdminMetric.tsx) to report running counts.
- [ActorRefView.tsx](file:///Users/sac/zoeapp/src/components/admin/ActorRefView.tsx) to format actor targets.
- [CommandButton.tsx](file:///Users/sac/zoeapp/src/components/admin/CommandButton.tsx) to execute self-healing signals.
- [OutboxBadge.tsx](file:///Users/sac/zoeapp/src/components/admin/OutboxBadge.tsx) and [ReceiptBadge.tsx](file:///Users/sac/zoeapp/src/components/admin/ReceiptBadge.tsx) to visualize sync status.
- [JsonInspector.tsx](file:///Users/sac/zoeapp/src/components/admin/JsonInspector.tsx) to debug dynamic payloads.

```tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useVkgEngine } from '../../components/VkgProvider';
import { useActorOpsStore } from '../../lib/actor/actorOps';
import { AdminShell } from '../../components/admin/AdminShell';
import { PermissionGate } from '../../components/admin/PermissionGate';
import { AdminCard } from '../../components/admin/AdminCard';
import { AdminMetric } from '../../components/admin/AdminMetric';
import { ActorRefView } from '../../components/admin/ActorRefView';
import { CommandButton } from '../../components/admin/CommandButton';
import { OutboxBadge } from '../../components/admin/OutboxBadge';
import { ReceiptBadge } from '../../components/admin/ReceiptBadge';
import { JsonInspector } from '../../components/admin/JsonInspector';

export default function ActorLabScreen() {
  const { 
    pendingReceipts, 
    processedReceipts, 
    lastReceipt, 
    triggerHook, 
    repairLastQuarantine,
    quarantinedHooks
  } = useVkgEngine();

  const { currentPrincipal } = useActorOpsStore();
  const [commandStatus, setCommandStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('completed');
  const [receiptStatus, setReceiptStatus] = useState<'accepted_pending' | 'applied_local' | 'applied_remote' | 'quarantined'>('applied_remote');

  const handleDispatchTest = async () => {
    setCommandStatus('processing');
    setReceiptStatus('accepted_pending');
    try {
      // Triggers mutations that cascade through local telemetry and Supabase Edge functions
      await triggerHook('volunteer_shortage', 'schema:status', 'critical');
      setCommandStatus('completed');
      setReceiptStatus('applied_remote');
    } catch (e) {
      setCommandStatus('failed');
      setReceiptStatus('quarantined');
    }
  };

  const handleSelfHeal = async () => {
    setCommandStatus('processing');
    try {
      await repairLastQuarantine();
      setCommandStatus('completed');
      setReceiptStatus('applied_local');
    } catch (e) {
      setCommandStatus('failed');
    }
  };

  const activeActor = {
    tenantId: 'tenant-123',
    kind: 'hook_actor',
    id: 'volunteer_shortage',
  };

  return (
    <AdminShell title="Actor Lab" subtitle="Zoe Core Diagnostics Console" scrollable={true}>
      <PermissionGate 
        allowedRoles={['admin', 'operator']}
        fallback={
          <AdminCard title="Unauthorized Area" subtitle="Role elevation required to view this panel.">
            <View style={styles.restrictedBody} />
          </AdminCard>
        }
      >
        {/* Metric Grid */}
        <View style={styles.metricGrid}>
          <AdminMetric 
            label="Pending Transactions" 
            value={pendingReceipts} 
            icon="clock-o" 
            iconColor="#F59E0B"
            trend={pendingReceipts > 0 ? "Pending Sync" : "Clean"}
            trendDirection={pendingReceipts > 0 ? "up" : "neutral"}
          />
          <AdminMetric 
            label="Processed Commits" 
            value={processedReceipts} 
            icon="check-circle" 
            iconColor="#10B981"
            trend="Synchronized"
            trendDirection="neutral"
          />
          <AdminMetric 
            label="Quarantines Active" 
            value={quarantinedHooks.length} 
            icon="exclamation-triangle" 
            iconColor="#EF4444"
            trend={quarantinedHooks.length > 0 ? "Warning Alert" : "All Clear"}
            trendDirection={quarantinedHooks.length > 0 ? "down" : "neutral"}
          />
        </View>

        {/* Diagnostic Panel */}
        <AdminCard 
          title="Telemetry Sandbox" 
          subtitle="Directly dispatch graph mutations and monitor confirmation receipts."
          headerRight={<OutboxBadge status={commandStatus} />}
        >
          <View style={styles.fieldRow}>
            <ActorRefView actorRef={activeActor} />
            <ReceiptBadge status={quarantinedHooks.length > 0 ? 'quarantined' : receiptStatus} />
          </View>

          <View style={styles.buttonRow}>
            <CommandButton 
              title="Trigger Shortage Mutation" 
              onPress={handleDispatchTest} 
              variant="primary"
              style={styles.actionBtn}
            />
            <CommandButton 
              title="Apply State Repair" 
              onPress={handleSelfHeal} 
              variant="danger"
              disabled={quarantinedHooks.length === 0}
              style={styles.actionBtn}
            />
          </View>

          <JsonInspector 
            data={{
              principal: currentPrincipal,
              lastReceipt: lastReceipt,
              quarantineLog: quarantinedHooks,
            }} 
            title="Inspect Memory Context" 
          />
        </AdminCard>
      </PermissionGate>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  restrictedBody: {
    height: 100,
    backgroundColor: '#0B1120',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
  },
});
```

---

## 3. Reference: Directory Layout & Components Specifications

### Root Components Directory

*   [VkgProvider.tsx](file:///Users/sac/zoeapp/src/components/VkgProvider.tsx) — Main VKG state and context engine.
*   [ErrorBoundary.tsx](file:///Users/sac/zoeapp/src/components/ErrorBoundary.tsx) — App error boundaries and tension catchers.
*   [EditProjectionInfo.tsx](file:///Users/sac/zoeapp/src/components/EditProjectionInfo.tsx) — Code locator card component.
*   [ExternalLink.tsx](file:///Users/sac/zoeapp/src/components/ExternalLink.tsx) — Expo Router wrapper with in-app browser routing.
*   [AvatarRelativeProjection.tsx](file:///Users/sac/zoeapp/src/components/AvatarRelativeProjection.tsx) — Entry exports for projection wrappers.
*   [OfflineBanner.tsx](file:///Users/sac/zoeapp/src/components/OfflineBanner.tsx) — Connectivity state wrapper.
*   [StyledText.tsx](file:///Users/sac/zoeapp/src/components/StyledText.tsx) — Custom text helper classes (including `MonoText`).
*   [Themed.tsx](file:///Users/sac/zoeapp/src/components/Themed.tsx) — System theme color mapping helper.
*   [TransitionOverlay.tsx](file:///Users/sac/zoeapp/src/components/TransitionOverlay.tsx) — Transition overlay layout engine.
*   [useColorScheme.ts](file:///Users/sac/zoeapp/src/components/useColorScheme.ts) & [useColorScheme.web.ts](file:///Users/sac/zoeapp/src/components/useColorScheme.web.ts) — Native-web platform scheme hook.
*   [useClientOnlyValue.ts](file:///Users/sac/zoeapp/src/components/useClientOnlyValue.ts) & [useClientOnlyValue.web.ts](file:///Users/sac/zoeapp/src/components/useClientOnlyValue.web.ts) — Web hydration protection hook.

### Admin Diagnostics Directory

*   [ActorRefView.tsx](file:///Users/sac/zoeapp/src/components/admin/ActorRefView.tsx) — Actor address formatter.
*   [AdminCard.tsx](file:///Users/sac/zoeapp/src/components/admin/AdminCard.tsx) — Layout containers.
*   [AdminMetric.tsx](file:///Users/sac/zoeapp/src/components/admin/AdminMetric.tsx) — Dynamic telemetry stats.
*   [AdminShell.tsx](file:///Users/sac/zoeapp/src/components/admin/AdminShell.tsx) — Admin workspace shell container.
*   [CommandButton.tsx](file:///Users/sac/zoeapp/src/components/admin/CommandButton.tsx) — Async indicator button.
*   [JsonInspector.tsx](file:///Users/sac/zoeapp/src/components/admin/JsonInspector.tsx) — Collapsible JSON data visualizer.
*   [OutboxBadge.tsx](file:///Users/sac/zoeapp/src/components/admin/OutboxBadge.tsx) — Synchronization indicators.
*   [PermissionGate.tsx](file:///Users/sac/zoeapp/src/components/admin/PermissionGate.tsx) — Access control boundary.
*   [QuadDeltaPreview.tsx](file:///Users/sac/zoeapp/src/components/admin/QuadDeltaPreview.tsx) — RDF graph differences tracker.
*   [ReceiptBadge.tsx](file:///Users/sac/zoeapp/src/components/admin/ReceiptBadge.tsx) — Message status tags.

---

### Component Prop Contracts

#### `VkgProvider` Context Value (`VkgContextType`)
Initialized by `<VkgProvider />` and retrieved via `useVkgEngine()`.

| Property | Type | Description |
|---|---|---|
| `pendingReceipts` | `number` | Number of local optimistic operations waiting for remote validation. |
| `processedReceipts` | `number` | Count of successfully processed transactions returned with authoritative confirmations. |
| `quarantinedHooks` | `string[]` | Encoded actor reference strings that are in quarantine. |
| `lastReceipt` | `HookReceipt \| null` | The most recent transaction receipt received. |
| `avatar` | `AvatarRole` | The active avatar role. |
| `setAvatar` | `(role: AvatarRole) => void` | Updates the active role, triggering projection matrix recalculation. |
| `projection` | `AvatarProjection \| null` | The resulting projection output containing visibility rules, surfaces, and payloads. |
| `triggerHook` | `(subject: string, pred: string, obj: string) => Promise<void>` | Dispatches a mutation delta. Updates the local store and queues sync actions. |
| `repairLastQuarantine` | `() => Promise<void>` | Sends a supervisor repair signal to lift quarantine status. |

---

#### `ErrorBoundary` Props
Catches errors during layout projections and handles the retry loop.

| Property | Type | Required | Description |
|---|---|---|---|
| `error` | `Error` | Yes | The thrown exception details. |
| `retry` | `() => void` | Yes | Callback to restart evaluation. |

---

#### `PermissionGate` Props
Blocks execution branches based on principal authorization.

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `allowedRoles` | `string[]` | Yes | — | Array of strings representing permitted roles. |
| `children` | `ReactNode` | Yes | — | Rendered layout if permission check succeeds. |
| `fallback` | `ReactNode` | No | Default restricted view | Layout rendered if the check fails. |
| `testID` | `string` | No | — | Testing selector ID. |

---

#### `CommandButton` Props
Standardized trigger buttons. Handles internal `loading` spinners during async tasks.

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | Yes | — | The button label. |
| `onPress` | `() => Promise<any> \| void` | Yes | — | Callback function. Spinner spins until the promise resolves. |
| `variant` | `'primary' \| 'secondary' \| 'danger'` | No | `'primary'` | Visual theme style. |
| `disabled` | `boolean` | No | `false` | Disables press events. |
| `style` | `ViewStyle` | No | — | Custom styles container. |
| `textStyle` | `TextStyle` | No | — | Text override styles. |
| `testID` | `string` | No | — | Testing ID. |

---

#### `QuadDeltaPreview` Props
Parses and displays RDF graph mutations using diff indicators.

| Property | Type | Required | Description |
|---|---|---|---|
| `delta` | `{ add?: any[]; remove?: any[] } \| string` | Yes | The transaction delta object or its JSON string representation. |
| `testID` | `string` | No | Test selector ID. |

---

## 4. Explanation: Architectural Paradigm

### Dynamic Avatar-Relative Projections

At the heart of the Zoe architecture lies the division between the **authoritative semantic graph** and the **avatar-relative projections** presented to the user. Rather than exposing complete database schemas or routing rules to client applications, Zoe filters all data through a projection matrix. 

```
┌─────────────────────────────────────────────────────────────┐
│                   Unified Semantic Graph                    │
│   (Volunteer shortage state, candidates registry, hashes)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼  [ projectHookOutput(state, role) ]
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
  Role: pastor           Role: volunteer        Role: member
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ Message: Alert │     │ Open Slots: 4  │     │ encouragement  │
│ Visibility: OK │     │ Visibility: OK │     │ Visibility: OK │
└────────────────┘     └────────────────┘     └────────────────┘
```

---

### Mathematical Compliance with the Chatman Equation

The shared components operate in accordance with the Receipted Chatman Equation:

$$R \vdash A = \mu(O^*)$$

*   **$O^*$ (Lawful Closure Ontology):** Defined inside state transition schemas (e.g. `volunteerShortageBehavior` rules in `VkgProvider`). Only operations matching these shapes can be executed.
*   **$\mu$ (Manufacturing Function):** Embedded within the projection parser ([projector.ts](file:///Users/sac/zoeapp/src/lib/truex/avatar/projector.ts)). It transforms state data based on the active role:
    $$\mu(State, Role) \to Projection$$
*   **$A$ (Emitted Consequence):** Represented by the component views (e.g., dynamically hiding cards, gating routes via `<Stack.Protected />` or `<Tabs.Protected />`).
*   **$R$ (Receipt Lineage):** Crystallized in `<ReceiptBadge />` and `<OutboxBadge />`. Every user mutation creates a cryptographic receipt hash that confirms transaction execution.

---

### Isolation Boundaries, Quarantine, and Self-Healing

When an operation fails invariant checks, the actor supervisor quarantines the corresponding runtime instance. This isolates the failing segment, preventing bad state from spreading while keeping the rest of the application responsive.

```
                    ┌────────────────────────────┐
                    │     Client Mutation        │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │      Runtime Invariant     │
                    └──────────────┬─────────────┘
                                   │
                    ┌──────────────┴─────────────┐
             [Valid]│                            │[Invalid]
                    ▼                            ▼
        ┌──────────────────────┐    ┌──────────────────────────┐
        │  Commit State Sync   │    │  Supervisor Intervention │
        │   Status: Confirmed  │    │   Action: Quarantine     │
        └──────────────────────┘    └────────────┬─────────────┘
                                                 │
                                                 ▼
                                    ┌──────────────────────────┐
                                    │    Developer console     │
                                    │   Action: RepairState    │
                                    └──────────────────────────┘
```

The error boundaries, outbox trackers, and supervisors work together to handle exceptions gracefully:
1.  **Isolation:** When a hook throws an error, the supervisor quarantines the actor ref. `VkgProvider` listens to this event and appends the reference to `quarantinedHooks`.
2.  **Visual Alerts:** The `<ReceiptBadge status="quarantined" />` and `<OfflineBanner />` alert the operator.
3.  **Self-Healing:** An administrator can trigger `repairLastQuarantine()` from the panel. This sends a restoration event to the quarantined instance, clearing the quarantine flag and restoring normal operation.

---

### Hydration Alignment

Web browsers run static page renders before JS scripts load, while mobile devices initialize values dynamically upon startup. 

```
Web Server Render (SSR) ──> Static HTML: 'light' theme
                                   │
                                   ▼  [ Hydration phase ]
Client Device (Web/Native) ─> Detects 'dark' system setting
```

Directly using dynamic settings (like system themes) during server-side rendering can cause hydration errors when the client loads. To prevent this, Zoe components use `useClientOnlyValue(serverValue, clientValue)`:
*   On server environments, this hook returns the safe static value.
*   On client environments, it waits until the component mounts to apply the dynamic setting, keeping client and server views aligned.

---

### Rendering Performance and Concurrency

The components use React optimizations to handle frequent updates to the Visual Knowledge Graph without UI lag:
*   **Shallow Stability (`useShallowStable`):** Compares nested screen options dynamically. It updates dependencies only when config properties actually change, preventing unnecessary component re-renders.
*   **Child Memoization (`useMemoizedChildren`):** Filters and memoizes component child trees. This prevents nested child components from re-rendering unless their core configuration or state changes.
*   **Custom Matrix Memoization (`AvatarProjectionCard`):** Compares projection outputs before rendering. The card updates only when the current role's data projections change, ignoring changes that affect other roles.
