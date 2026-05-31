# Compositions Module (`compositions`)

The `compositions` module is the orchestrating layer of the **Zoe 2030 Innovation Peak** framework. It unites isolated lower-level capabilities—such as biometric authentication, conflict-free replicated data types (CRDTs), 3D spatial positioning, on-device AI query expansion, neuro-symbolic searches, and autonomous self-healing—into high-level, production-ready application components and hooks.

---

## 1. Overview & Core Features

In complex, multi-agent, and decentralized environments, building user interfaces and states by manually wire-framing raw capabilities increases boilerplate and violates structural safety invariants. The `compositions` module was introduced to solve this by providing pre-composed, high-integrity patterns.

### Key Capabilities:
- **Unified Authentication (`auth-ui`):** Integrates session management, passwordless biometric authorization, and multi-factor validation into a single animated screen.
- **Scaffolding Blueprints (`blueprints`):** Exposes generative blueprints to programmatically scaffold full CRUD screens with AI search and offline sync capabilities.
- **Conflict-Free Shared Workspaces (`collaborative-state`):** Combines Zustand proxy stores with Last-Write-Wins (LWW) CRDT maps for reactive, real-time peer-to-peer state sharing.
- **Inclusive-by-Default UX (`inclusive-ui`):** Composes translation (i18n), accessibility (a11y), and voice intent hooks into components that respond to voice and touch interchangeably.
- **Intelligent Semantic Search (`intelligent-search`):** Orchestrates local, on-device AI model query expansion with Symbolic and Vector queries across the Virtual Knowledge Graph (VKG).
- **Mission Control Operations (`mission-control`):** Exposes visual admin consoles that display 3D membrane topology graphs alongside thread and memory vitals.
- **Micro-Frontend Orchestration (`platform-orchestration`):** Preloads federated module codebases in the background based on real-time application state changes.
- **Self-Healing Business Logic (`self-healing-logic`):** Wraps callbacks in actor-based supervisors that perform exponential backoff retries and invoke autonomous restoration routines upon persistent failure.
- **Graph-Direct CRUD Components (`semantic-crud`):** Feeds local semantic forms and high-performance search lists directly into the VKG via RDF delta updates.
- **Volumetric Spatial Layers (`spatial-dashboards`):** Lays flat 2D content into glassmorphic shells, applying 3D translations and rotational entry transitions for AR/VR runtimes.

---

## 2. Architectural & Philosophical Mapping

The `compositions` module acts as the cohesive glue for the **Truex Architecture** and aligns with the formal specifications of the **Receipted Chatman Equation**.

### 2.1 The Truex Architectural Pillars

```
             ┌────────────────────────────────────────────────────────┐
             │              Truex Pillars in Compositions             │
             └───────────────┬────────────────────────┬───────────────┘
                             │                        │
                             ▼                        ▼
                       ┌───────────┐            ┌───────────┐
                       │ Membrane  │            │  Intake   │
                       │ (Context) │            │ (Update)  │
                       └─────┬─────┘            └─────┬─────┘
                             │                        │
                             ▼                        ▼
                       ┌───────────┐            ┌───────────┐
                       │Projection │            │Supervision│
                       │ (Render)  │            │  (Safety) │
                       └───────────┘            └───────────┘
```

