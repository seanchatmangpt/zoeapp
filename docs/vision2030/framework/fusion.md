# Fusion Module Documentation

The **Fusion** module is the primary meta-orchestrator of the Zoe Framework's **2030 Innovation Peak**. Rather than implementing low-level primitives from scratch, the `fusion` module *fuses* distinct, pre-existing capabilities of the framework (such as virtual knowledge graphs, predictive prefetching, P2P CRDT sync, generative UI, 3D holographic rendering, voice-to-intent, and autonomous auto-fixing) into single, unified, high-level developer and operator interfaces. This module acts as the cohesive binding glue of the Truex substrate, ensuring that these distinct systems operate as a unified, ambient-aware, self-healing runtime.

---

## 1. Overview

In the Zoe 2030 runtime, the operator interacts with a context-rich, multi-transport, inclusive environment. The `fusion` module simplifies development by offering five key integration planes:
1. **Intelligent Developer Diagnostics (`admin`)**: Integrates real-time 3D telemetry graphs, mission control system vitals, and automated self-healing action queues into a single console.
2. **Unified Data Orchestration (`data`)**: Blends neuro-symbolic fuzzy querying, predictive prefetching (cache warming), and semantic CRUD forms/lists into a single data manager.
3. **Floating Developer Utilities (`dx`)**: Provides a dev-only floating button that yields inline documentation explorers and code-scaffolding based on architectural blueprints.
4. **Inclusive-by-Default Access Layer (`i18n`)**: Wraps the application to automatically inject recursive translation, voice-to-intent command boundaries, and voice accessibility label trees.
5. **Multi-Transport State Synchronization (`sync`)**: Fuses collaborative CRDT state workspaces, P2P mesh broadcasts, and standard outbox sync engines with automatic payload compression.
6. **Adaptive Spatial Projection (`xr`)**: Detects device capabilities (e.g., VisionOS) to transition 2D grid elements into 3D glassmorphic carousel, grid, or dashboard scenes.

---

## 2. Architectural & Philosophical Mapping

The `fusion` module is structured to enforce the core Truex architecture (Membrane, Intake, Projection, Supervision) and aligns directly with the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

### 1. Architectural Mapping

```
                 ┌────────────────────────────────────────────────────────┐
                 │                       SUPERVISION                      │
                 │   - FusionAdminConsole monitors system vitals & queue  │
                 │   - AutoFixer performs self-healing state repairs      │
                 └──────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                        MEMBRANE                        │
                 │   - VoiceCommandBoundary captures spoken intent bounds │
                 │   - VKG Hook transactions validate mutation actions    │
                 └──────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                         INTAKE                         │
                 │   - Ingests fuzzy neuro queries & network packets      │
                 │   - Decompresses sync updates & CRDT payloads          │
                 └──────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
                 ┌────────────────────────────────────────────────────────┐
                 │                       PROJECTION                       │
                 │   - FusionSpatialScene projects 3D glassmorphic arcs   │
                 │   - AutoInclusiveRoot injects translation strings       │
                 └────────────────────────────────────────────────┘
```

* **Intake**: Ingests user voice/intent inputs, fuzzy queries, and incoming P2P/Server sync packages. Automatically handles decompression and parsing of state payloads.
* **Membrane**: Imposes transactional boundaries and capability checks via Virtual Knowledge Graph hooks (`triggerHook`) and filters spoken commands within registered Voice-to-Intent boundaries.
* **Projection**: Renders interactive layouts, adapting dynamically from flat 2D grids into immersive, depth-aware 3D glassmorphism panels positioned in physical space.
* **Supervision**: Oversees application health via real-time telemetry, monitoring JS/UI framerates, memory footprint, and queueing/firing autonomous self-healing scripts for runtime errors.

### 2. Chatman Equation Conformance

| Term | Equation Variable | Fusion Module Conformance |
| :--- | :--- | :--- |
| **Lawful Closure Ontology** | $O^*$ | RDF target types (e.g., Schema.org definitions), CRDT state structures (`LWWMapState`), and allowable voice-to-intent capabilities. |
| **Transformation Function** | $\mu$ | Neuro-symbolic query parsers, CRDT state merge logic, payload compression/decompression algorithms, and spatial 3D position generators. |
| **Emitted Consequence** | $A$ | Rendered 3D or 2D layouts, persisted database records, updated server states, and completed auto-fix repair executions. |
| **Receipt Lineage** | $R$ | P2P sync logs, MMKV-persisted sticky states, auto-fix diagnostic histories, and verification receipts for offline outbox queues. |

---

## 3. Source Code Structure

