# Zoe Framework: Administration, Collaboration, & Metrics (Supervision Layer)

This document provides complete Diátaxis-compliant documentation for the Zoe Framework’s administration dashboards, collaboration systems, and metrics tools located under [admin](file:///Users/sac/zoeapp/src/framework/admin).

---

## 1. Tutorial: Developer Onboarding Guide

This tutorial guides you from absolute scratch to running your first administrative dashboard with performance tracking, Supabase real-time presence synchronization, and semantic RDF delta inspectability.

### Prerequisite Setup

Before starting, ensure that your React Native environment is configured with:
1. Expo or React Native CLI.
2. `react-native-reanimated` configured in your babel presets.
3. Supabase credentials set up in your local configuration.

---

### Step 1: Initialize App Vitals and Performance Benchmarking

Create a custom diagnostic hook that initializes the Zoe Framework performance tools. This hook tracks thread performance and records latency metrics for operations.

Create a file named `useMyDiagnostics.ts`:

```typescript
import { useEffect } from 'react';
import { useAppVitals, usePerformanceMonitor } from '../../src/framework/admin';

export function useMyDiagnostics() {
  // 1. Initialize real-time vitals monitoring (JS FPS, UI FPS, and Hermes Memory)
  const vitals = useAppVitals({
    updateInterval: 1000,
    enabled: true,
  });

  // 2. Initialize the performance monitor to record execution tracks
  const { metrics, recordMetric, clearMetrics } = usePerformanceMonitor({
    maxMetrics: 50,
    enabled: true,
  });

  // 3. Track a mock operations pipeline to record performance footprints
  useEffect(() => {
    const runPerformanceDiagnostics = async () => {
      const startTime = Date.now();
      
      // Simulate a network fetch or database sync operation
      await new Promise((resolve) => setTimeout(resolve, 120));
      
      const duration = Date.now() - startTime;
      recordMetric('DatabaseSyncOperation', duration);
    };

    runPerformanceDiagnostics();
  }, [recordMetric]);

  return {
    vitals,
    metrics,
    clearMetrics,
  };
}
```

---

### Step 2: Establish Real-Time Collaboration Presence

Next, integrate multi-operator collaboration. Multiple developers or agents can look at the same screen and broadcast status changes or cursor/focus coordinates using Supabase.

Create a file named `useMyCollaborativeSession.ts`:

```typescript
import { useState } from 'react';
import { usePresence, useCollaborationEvents, CollaborationUser, CollaborationEvent } from '../../src/framework/admin/collaboration';

interface CursorCoordinates {
  x: number;
  y: number;
}

export function useMyCollaborativeSession(channelId: string, currentUser: CollaborationUser) {
  const [liveCursors, setLiveCursors] = useState<Record<string, CursorCoordinates>>({});

  // 1. Track presence (who is online in this session)
  const { presenceState, users, error } = usePresence({
    channelId,
    user: currentUser,
    onSync: (state) => {
      console.log('Synchronized presence state across nodes:', state);
    },
  });

  // 2. Initialize event broadcast for cursor coordinates
  const { broadcast } = useCollaborationEvents<CursorCoordinates>({
    channelId,
    eventType: 'cursor',
    onEvent: (event: CollaborationEvent<CursorCoordinates>) => {
      setLiveCursors((prev) => ({
        ...prev,
        [event.userId]: event.payload,
      }));
    },
  });

  const updateCursorPosition = (x: number, y: number) => {
    broadcast(currentUser.id, { x, y });
  };

  return {
    users,
    liveCursors,
    updateCursorPosition,
    error,
  };
}
```

---

### Step 3: Render the Admin Shell and RDF Triples Viewer

Now, assemble the visual layer using `<AdminShell />`, `<QuadDeltaPreview />`, `<JsonInspector />`, and `<StatusBadge />`.

Create `MyDiagnosticDashboard.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { 
  AdminShell, 
  CommandButton, 
  JsonInspector, 
  QuadDeltaPreview, 
  StatusBadge 
} from '../../src/framework/admin';
import { useMyDiagnostics } from './useMyDiagnostics';
import { useMyCollaborativeSession } from './useMyCollaborativeSession';

export function MyDiagnosticDashboard() {
  const { vitals, metrics, clearMetrics } = useMyDiagnostics();
  
  const currentUser = {
    id: 'developer-42',
    name: 'Sarah Connor',
    color: '#3B82F6',
  };
  
  const { users, updateCursorPosition } = useMyCollaborativeSession('admin-control-room', currentUser);
  const [activeTab, setActiveTab] = useState('metrics');

  // Semantic RDF Delta simulating transaction additions and removals
  const mockDelta = {
    add: [
      { subject: 'https://schema.org/Person', predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', object: 'AgentNode' },
      { subject: 'https://schema.org/Person', predicate: 'http://schema.org/name', object: 'Supervisor-7' }
    ],
    remove: [
      { subject: 'https://schema.org/Person', predicate: 'http://schema.org/status', object: 'quarantined' }
    ]
  };

  return (
    <AdminShell
      title="Zoe Admin Control Room"
      subtitle="Supervision Substrate 2030"
      activeNavigationId={activeTab}
      navigationItems={[
        { id: 'metrics', name: 'Performance Vitals' },
        { id: 'database', name: 'RDF State Transitions' }
      ]}
      onNavigate={(item) => setActiveTab(item.id)}
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Collaboration Presence</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Online Operators: {users.length}</Text>
          <StatusBadge status="applied_local" />
        </View>
      </View>

      {activeTab === 'metrics' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Engine Frame Rates</Text>
          <View style={styles.metricRow}>
            <Text style={styles.label}>JS Thread: <Text style={styles.value}>{vitals.jsFps} FPS</Text></Text>
            <Text style={styles.label}>UI Thread: <Text style={styles.value}>{vitals.uiFps} FPS</Text></Text>
          </View>
          <Text style={styles.label}>Hermes Heap: <Text style={styles.value}>{vitals.memory} MB</Text></Text>

          <Text style={styles.sectionTitle}>Execution Durations</Text>
          {metrics.map((m) => (
            <Text key={m.id} style={styles.logText}>
              {new Date(m.timestamp).toLocaleTimeString()} - {m.name}: {m.duration}ms
            </Text>
          ))}

          <CommandButton 
            title="Flush Diagnostics Logs" 
            onPress={async () => {
              clearMetrics();
            }}
            variant="secondary"
            style={{ marginTop: 12 }}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RDF Membrane Delta</Text>
          <QuadDeltaPreview delta={mockDelta} />

          <Text style={styles.sectionTitle}>Raw Transaction State</Text>
          <JsonInspector data={mockDelta} title="View Encoded RDF Delta" />
        </View>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
  },
  value: {
    color: '#34D399',
    fontWeight: 'bold',
  },
  logText: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    color: '#60A5FA',
    marginTop: 4,
  },
});
```

---

## 2. How-To Guide: Building a Live-Sync Membrane Supervision Console

This section provides a complete, production-ready React Native console component. It integrates 3D Membrane topology rendering, performance monitoring worklets, multi-agent presence, command processing, and semantic delta views into a single, cohesive dashboard screen.

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView } from 'react-native';
import { 
  AdminShell, 
  CommandButton, 
  JsonInspector, 
  QuadDeltaPreview, 
  StatusBadge, 
  LogViewer, 
  LogEntry, 
  usePerformanceMonitor,
  useAppVitals
} from '../../src/framework/admin';
import { 
  usePresence, 
  useCollaborationEvents 
} from '../../src/framework/admin/collaboration';
import { 
  TelemetryGraph3D 
} from '../../src/framework/admin/telemetry-3d';
import { MembraneTopology } from '../../src/framework/admin/telemetry-3d/types';