1. **Membrane (Containment & Verification):**
   Compositions establish explicit security and operational boundaries. The [ResilientBoundary.tsx](file:///Users/sac/zoeapp/src/framework/compositions/self-healing-logic/ResilientBoundary.tsx) initializes a dedicated operational membrane, while [UnifiedAuthScreen.tsx](file:///Users/sac/zoeapp/src/framework/compositions/auth-ui/components/UnifiedAuthScreen.tsx) serves as the gatekeeper for user identities.
2. **Intake (Structured State Capture):**
   Input and mutations are captured in a structured, governed format. The [CollaborativeWorkspace.ts](file:///Users/sac/zoeapp/src/framework/compositions/collaborative-state/CollaborativeWorkspace.ts) intercepts state mutations using ES6 Proxies and Zustand hooks. Similarly, [SemanticCrudManager.tsx](file:///Users/sac/zoeapp/src/framework/compositions/semantic-crud/SemanticCrudManager.tsx) captures field values and submits them as atomic semantic changes to the graph.
3. **Projection (Multi-Modal Layout Presentation):**
   Composition components map structured data onto different channels. The [GlassSpatialContainer.tsx](file:///Users/sac/zoeapp/src/framework/compositions/spatial-dashboards/GlassSpatialContainer.tsx) projects flat cards into 3D environments, while [VoiceAccessibleText.tsx](file:///Users/sac/zoeapp/src/framework/compositions/inclusive-ui/VoiceAccessibleText.tsx) projects localized text into voice-command interfaces.
4. **Supervision (Resiliency & Recovery):**
   Business logic is guarded against failure. The [useResilientCallback.ts](file:///Users/sac/zoeapp/src/framework/compositions/self-healing-logic/useResilientCallback.ts) runs executions inside the `ActorSupervisor` with exponential retries and engages the `SelfHealingManager` to restore corrupted sub-states on crash.

---

### 2.2 The Receipted Chatman Equation

The compositions module operationalizes the equation:

$$R \vdash A = \mu(O^*)$$

Where:
- **$O^*$ (Lawful Closure Ontology):** The set of valid schemas, target semantic types, federated module definitions, CRDT states, and voice intents.
- **$\mu$ (Manufacturing/Transformation Function):** The coordinating logic implemented in the composition hooks and components. It combines individual low-level actions (such as generating vector embeddings, merging peer-to-peer CRDT updates, and calling `triggerHook` on the VKG client) into a cohesive flow:
  
  $$\mu_{\text{collaborate}}(S_{\text{local}}, S_{\text{remote}}) \rightarrow S_{\text{merged}}$$
  
  Which resolves peer conflicts utilizing Last-Write-Wins (LWW) semantics:
  
  $$\operatorname{Register}_{\text{merged}} = \begin{cases} 
  \operatorname{Register}_{\text{local}}, & \text{if } t_{\text{local}} \ge t_{\text{remote}} \\
  \operatorname{Register}_{\text{remote}}, & \text{if } t_{\text{local}} < t_{\text{remote}}
  \end{cases}$$
  
- **$A$ (Emitted Consequence):** The resulting side effects: updated Zustand stores, rendered 3D spatial glass cards, registered voice intents, pre-fetched federated modules, and mutated RDF graphs.
- **$R$ (Receipt Lineage):** The verification ledger and validation suite. This is represented by execution histories, self-healing status audits, and the automated Jest test suites verifying each composition's integration invariants.

---

## 3. Source Code Structure

The module is housed inside the [compositions directory](file:///Users/sac/zoeapp/src/framework/compositions) and structured as follows:

```
src/framework/compositions/
├── index.ts                           # Global export barrel
├── auth-ui/                           # Unified biometric & MFA verification views
│   ├── index.ts
│   └── components/
│       └── UnifiedAuthScreen.tsx      # Multi-factor authentication screen component
├── blueprints/                        # Generators for rapid developer bootstrapping
│   ├── index.ts
│   ├── types.ts                       # Contracts for blueprints and template files
│   ├── templates/
│   │   └── crud-ai-sync.ts            # Templates for CRUD, AI Search, and Offline Sync
│   └── generators/
│       └── crud-generator.ts          # Core CRUD with AI Search and Sync generator
├── collaborative-state/               # CRDT-governed Zustand stores
│   ├── index.ts
│   └── CollaborativeWorkspace.ts      # Multi-peer state sync and LWW conflict resolution
├── inclusive-ui/                      # Multi-modal access layers (voice, accessibility, i18n)
│   ├── index.ts
│   ├── VoiceAccessibleText.tsx        # Voice-commandable localized Text component
│   └── useInclusiveInteraction.ts     # Hook composing voice, i18n, and touch accessibility
├── intelligent-search/                # AI-augmented knowledge graph query systems
│   ├── index.ts
│   ├── types.ts                       # Types for AI query expansion and NS queries
│   ├── useIntelligentSearch.ts        # Hook coordinating AI query expansion and NS query
│   └── AiSmartSearch.tsx              # Component displaying expanded semantic matches
├── mission-control/                   # Developer and operator system vitals panels
│   ├── index.ts
│   ├── MissionControl.tsx             # 3D Membrane topology container
│   └── SystemHealthDashboard.tsx      # Metric visualizer for FPS and memory usage
├── platform-orchestration/            # Micro-frontend pre-loading boundaries
│   ├── index.ts
│   └── PlatformKernel.tsx             # Component managing AppState micro-frontend lifecycles
├── self-healing-logic/                # Error-tolerant and self-restoring logical contexts
│   ├── index.ts
│   ├── ResilientBoundary.tsx          # Provider establishing high-integrity execution
│   └── useResilientCallback.ts        # Hook combining Membrane execution, retries, and healing
├── semantic-crud/                     # Low-code VKG entry views
│   ├── index.ts
│   ├── types.ts                       # Form and List view state definitions
│   ├── SemanticCrudManager.tsx        # Coordinates list, edit, detail, and VKG persistence
│   └── SemanticListView.tsx           # Offline-search-first list container
└── spatial-dashboards/                # 3D XR projected user interface components
    ├── index.ts
    └── GlassSpatialContainer.tsx      # Puts glassmorphic components into 3D coordinate space
```

### File Responsibilities:
- **[index.ts](file:///Users/sac/zoeapp/src/framework/compositions/index.ts):** Re-exports all sub-compositions.
- **[UnifiedAuthScreen.tsx](file:///Users/sac/zoeapp/src/framework/compositions/auth-ui/components/UnifiedAuthScreen.tsx):** Displays biometric and MFA authentication, invoking `useAuth`, `useBiometricAuth`, and `useMfaVerification`.
- **[crud-generator.ts](file:///Users/sac/zoeapp/src/framework/compositions/blueprints/generators/crud-generator.ts):** Generates structured source file arrays using template configurations.
- **[CollaborativeWorkspace.ts](file:///Users/sac/zoeapp/src/framework/compositions/collaborative-state/CollaborativeWorkspace.ts):** Implements `CollaborativeWorkspace` class, wrapping a Zustand store around an `LWWMap` CRDT.
- **[VoiceAccessibleText.tsx](file:///Users/sac/zoeapp/src/framework/compositions/inclusive-ui/VoiceAccessibleText.tsx):** Implements accessibility-labeled text fields that trigger voice registration callbacks automatically.
- **[useInclusiveInteraction.ts](file:///Users/sac/zoeapp/src/framework/compositions/inclusive-ui/useInclusiveInteraction.ts):** Returns combined a11y properties, voice commands, and translation functions.
- **[useIntelligentSearch.ts](file:///Users/sac/zoeapp/src/framework/compositions/intelligent-search/useIntelligentSearch.ts):** Performs local model query expansion followed by queries to the VKG.
- **[AiSmartSearch.tsx](file:///Users/sac/zoeapp/src/framework/compositions/intelligent-search/AiSmartSearch.tsx):** Renders raw neuro-symbolic query results in a flat layout or passes state down to rendering children.
- **[MissionControl.tsx](file:///Users/sac/zoeapp/src/framework/compositions/mission-control/MissionControl.tsx):** Integrates thread stats and 3D visualizers inside the administration dashboard.
- **[PlatformKernel.tsx](file:///Users/sac/zoeapp/src/framework/compositions/platform-orchestration/PlatformKernel.tsx):** Pre-fetches module chunks asynchronously during background app-state transitions.
- **[ResilientBoundary.tsx](file:///Users/sac/zoeapp/src/framework/compositions/self-healing-logic/ResilientBoundary.tsx):** Establishes the boundary context mapping `Membrane` and `SelfHealingManager`.
- **[useResilientCallback.ts](file:///Users/sac/zoeapp/src/framework/compositions/self-healing-logic/useResilientCallback.ts):** Executes logic through `ActorSupervisor`, the operational membrane, and attempts self-healing upon persistent failure.
- **[SemanticCrudManager.tsx](file:///Users/sac/zoeapp/src/framework/compositions/semantic-crud/SemanticCrudManager.tsx):** Directs view toggles and pushes form edits straight to the VKG using `triggerHook`.
- **[GlassSpatialContainer.tsx](file:///Users/sac/zoeapp/src/framework/compositions/spatial-dashboards/GlassSpatialContainer.tsx):** Wraps standard visual nodes with Glassmorphic textures and projects them inside spatial-aware environments.

---

## 4. API Contracts

### 4.1 Authentication UI (`auth-ui`)

#### `<UnifiedAuthScreen />`
Renders a secure biometric-first authentication interface with multi-factor OTP fallbacks.
```typescript
export const UnifiedAuthScreen: React.FC;
```

---

### 4.2 Blueprints (`blueprints`)

#### `BlueprintFile`
Defines a file's location and template contents.
```typescript
export interface BlueprintFile {
  path: string;
  content: string;
}
```

#### `CompositionalBlueprint`
Blueprint interface containing generation rules.
```typescript
export interface CompositionalBlueprint {
  name: string;
  description: string;
  generate: (name: string, options?: any) => BlueprintFile[];
}
```

---

### 4.3 Collaborative State (`collaborative-state`)

#### `CollaborativeWorkspaceConfig<T>`
Configuration parameters for shared multi-peer workspaces.
```typescript
export interface CollaborativeWorkspaceConfig<T extends object> {
  id: string;
  peerId: string;
  initialState: T;
  context: MembraneContext;
  onSync?: (state: LWWMapState<any>) => void;
}
```

#### `CollaborativeWorkspace<T>`
The core workspace manager.
```typescript
export class CollaborativeWorkspace<T extends object> {
  constructor(config: CollaborativeWorkspaceConfig<T>);
  get state(): T;
  get store(): any; // Zustand hook
  get crdtState(): LWWMapState<any>;
  receiveUpdate(remoteState: LWWMapState<any>): void;
}
```

---

### 4.4 Inclusive UI (`inclusive-ui`)

#### `VoiceAccessibleTextProps`
```typescript
export interface VoiceAccessibleTextProps extends TextProps {
  i18nKey?: string;
  i18nOptions?: Record<string, any>;
  a11yOptions?: AutoA11yOptions;
  voiceCommandPrefix?: string; // Defaults to 'focus'
  onVoiceFocus?: () => void;
  extraVoiceCommands?: string[];
}
```

#### `InclusiveInteractionOptions`
```typescript
export interface InclusiveInteractionOptions {
  id: string;
  i18nKey?: string;
  i18nOptions?: Record<string, any>;
  label?: string;
  a11yOptions?: AutoA11yOptions;
  voiceCommands?: string[];
  action: () => void | Promise<void>;
  priority?: number;
}
```

#### `useInclusiveInteraction`
```typescript
export function useInclusiveInteraction(
  options: InclusiveInteractionOptions
): {
  a11yProps: A11yProps;
  label: string;
  t: (key: string, options?: any) => string;
};
```

---

### 4.5 Intelligent Search (`intelligent-search`)

#### `IntelligentSearchOptions`
```typescript
export interface IntelligentSearchOptions {
  threshold?: number; // Defaults to 0.7
  limit?: number;     // Defaults to 10
  useAiExpansion?: boolean; // Defaults to true
}
```

#### `IntelligentSearchState`
```typescript
export interface IntelligentSearchState {
  results: NeuroSymbolicResult[];
  isLoading: boolean;
  error: Error | null;
  expandedQuery?: string;
}
```

#### `AiSmartSearchProps`
```typescript
export interface AiSmartSearchProps {
  query: string;
  options?: IntelligentSearchOptions;
  onResults?: (results: NeuroSymbolicResult[]) => void;
  onError?: (error: Error) => void;
  children?: (state: IntelligentSearchState) => React.ReactNode;
}
```

---

### 4.6 Mission Control (`mission-control`)

#### `<MissionControl />`
```typescript
export interface MissionControlProps {
  topology: MembraneTopology;
  onNodeClick?: (nodeId: string) => void;
  onBack?: () => void;
  testID?: string;
}
export const MissionControl: React.FC<MissionControlProps>;
```

#### `<SystemHealthDashboard />`
```typescript
export const SystemHealthDashboard: React.FC<{ testID?: string }>;
```

---

### 4.7 Platform Orchestration (`platform-orchestration`)

#### `<PlatformKernel />`
```typescript
export interface PlatformKernelProps {
  modules?: FederatedModuleConfig[];
  onAppStateChange?: (status: AppStateStatus) => void;
}
export const PlatformKernel: React.FC<PlatformKernelProps>;
```

---

### 4.8 Self-Healing Logic (`self-healing-logic`)

#### `<ResilientBoundary />`
```typescript
export const ResilientBoundary: React.FC<{
  children: React.ReactNode;
  config: MembraneConfig;
  healingConfig?: SelfHealingConfig;
}>;
```

#### `useResilientCallback`
```typescript
export function useResilientCallback<T, Args extends any[]>(
  callback: (...args: Args) => Promise<T>,
  capabilityId: string,
  policy?: SupervisionPolicy
): (...args: Args) => Promise<T>;
```

---

### 4.9 Semantic CRUD (`semantic-crud`)

#### `<SemanticCrudManager />`
```typescript
export interface SemanticCrudManagerProps {
  targetType: string;
  onEntitySelect?: (entityId: string) => void;
  onEntityCreate?: (data: Record<string, any>) => void;
  onEntityUpdate?: (entityId: string, data: Record<string, any>) => void;
  onEntityDelete?: (entityId: string) => void;
}
export const SemanticCrudManager: React.FC<SemanticCrudManagerProps>;
```

#### `<SemanticListView />`
```typescript
export interface SemanticListViewProps {
  targetType: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
}
export const SemanticListView: React.FC<SemanticListViewProps>;
```

---

### 4.10 Spatial Dashboards (`spatial-dashboards`)

#### `<GlassSpatialContainer />`
```typescript
export interface GlassSpatialContainerProps extends ViewProps, GlassBaseProps {
  transform?: SpatialViewProps['transform'];
  depth?: number;
  delay?: number;
  entryDirection?: 'up' | 'down' | 'left' | 'right';
  fadeOnly?: boolean;
}
export const GlassSpatialContainer: React.FC<GlassSpatialContainerProps>;
```

---

## 5. Usage Guide

Below is a complete, production-ready, copy-pasteable TypeScript React Native application component that demonstrates how multiple compositions integrate:
1. **Resilient Execution:** Wraps actions with `ResilientBoundary` and `useResilientCallback`.
2. **Collaborative Workspace:** Sets up a shared, CRDT-synced team workspace.
3. **Inclusive Voice UX:** Triggers actions via touch or voice commands using `useInclusiveInteraction`.
4. **Holographic Projection:** Displays visual interfaces inside `GlassSpatialContainer` projected within a 3D coordinate space.

```tsx
import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { MembraneContext } from '@/src/lib/membrane/context';
import {
  ResilientBoundary,
  CollaborativeWorkspace,
  GlassSpatialContainer,
  VoiceAccessibleText,
  useInclusiveInteraction,
  useResilientCallback
} from '@/src/framework/compositions';

// 1. Declare Shared State Model
interface TeamState {
  statusText: string;
  incidentCount: number;
}

// 2. Main Collaborative Composition component
const DashboardShell: React.FC = () => {
  const [inputText, setInputText] = useState('');
  
  // Initialize Membrane context and Collaborative state
  const context = useMemo(() => new MembraneContext({
    mode: 'strict',
    tenantId: 'team-orange-2030',
    authorityRole: 'operator'
  }), []);

  const workspace = useMemo(() => new CollaborativeWorkspace<TeamState>({
    id: 'team-shared-dashboard',
    peerId: 'terminal-device-alpha',
    initialState: { statusText: 'All systems green.', incidentCount: 0 },
    context,
    onSync: (crdtDelta) => {
      console.log('Broadcasting state delta to peers:', JSON.stringify(crdtDelta));
    }
  }), [context]);

  // Read Zustand reactive state hook
  const activeStatus = workspace.store(state => state.statusText);
  const activeIncidents = workspace.store(state => state.incidentCount);

  // 3. Define Resilient Async Actions (under membrane supervision)
  const submitIncidentReport = useResilientCallback(
    async (details: string) => {
      // Simulate API or persistence call
      if (details.includes('fail')) {
        throw new Error('Database write failure: partition unavailable.');
      }
      workspace.state.statusText = `Incident filed: ${details}`;
      workspace.state.incidentCount += 1;
      return { success: true };
    },
    'capability_incident_report',
    { maxRetries: 3, backoffMs: 200 }
  );

  const handleIncidentSubmit = async () => {
    try {
      await submitIncidentReport(inputText);
      setInputText('');
    } catch (err) {
      console.error('Action failed after 3 retries and self-healing execution:', err);
    }
  };

  // 4. Define multi-modal interactions (Touch and Voice Intents)
  const voiceClearAction = useInclusiveInteraction({
    id: 'reset-incidents-button',
    label: 'Reset Incidents',
    i18nKey: 'dashboard.reset_incidents',
    a11yOptions: {
      hint: 'Resets the active incident counter back to zero',
    },
    voiceCommands: ['reset dashboard', 'clear incidents'],
    action: () => {
      workspace.state.incidentCount = 0;
      workspace.state.statusText = 'Dashboard reset by operator.';
    }
  });

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* 3D Glass Projected Panel */}
      <GlassSpatialContainer
        transform={{
          position: { x: 0, y: 1.5, z: -1.2 },
          rotation: { x: 0.1, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        }}
        intensity="high"
        tint="default"
        withBorder={true}
        depth={10}
      >
        <View style={styles.cardContent}>
          <Text style={styles.title}>System Control Center</Text>
          
          {/* Inclusive VoiceAccessible Text node */}
          <VoiceAccessibleText 
            style={styles.statusLabel}
            voiceCommandPrefix="focus on"
            onVoiceFocus={() => console.log('Operator voice-focused status line.')}
          >
            System Status: {activeStatus}
          </VoiceAccessibleText>

          <Text style={styles.detailText}>
            Active Incidents: {activeIncidents}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Report anomaly (or type 'fail' to test healing)..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
          />

          <TouchableOpacity style={styles.button} onPress={handleIncidentSubmit}>
            <Text style={styles.buttonText}>Submit Report</Text>
          </TouchableOpacity>

          {/* Voice Accessible Reset Action */}
          <TouchableOpacity 
            style={[styles.button, styles.resetBtn]} 
            onPress={voiceClearAction.action}
            {...voiceClearAction.a11yProps}
          >
            <Text style={styles.buttonText}>{voiceClearAction.label}</Text>
          </TouchableOpacity>
        </View>
      </GlassSpatialContainer>
    </ScrollView>
  );
};

export const LiveProductionDashboard: React.FC = () => {
  return (
    <ResilientBoundary 
      config={{ mode: 'strict', tenantId: 'prod-cluster' }}
      healingConfig={{ maxAttempts: 3, recoveryTimeoutMs: 5000 }}
    >
      <DashboardShell />
    </ResilientBoundary>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0B0F19',
  },
  cardContent: {
    padding: 20,
    width: 320,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: '#38BDF8',
    fontWeight: '600',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  resetBtn: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
  },
});
```

---

## 6. Testing

The reliability and invariant correctness of the `compositions` module is backed by comprehensive unit and integration tests found throughout the directory structure.

### 6.1 Test Suites Overview

The composition tests validate integrations under various system conditions:
- **Blueprints Test:** Asserts that the template scaffolding pipeline resolves matching paths (`src/types/semantic/Task.ts`, `src/hooks/useTask.ts`, etc.) and substitutes module naming options cleanly. Located at [blueprints.test.ts](file:///Users/sac/zoeapp/src/framework/compositions/blueprints/__tests__/blueprints.test.ts).
- **Collaborative State Test:** Validates Zustand-CRDT synchronizations, ensuring local mutations trigger outbound notifications, and incoming updates merge via Last-Write-Wins (LWW) resolution rules without creating loops. Located at [CollaborativeWorkspace.test.ts](file:///Users/sac/zoeapp/src/framework/compositions/collaborative-state/__tests__/CollaborativeWorkspace.test.ts).
- **Inclusive UI Test:** Verifies that voice commands are registered with appropriate identifiers upon mount, translations are correctly interpolated, and accessibility accessibility tags are propagated. Located at [InclusiveUI.test.tsx](file:///Users/sac/zoeapp/src/framework/compositions/inclusive-ui/__tests__/InclusiveUI.test.tsx).
- **Intelligent Search Test:** Confirms the mock AI expansion hook correctly transforms search inputs before conducting symbolic and vector graph queries. Located at [useIntelligentSearch.test.ts](file:///Users/sac/zoeapp/src/framework/compositions/intelligent-search/__tests__/useIntelligentSearch.test.ts) and [AiSmartSearch.test.tsx](file:///Users/sac/zoeapp/src/framework/compositions/intelligent-search/__tests__/AiSmartSearch.test.tsx).
- **Mission Control Test:** Validates that metric vitals are updated at intervals and the 3D topology layout receives node-click coordinates. Located at [MissionControl.test.tsx](file:///Users/sac/zoeapp/src/framework/compositions/mission-control/__tests__/MissionControl.test.tsx) and [SystemHealthDashboard.test.tsx](file:///Users/sac/zoeapp/src/framework/compositions/mission-control/__tests__/SystemHealthDashboard.test.tsx).
- **Platform Orchestration Test:** Confirms federated modules are pre-loaded on startup and app-state event listeners are configured correctly. Located at [PlatformKernel.test.tsx](file:///Users/sac/zoeapp/src/framework/compositions/platform-orchestration/__tests__/PlatformKernel.test.tsx).
- **Semantic CRUD Test:** Asserts that the entity list queries and local form mutations execute target type validations before triggering updates on the graph. Located at [SemanticCrudManager.test.tsx](file:///Users/sac/zoeapp/src/framework/compositions/semantic-crud/__tests__/SemanticCrudManager.test.tsx) and [SemanticListView.test.tsx](file:///Users/sac/zoeapp/src/framework/compositions/semantic-crud/__tests__/SemanticListView.test.tsx).
- **Spatial Dashboards Test:** Asserts depth-to-zIndex style alignments, entry transition directions, and correct translation mappings to standard CSS View transformations. Located at [GlassSpatialContainer.test.tsx](file:///Users/sac/zoeapp/src/framework/compositions/spatial-dashboards/__tests__/GlassSpatialContainer.test.tsx).

---

### 6.2 Running the Tests

To run the compositions test suite, execute the following command in the workspace root directory:

```bash
# Run all compositions unit and integration tests via Jest
npx jest src/framework/compositions
```