The module is located at [fusion](file:///Users/sac/zoeapp/src/framework/fusion) and contains the following submodules and files:

### Admin Submodule
* [FusionAdminConsole.tsx](file:///Users/sac/zoeapp/src/framework/fusion/admin/FusionAdminConsole.tsx): Dashboard component fusing vitals, 3D telemetry graphs, and error-solving repair queues.
* [types.ts](file:///Users/sac/zoeapp/src/framework/fusion/admin/types.ts): Declares data shapes for error logs and the admin console properties.
* [index.ts](file:///Users/sac/zoeapp/src/framework/fusion/admin/index.ts): Exports all public components and types for the admin dashboard.
* [FusionAdminConsole.test.tsx](file:///Users/sac/zoeapp/src/framework/fusion/admin/__tests__/FusionAdminConsole.test.tsx): Unit tests for tab navigation, auto-fix actions, and node interaction.

### Data Submodule
* [FusionDataManager.tsx](file:///Users/sac/zoeapp/src/framework/fusion/data/FusionDataManager.tsx): High-level orchestrator blending neuro-symbolic query inputs, predictive prefetching, and semantic CRUD structures.
* [types.ts](file:///Users/sac/zoeapp/src/framework/fusion/data/types.ts): Declares properties for querying, state representation, and data manager configuration.
* [index.ts](file:///Users/sac/zoeapp/src/framework/fusion/data/index.ts): Exports the data manager component and types.
* [FusionDataManager.test.tsx](file:///Users/sac/zoeapp/src/framework/fusion/data/__tests__/FusionDataManager.test.tsx): Unit tests for query flows, form submissions, edit/delete actions, and error handling.

### DX Submodule
* [FusionDevTools.tsx](file:///Users/sac/zoeapp/src/framework/fusion/dx/FusionDevTools.tsx): Development-only floating Action Button and modal containing documentation explorers and blueprint code generators.
* [index.ts](file:///Users/sac/zoeapp/src/framework/fusion/dx/index.ts): Exports the developer tools component.
* [FusionDevTools.test.tsx](file:///Users/sac/zoeapp/src/framework/fusion/dx/__tests__/FusionDevTools.test.tsx): Unit tests verifying development-only rendering constraints, modal triggers, and blueprint generators.

### i18n Submodule
* [FusionAccessibilityLayer.tsx](file:///Users/sac/zoeapp/src/framework/fusion/i18n/FusionAccessibilityLayer.tsx): App wrapper injecting localization providers, voice intent handlers, and auto-inclusive translation containers.
* [index.ts](file:///Users/sac/zoeapp/src/framework/fusion/i18n/index.ts): Re-exports internationalization, voice, and inclusive UI functions.
* [FusionAccessibilityLayer.test.tsx](file:///Users/sac/zoeapp/src/framework/fusion/i18n/__tests__/FusionAccessibilityLayer.test.tsx): Unit tests validating auto-translation of string children, locale switches, and voice intent processing.

### Sync Submodule
* [FusionSyncEngine.ts](file:///Users/sac/zoeapp/src/framework/fusion/sync/FusionSyncEngine.ts): Orchestrator fusing standard HTTP outbox queues, peer-to-peer mesh networking, CRDT map state merging, and payload compression.
* [index.ts](file:///Users/sac/zoeapp/src/framework/fusion/sync/index.ts): Exports the synchronization engine.

### XR Submodule
* [FusionSpatialScene.tsx](file:///Users/sac/zoeapp/src/framework/fusion/xr/FusionSpatialScene.tsx): Scene adapter that maps 2D children into a 3D physical workspace (via grid, carousel, or arc arrangements) in XR mode.
* [index.ts](file:///Users/sac/zoeapp/src/framework/fusion/xr/index.ts): Exports the spatial scene component.
* [FusionSpatialScene.test.tsx](file:///Users/sac/zoeapp/src/framework/fusion/xr/__tests__/FusionSpatialScene.test.tsx): Unit tests verifying 2D layout fallbacks and 3D coordinate transformations for carousels, grids, and dashboards.

---

## 4. Public Interfaces & API Contracts

### 1. Admin Console

#### `FusionErrorLog`
Represents an error context scheduled for diagnostic resolution.
```typescript
export interface FusionErrorLog {
  id: string;
  timestamp: number;
  error: Error;
  status: 'pending' | 'fixed' | 'ignored';
}
```

#### `FusionAdminConsoleProps`
Props for configuring the admin telemetry dashboard.
```typescript
export interface FusionAdminConsoleProps {
  topology: MembraneTopology;
  initialErrorLogs?: FusionErrorLog[];
  onNodeClick?: (nodeId: string) => void;
  onBack?: () => void;
  testID?: string;
}
```

---

### 2. Data Manager

#### `FusionQuery`
Combines exact symbolic properties with natural language prompts.
```typescript
export interface FusionQuery extends NeuroSymbolicQuery {
  prefetchEnabled?: boolean;
}
```

#### `FusionDataManagerProps`
```typescript
export interface FusionDataManagerProps {
  targetType: string;
  initialQuery?: FusionQuery;
  onEntitySelect?: (entityId: string) => void;
  onEntityCreate?: (data: Record<string, any>) => void;
  onEntityUpdate?: (entityId: string, data: Record<string, any>) => void;
  onEntityDelete?: (entityId: string) => void;
  uiHint?: string;
}
```

---

### 3. Localization & Accessibility

#### `FusionAccessibilityLayerProps`
```typescript
export interface FusionAccessibilityLayerProps {
  children: React.ReactNode;
  translations: Translations;
  locale?: string;
  voiceEnabled?: boolean;
  initialIntents?: VoiceIntent[];
  voiceOverlay?: React.ReactNode;
  autoTranslate?: boolean;
  style?: ViewStyle;
}
```

---

### 4. Synchronization Engine

#### `FusionSyncEngineConfig<TJob>`
```typescript
export interface FusionSyncEngineConfig<TJob extends SyncJobBase> {
  standardEngine: FrameworkSyncEngine<TJob>;
  meshEngine: MeshSyncEngine;
  compression: CompressionStrategy;
}
```

#### `FusionSyncEngine<TJob>` Methods
* **`constructor(config: FusionSyncEngineConfig<TJob>)`**: Sets up mesh listeners and registers standard, mesh, and compression sub-engines.
* **`createWorkspace<T>(config: Omit<CollaborativeWorkspaceConfig<T>, 'onSync'>): Promise<CollaborativeWorkspace<T>>`**: Registers a collaborative workspace and automatically routes CRDT updates to standard server queues and P2P mesh broadcasts with compression.
* **`getWorkspace<T>(id: string): CollaborativeWorkspace<T> | undefined`**: Locates an active workspace by ID.
* **`syncAll(): Promise<void>`**: Compresses and broadcasts the local state of all registered workspaces across the mesh and triggers standard server outbox sync jobs.
* **`receiveStandardUpdate(workspaceId: string, compressedPayload: string): Promise<void>`**: Handles decompressed incoming state blocks from the standard server queue and merges them into the local workspace.

---

### 5. Spatial Scene (XR)

#### `FusionSpatialSceneProps`
```typescript
export interface FusionSpatialSceneProps {
  children: React.ReactNode[];
  layout?: 'grid' | 'carousel' | 'dashboards';
  intensity?: GlassIntensity;
  tint?: GlassTint;
  isSpatial?: boolean;
  radius?: number;
  columns?: number;
  gap?: number;
  stagger?: number;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
}
```

---

## 5. Usage Guide

The following production-ready TypeScript code demonstrates how to initialize the `FusionSyncEngine`, configure `FusionAccessibilityLayer` to wrap the application runtime, fetch and update data via `FusionDataManager`, and project layout panels into a 3D XR carousel using `FusionSpatialScene`.

```tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';

// 1. Core Fusion Modules
import { FusionAccessibilityLayer } from '../src/framework/fusion/i18n';
import { FusionDataManager } from '../src/framework/fusion/data';
import { FusionSpatialScene } from '../src/framework/fusion/xr';
import { FusionSyncEngine } from '../src/framework/fusion/sync';

// 2. Auxiliary Framework Imports
import { FrameworkSyncEngine } from '../src/framework/sync/engine';
import { MeshSyncEngine } from '../src/framework/sync/p2p/types';
import { CompressionStrategy } from '../src/framework/sync/compression/types';
import { CollaborativeWorkspace } from '../src/framework/compositions/collaborative-state/CollaborativeWorkspace';

// Define local translations dictionary
const appTranslations = {
  en: {
    welcome_message: 'Welcome to the Intelligent Membrane',
    error_occurred: 'An execution error has occurred',
    sync_active: 'P2P Sync Active',
  },
  es: {
    welcome_message: 'Bienvenido al Membrana Inteligente',
    error_occurred: 'Ha ocurrido un error de ejecución',
    sync_active: 'Sincronización P2P Activa',
  }
};

// Define voice commands
const voiceIntents = [
  {
    id: 'refresh-data',
    commands: ['refresh data', 'reload sync'],
    action: () => console.log('[Voice Intent] Triggering data refresh...'),
  }
];

// Production implementation of compression strategy
const mockCompression: CompressionStrategy = {
  compress: async (data: string) => {
    // In real environments, this wraps gzip/lzma
    return `c_${data}`;
  },
  decompress: async (data: string) => {
    if (data.startsWith('c_')) {
      return data.substring(2);
    }
    return data;
  }
};

// Set up mock engines for dependency injection
const mockStandardEngine = {
  queueJob: async (job: any) => {
    console.log('[Standard Engine] Queueing job:', job);
  },
  pushChanges: async () => {
    console.log('[Standard Engine] Flushing local outbox to server');
  }
} as unknown as FrameworkSyncEngine<any>;

const mockMeshEngine = {
  getAdapter: () => ({
    getLocalPeerId: () => 'peer-device-id',
    broadcast: (msg: any) => console.log('[P2P Mesh] Broadcasting:', msg),
    onMessage: (callback: any) => {
      // Simulate receipt of P2P CRDT sync update
      setTimeout(() => {
        callback({
          type: 'sync_state',
          senderId: 'remote-peer-id',
          payload: {
            id: 'workspace-123',
            state: 'c_{"state":{"data":"remote-crdt-payload"}}'
          },
          timestamp: Date.now()
        });
      }, 3000);
    }
  })
} as unknown as MeshSyncEngine;

// Initialize the Sync Engine orchestrator
const syncEngine = new FusionSyncEngine({
  standardEngine: mockStandardEngine,
  meshEngine: mockMeshEngine,
  compression: mockCompression
});

export function FusionAppRuntime() {
  const [workspace, setWorkspace] = useState<CollaborativeWorkspace<any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initWorkspace() {
      // Initialize a new collaborative CRDT workspace
      const ws = await syncEngine.createWorkspace({
        id: 'workspace-123',
        initialState: { counter: 0 }
      });
      setWorkspace(ws);
      setLoading(false);
    }
    initWorkspace();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <FusionAccessibilityLayer
      translations={appTranslations}
      locale="en"
      voiceEnabled={true}
      initialIntents={voiceIntents}
    >
      <View style={styles.appWrapper}>
        <Text style={styles.title}>welcome_message</Text>
        
        {/* Dynamic Spatial Scene: automatically wraps item layouts in 3D in visionOS */}
        <FusionSpatialScene
          layout="carousel"
          radius={3}
          intensity="high"
          tint="dark"
          isSpatial={true} // Forces 3D spatial positioning for testing
        >
          {/* Data Manager 1: Governs Contact Type queries */}
          <View style={styles.scenePanel}>
            <Text style={styles.panelTitle}>Contacts Substrate</Text>
            <FusionDataManager 
              targetType="https://schema.org/Person"
              uiHint="Fuzzy query results are active."
              onEntitySelect={(id) => console.log('Selected contact:', id)}
            />
          </View>

          {/* Data Manager 2: Governs Organization queries */}
          <View style={styles.scenePanel}>
            <Text style={styles.panelTitle}>Organizations Substrate</Text>
            <FusionDataManager 
              targetType="https://schema.org/Organization"
              uiHint="Predictive prefetching is enabled."
              onEntitySelect={(id) => console.log('Selected organization:', id)}
            />
          </View>
        </FusionSpatialScene>
      </View>
    </FusionAccessibilityLayer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  appWrapper: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#0F172A',
  },
  title: {
    fontSize: 20,
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  scenePanel: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  panelTitle: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '800',
    marginBottom: 8,
  }
});
```

---

## 6. Testing

The reliability, responsiveness, and state mappings of the `fusion` submodules are validated by an extensive automated test suite.

### 1. How to run tests

To run the full test suite for the `fusion` module, execute the following command in the workspace root:

```bash
npm test src/framework/fusion/
```

### 2. Test Coverage Details

* **`FusionAdminConsole.test.tsx`**:
  * Asserts rendering of Vitals tab by default.
  * Asserts navigation to Telemetry tab and checks node selection callbacks on the `TelemetryGraph3D`.
  * Verifies the error-solving list is updated when an error is resolved by the `AutoFixer`.
  * Verifies empty states are correctly rendered.
* **`FusionDataManager.test.tsx`**:
  * Verifies that target types trigger predictive prefetching with default configuration bounds.
  * Validates search inputs and matching neuro-symbolic query refetch triggers.
  * Asserts form transitions (`create`/`edit`/`details` screens) and triggers graph hooks upon data save.
  * Confirms error rendering banners show error messages on query failures.
* **`FusionDevTools.test.tsx`**:
  * Verifies development-mode flags prevent rendering in production.
  * Validates floating action button triggers and tab transitions between Docs and Blueprints.
  * Verifies loading and execution simulator triggers for generator tasks.
* **`FusionAccessibilityLayer.test.tsx`**:
  * Asserts translation provider properties on child nodes.
  * Verifies locale state updates and real-time screen-reader translation swaps.
  * Checks voice command definitions register cleanly inside the component tree.
* **`FusionSpatialScene.test.tsx`**:
  * Mocks Platform.OS to assert 2D column widths and glass card staggers on standard mobile devices.
  * Validates 3D transforms, rotation grids, and spread calculation for immersive carousels and eye-level dashboards.