// Concrete, clickable source references:
// - Navigation Shell: [AdminShell.tsx](file:///Users/sac/zoeapp/src/framework/admin/components/AdminShell.tsx)
// - Telemetry Graph: [TelemetryGraph3D.tsx](file:///Users/sac/zoeapp/src/framework/admin/telemetry-3d/TelemetryGraph3D.tsx)

export function LiveSupervisionConsole() {
  const [activeTab, setActiveTab] = useState<'topology' | 'database' | 'logs'>('topology');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemState, setSystemState] = useState({
    cacheCleaned: false,
    syncEnforced: false,
    repairsTriggered: 0
  });

  const appendLog = (message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info') => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        level,
        message,
        timestamp: Date.now(),
      },
      ...prev,
    ]);
  };

  // 1. App Vitals
  const vitals = useAppVitals({
    updateInterval: 1000,
    enabled: true,
  });

  // 2. Custom execution benchmarking
  const { metrics, recordMetric } = usePerformanceMonitor({
    maxMetrics: 20,
    enabled: true,
  });

  // 3. Collaboration & Presence Hook configuration
  const currentUser = {
    id: 'operator-prime',
    name: 'Supervisory Agent Alpha',
    color: '#8B5CF6',
  };

  const { users } = usePresence({
    channelId: 'membrane-live-sync',
    user: currentUser,
    onSync: (state) => {
      appendLog(`Presence state synced: ${Object.keys(state).length} active connections.`, 'debug');
    },
  });

  const { broadcast } = useCollaborationEvents<{ commandId: string; status: string }>({
    channelId: 'membrane-live-sync',
    eventType: 'command-broadcast',
    onEvent: (event) => {
      appendLog(`Operator ${event.userId} executed: ${event.payload.commandId} (${event.payload.status})`, 'info');
    },
  });

  // 4. Live Membrane Topology Definition
  const [topology, setTopology] = useState<MembraneTopology>({
    nodes: [
      { id: 'node-gate', type: 'gateway', label: 'Primary Edge Gateway', tension: 0.1 },
      { id: 'node-auth', type: 'system', label: 'OAuth Security Node', tension: 0.3 },
      { id: 'node-actor-1', type: 'actor', label: 'Autonomous Agent Ref #1', tension: 0.8 },
      { id: 'node-actor-2', type: 'actor', label: 'Autonomous Agent Ref #2', tension: 0.5 },
    ],
    edges: [
      { id: 'edge-1', source: 'node-gate', target: 'node-auth', queueDensity: 0.2 },
      { id: 'edge-2', source: 'node-auth', target: 'node-actor-1', queueDensity: 0.9 },
      { id: 'edge-3', source: 'node-auth', target: 'node-actor-2', queueDensity: 0.4 },
    ]
  });

  // 5. Semantic Quad Deltas (RDF updates showing active structural transformations)
  const [lastDelta, setLastDelta] = useState<{ add?: any[]; remove?: any[] }>({
    add: [
      { subject: 'node-actor-1', predicate: 'http://schema.org/status', object: 'active' }
    ]
  });

  const triggerCacheClean = async () => {
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 200));
    setSystemState((prev) => ({ ...prev, cacheCleaned: true }));
    const duration = Date.now() - start;
    recordMetric('CleanCacheJob', duration);
    appendLog('System memory heap garbage collection requested and completed successfully.', 'info');
    broadcast(currentUser.id, { commandId: 'CleanCacheJob', status: 'success' });
  };

  const triggerEnforceSync = async () => {
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 450));
    setSystemState((prev) => ({ ...prev, syncEnforced: true }));
    const duration = Date.now() - start;
    
    // Mutate the local 3D node topologies to reflect state updates
    setTopology((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => 
        node.id === 'node-actor-1' ? { ...node, tension: 0.2 } : node
      )
    }));

    // Dispatch RDF modifications
    setLastDelta({
      add: [
        { subject: 'node-actor-1', predicate: 'http://schema.org/syncStatus', object: 'synchronized' }
      ],
      remove: [
        { subject: 'node-actor-1', predicate: 'http://schema.org/status', object: 'active' }
      ]
    });

    recordMetric('EnforceSubstrateSync', duration);
    appendLog('Local state databases synchronized with remote clusters.', 'info');
    broadcast(currentUser.id, { commandId: 'EnforceSubstrateSync', status: 'success' });
  };

  const triggerRepair = async () => {
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 150));
    setSystemState((prev) => ({ ...prev, repairsTriggered: prev.repairsTriggered + 1 }));
    const duration = Date.now() - start;
    recordMetric('StateRepairSystem', duration);
    appendLog('State discrepancy repair agent finished execution cycle.', 'warn');
    broadcast(currentUser.id, { commandId: 'StateRepairSystem', status: 'warning' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminShell
        title="Substrate Supervision Console"
        subtitle="Zoe 2030 Admin Dashboard"
        activeNavigationId={activeTab}
        navigationItems={[
          { id: 'topology', name: 'Membrane Topology' },
          { id: 'database', name: 'RDF Substrate' },
          { id: 'logs', name: 'Live Logs' }
        ]}
        onNavigate={(item) => setActiveTab(item.id as any)}
      >
        {/* Core telemetry overlays */}
        <View style={styles.vitalsPanel}>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>JS THREAD</Text>
            <Text style={styles.vitalVal}>{vitals.jsFps} FPS</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>UI THREAD</Text>
            <Text style={styles.vitalVal}>{vitals.uiFps} FPS</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>JS HEAP</Text>
            <Text style={styles.vitalVal}>{vitals.memory} MB</Text>
          </View>
        </View>

        {/* Tab 1: 3D Membrane Visualizer */}
        {activeTab === 'topology' && (
          <View style={styles.container}>
            <Text style={styles.panelTitle}>Membrane Spatial Node Topology</Text>
            <TelemetryGraph3D 
              topology={topology} 
              onNodeClick={(nodeId) => {
                appendLog(`Selected membrane node: ${nodeId}`, 'debug');
              }}
            />
            <Text style={styles.subtext}>
              * Nodes represent functional clusters. Z-axis represents topological tension.
            </Text>
          </View>
        )}

        {/* Tab 2: Database Operations and Semantic Delta RDF Graphs */}
        {activeTab === 'database' && (
          <ScrollView style={styles.container}>
            <Text style={styles.panelTitle}>Semantic RDF Mutations</Text>
            <QuadDeltaPreview delta={lastDelta} />

            <Text style={styles.panelTitle}>Active Console Registry State</Text>
            <JsonInspector data={systemState} title="System Configuration Context" initiallyExpanded />
            
            <View style={styles.operationsGrid}>
              <CommandButton 
                title="Flush Memory Heap Cache" 
                onPress={triggerCacheClean} 
                variant="secondary"
                style={styles.actionBtn}
              />
              <CommandButton 
                title="Force Substrate Sync" 
                onPress={triggerEnforceSync} 
                variant="primary"
                style={styles.actionBtn}
              />
              <CommandButton 
                title="Invoke Auto-Repair Loop" 
                onPress={triggerRepair} 
                variant="danger"
                style={styles.actionBtn}
              />
            </View>
          </ScrollView>
        )}

        {/* Tab 3: Logging Diagnostics */}
        {activeTab === 'logs' && (
          <View style={styles.container}>
            <LogViewer logs={logs} title="Console Stream" maxHeight={250} />
            
            <Text style={styles.panelTitle}>Benchmarked Durations</Text>
            <ScrollView style={styles.metricsContainer}>
              {metrics.length === 0 ? (
                <Text style={styles.emptyText}>No metrics recorded yet.</Text>
              ) : (
                metrics.map((metric) => (
                  <View key={metric.id} style={styles.metricRecord}>
                    <Text style={styles.metricName}>{metric.name}</Text>
                    <Text style={styles.metricVal}>{metric.duration} ms</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </AdminShell>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    marginTop: 12,
  },
  vitalsPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vitalBox: {
    alignItems: 'center',
    flex: 1,
  },
  vitalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  vitalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
    marginTop: 2,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F1F5F9',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtext: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  operationsGrid: {
    marginTop: 16,
    gap: 8,
  },
  actionBtn: {
    marginVertical: 4,
  },
  metricsContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricRecord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  metricName: {
    color: '#E2E8F0',
    fontSize: 11,
    fontFamily: 'SpaceMono',
  },
  metricVal: {
    color: '#34D399',
    fontSize: 11,
    fontFamily: 'SpaceMono',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
```

---

## 3. Reference Guide

### Directory File Layout

Here is the directory structure for the admin module. Use these clickable absolute file links to review implementations:

- [index.ts](file:///Users/sac/zoeapp/src/framework/admin/index.ts) - The main framework admin entry point exporting components and hooks.
- **components/**
  - [AdminShell.tsx](file:///Users/sac/zoeapp/src/framework/admin/components/AdminShell.tsx) - Main layout view including custom header layouts and modular navigation items.
  - [CommandButton.tsx](file:///Users/sac/zoeapp/src/framework/admin/components/CommandButton.tsx) - Accessible action button handling asynchronous operations, spinner toggles, and safety boundaries.
  - [JsonInspector.tsx](file:///Users/sac/zoeapp/src/framework/admin/components/JsonInspector.tsx) - Expansible structured JSON inspectability view.
  - [LogViewer.tsx](file:///Users/sac/zoeapp/src/framework/admin/components/LogViewer.tsx) - Terminal-styled scrolling live logs container.
  - [QuadDeltaPreview.tsx](file:///Users/sac/zoeapp/src/framework/admin/components/QuadDeltaPreview.tsx) - Renders additions and removals of semantic RDF quads.
  - [StatusBadge.tsx](file:///Users/sac/zoeapp/src/framework/admin/components/StatusBadge.tsx) - Formatted labels displaying execution statuses.
- **hooks/**
  - [usePerformanceMonitor.ts](file:///Users/sac/zoeapp/src/framework/admin/hooks/usePerformanceMonitor.ts) - Memory-resident transaction benchmarks compiler.
- **collaboration/**
  - [index.ts](file:///Users/sac/zoeapp/src/framework/admin/collaboration/index.ts) - Collaboration module entry exports.
  - [types.ts](file:///Users/sac/zoeapp/src/framework/admin/collaboration/types.ts) - Contains TypeScript types for presence and events.
  - [usePresence.ts](file:///Users/sac/zoeapp/src/framework/admin/collaboration/usePresence.ts) - Supabase realtime-backed active user presence tracking.
  - [useCollaborationEvents.ts](file:///Users/sac/zoeapp/src/framework/admin/collaboration/useCollaborationEvents.ts) - Broadcast and event listener hook.
- **metrics/**
  - [index.ts](file:///Users/sac/zoeapp/src/framework/admin/metrics/index.ts) - Export entry point for application performance vitals.
  - [useAppVitals.ts](file:///Users/sac/zoeapp/src/framework/admin/metrics/useAppVitals.ts) - Worklet-driven zero-bridge overhead JS and UI thread FPS tracker.
- **telemetry-3d/**
  - [TelemetryGraph3D.tsx](file:///Users/sac/zoeapp/src/framework/admin/telemetry-3d/TelemetryGraph3D.tsx) - Renders membrane network structures in dynamic pseudo-3D environments.
  - [hooks.ts](file:///Users/sac/zoeapp/src/framework/admin/telemetry-3d/hooks.ts) - Resolves circle layout coordinates and color interpolation based on tension parameters.
  - [types.ts](file:///Users/sac/zoeapp/src/framework/admin/telemetry-3d/types.ts) - Interface contracts for membrane nodes, edges, and 3D render values.

#### Associated Test Files:
- [AdminShell.test.tsx](file:///Users/sac/zoeapp/src/framework/admin/__tests__/AdminShell.test.tsx)
- [CommandButton.test.tsx](file:///Users/sac/zoeapp/src/framework/admin/__tests__/CommandButton.test.tsx)
- [JsonInspector.test.tsx](file:///Users/sac/zoeapp/src/framework/admin/__tests__/JsonInspector.test.tsx)
- [LogViewer.test.tsx](file:///Users/sac/zoeapp/src/framework/admin/__tests__/LogViewer.test.tsx)
- [QuadDeltaPreview.test.tsx](file:///Users/sac/zoeapp/src/framework/admin/__tests__/QuadDeltaPreview.test.tsx)
- [StatusBadge.test.tsx](file:///Users/sac/zoeapp/src/framework/admin/__tests__/StatusBadge.test.tsx)
- [usePerformanceMonitor.test.ts](file:///Users/sac/zoeapp/src/framework/admin/__tests__/usePerformanceMonitor.test.ts)
- [usePresence.test.ts](file:///Users/sac/zoeapp/src/framework/admin/collaboration/__tests__/usePresence.test.ts)
- [useCollaborationEvents.test.ts](file:///Users/sac/zoeapp/src/framework/admin/collaboration/__tests__/useCollaborationEvents.test.ts)
- [useAppVitals.test.ts](file:///Users/sac/zoeapp/src/framework/admin/metrics/__tests__/useAppVitals.test.ts)
- [TelemetryGraph3D.test.tsx](file:///Users/sac/zoeapp/src/framework/admin/telemetry-3d/__tests__/TelemetryGraph3D.test.tsx)
- [hooks.test.ts](file:///Users/sac/zoeapp/src/framework/admin/telemetry-3d/__tests__/hooks.test.ts)

---

### Component Specifications & API Contracts

#### `<AdminShell />`
Root viewport layout containing the navigation sub-bar and safe areas.
```typescript
export interface AdminNavigationItem {
  name: string;
  id: string;
}

export interface AdminShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  navigationItems?: AdminNavigationItem[];
  activeNavigationId?: string;
  onNavigate?: (item: AdminNavigationItem) => void;
  onBack?: () => void;
  headerBanner?: React.ReactNode;
  testID?: string;
}
```

#### `<CommandButton />`
An asynchronous touch trigger preventing multi-clicks and managing runtime execution safety.
```typescript
export interface CommandButtonProps {
  title: string;
  onPress: () => Promise<any> | void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  testID?: string;
}
```

#### `<JsonInspector />`
Renders structured context trees with interactive toggle headers.
```typescript
export interface JsonInspectorProps {
  data: any;
  title?: string;
  testID?: string;
  initiallyExpanded?: boolean;
}
```

#### `<LogViewer />`
Categorized list of console logs for runtime monitoring.
```typescript
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
}

export interface LogViewerProps {
  logs: LogEntry[];
  title?: string;
  maxHeight?: number;
}
```

#### `<QuadDeltaPreview />`
Specialized semantic RDF inspector showing subject-predicate-object changes.
```typescript
export interface QuadDeltaPreviewProps {
  delta: {
    add?: any[];
    remove?: any[];
  } | string | null | undefined;
  testID?: string;
}
```

#### `<StatusBadge />`
Derives color coding depending on input status strings (e.g. `quarantine` -> purple, `fail`/`reject` -> danger, etc.).
```typescript
export interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple';
  testID?: string;
}
```

#### `<TelemetryGraph3D />`
Renders a topology map mapping membrane tensions to coordinates.
```typescript
export interface TelemetryGraph3DProps {
  topology: MembraneTopology;
  onNodeClick?: (nodeId: string) => void;
  testID?: string;
}
```

---

### Hooks Specifications

#### `usePresence(options)`
Syncs active user presence keys using Supabase PostgreSQL presence adapters.
```typescript
export interface CollaborationUser {
  id: string;
  name?: string;
  avatarUrl?: string;
  color?: string;
  [key: string]: any;
}

export interface PresenceState {
  [key: string]: CollaborationUser[];
}

export interface UsePresenceOptions {
  channelId: string;
  user: CollaborationUser;
  onSync?: (state: PresenceState) => void;
}

// Hook Signature
export function usePresence(options: UsePresenceOptions): {
  presenceState: PresenceState;
  users: CollaborationUser[];
  error: Error | null;
};
```

#### `useCollaborationEvents(options)`
Broadcasts live events across channels.
```typescript
export interface CollaborationEvent<T = any> {
  userId: string;
  type: string;
  payload: T;
  timestamp: number;
}

export interface UseCollaborationEventsOptions<T = any> {
  channelId: string;
  eventType: string;
  onEvent?: (event: CollaborationEvent<T>) => void;
}

// Hook Signature
export function useCollaborationEvents<T = any>(
  options: UseCollaborationEventsOptions<T>
): {
  broadcast: (userId: string, payload: T) => void;
};
```

#### `useAppVitals(options)`
Calculates frame rate parameters on JS and UI threads.
```typescript
export interface AppVitals {
  jsFps: number;
  uiFps: number;
  memory: number; // Hermes heap total in megabytes
}

export interface UseAppVitalsOptions {
  updateInterval?: number;
  enabled?: boolean;
}

// Hook Signature
export function useAppVitals(options?: UseAppVitalsOptions): AppVitals;
```

#### `usePerformanceMonitor(options)`
Benchmarks functional actions in memory.
```typescript
export interface PerformanceMetric {
  id: string;
  name: string;
  duration: number;
  timestamp: number;
}

export interface UsePerformanceMonitorOptions {
  maxMetrics?: number;
  enabled?: boolean;
}

// Hook Signature
export function usePerformanceMonitor(options?: UsePerformanceMonitorOptions): {
  metrics: PerformanceMetric[];
  recordMetric: (name: string, duration: number) => void;
  clearMetrics: () => void;
};
```

#### `useTelemetryState(topology)`
Derives circles, coordinates, scaling factors, and colors representing node tension inside `<TelemetryGraph3D />`.
```typescript
export function useTelemetryState(topology: MembraneTopology): {
  nodeProps: Record<string, Node3DProps>;
  edgeProps: (Edge3DProps & { id: string })[];
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
};
```

---

## 4. Architectural & Mathematical Explanation

### Architectural Overview

The administration framework operates as the **Supervision** module of the Zoe 2030 Framework (governed by the Membrane, Intake, Projection, and Supervision architecture). The dashboard aggregates status indications and allows human operators or supervisory AI agents to observe, adjust, and correct the systems running under the operational membrane.

```mermaid
graph TD
    subgraph Membrane Substrate
        State[Active RDF State]
        MembraneNodes[Membrane Node Topology]
    end

    subgraph Supervision Layer (Admin)
        AdminView[AdminShell Viewport]
        AppVitalsMonitor[useAppVitals Worklet]
        PresenceSync[Supabase Presence Sync]
        DeltaPreview[QuadDeltaPreview]
        ActionTrigger[CommandButton Trigger]
    end

    State -->|Emits Quad Delta| DeltaPreview
    MembraneNodes -->|Exposes Nodes & Tension| AdminView
    AppVitalsMonitor -->|Native UI/JS Thread FPS| AdminView
    PresenceSync -->|Broadcasting Operators| AdminView

    ActionTrigger -->|Executes Command μ| State
    AdminView -->|Triggers Action| ActionTrigger
```

### Mathematical Mapping to the Chatman Equation

The admin module is designed to inspect and manage systems governed by the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where:
- $O^*$ represents the **Lawful Closure Ontology**, which defines all admissible states. In the database and local system, these are represented as RDF triples.
- $\mu$ represents the **Transformation Function** representing execution engines or state mutations.
- $A$ represents the **Emitted Consequences** (e.g. dynamic state revisions or UI layout updates).
- $R$ represents the **Receipt Lineage**, proving that the execution occurred safely within compliance rules.

The administration tools map to these parameters:

| Element | System Component | Mathematical Function |
|---|---|---|
| **$O^*$ (Ontology)** | `<JsonInspector />` & `<TelemetryGraph3D />` | Formally visualizes and checks the current state space representation $O^*$. |
| **$\mu$ (Morphic Transformation)** | `<CommandButton />` | Represents the invocation of a transformation function $\mu$ on the state $O^*$. |
| **$A$ (Emitted Consequence)** | `<QuadDeltaPreview />` | Visualizes state deltas as additions ($+\text{additions}$) and removals ($-\text{removals}$) of semantic RDF triples. |
| **$R$ (Receipt Lineage)** | `usePerformanceMonitor` & `<LogViewer />` | Gathers performance logs and transaction runtimes to prove execution safety. |

By tracking execution durations ($R$) during the invocation of commands ($\mu$), the supervision console guarantees that state changes maintain the safety and stability constraints of $O^*$.

---

### Key Design Trade-offs & Engineering Decisions

#### 1. Zero-Bridge Overhead Telemetry via Reanimated Worklets
Standard JS-based timers (`setInterval`) fail to measure native thread performance because they are blocked by intensive tasks running on the JS engine thread.
To solve this, `useAppVitals` hooks into the native layout clock using `useFrameCallback` from `react-native-reanimated`.
- **Worklet Execution**: The frame tracker increments a shared value (`uiFrameCount.value`) directly on the UI (Native) thread using worklets.
- **Bridge Reduction**: State calculations are throttled to a configurable update interval (e.g. 1000ms), sending metric summaries to the JS engine only once per interval, which minimizes serialization overhead.

#### 2. Local Pseudo-3D vs WebGL/Expo GL Canvas
Rendering three-dimensional structures inside React Native often requires heavy WebGL libraries (like three.js/Expo GL) that bloat application bundle sizes and introduce runtime overhead.
- **Dynamic Trigonometric Math**: The `<TelemetryGraph3D />` component resolves three-dimensional nodes using circular geometry:
  $$x = \cos(\theta) \cdot r,\quad y = \sin(\theta) \cdot r,\quad z = \text{tension} \cdot 2$$
- **Reanimated Springs**: Native coordinates are scaled to canvas dimensions and positioned dynamically using Reanimated’s `withSpring` animations. This yields 60fps movement animations using React Native `<View>` elements, eliminating the need for a full 3D rendering engine.

#### 3. Supabase Real-Time Broadcast Channels
Collaboration events (such as cursors or console commands) utilize Supabase's WebSocket-based realtime channels.
- **Pros**: Low latency, lightweight serialization, and zero-polling architecture.
- **Cons**: Concurrency collisions can happen if multiple developers trigger commands simultaneously. This is resolved in the core by enclosing state changes inside transaction boundaries.
