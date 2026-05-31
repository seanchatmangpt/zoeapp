# Zoe State Synchronization and Middleware Layer

The Zoe Framework State Synchronization and Middleware layer is the cornerstone of Zoe's local-first, reactive, and cryptographically governed state paradigm. It provides isolated local storage adapters, reactive State stores backed by Membrane-governed ES6 Proxies, and inter-store synchronization pipelines.

This layer bridges high-performance persistence, reactive UI bindings, and strict capability governance.

---

## 1. Tutorial: Getting Started with Governed, Local-First State

This tutorial guides you through setting up a governed, persistent local state store from scratch in a React Native application. You will:

1. Initialize an isolated MMKV storage database.
2. Define a state target and store schema.
3. Bind a Membrane-governed proxy store.
4. Consume state reactively with automatic hydration tracking in React.
5. Synchronize data updates across stores.

### Prerequisites

Ensure you have the following modules installed or imported in your workspace:

- `zustand` (State management)
- `react-native-mmkv` (Fast key-value storage)
- React and React Native environments

### Step 1: Initialize the Membrane Context

To enforce safety boundaries, we first need a `MembraneContext` that monitors state changes and verifies trajectories.

```typescript
import { MembraneContext } from '../../lib/membrane/context';

// Instantiate a strict Membrane Context for governance
const membraneContext = new MembraneContext({
  mode: 'strict',
  tenantId: 'tenant-zoe-core',
  authorityRole: 'volunteer',
});
```

### Step 2: Define State Interfaces

Next, define the shape of your raw target object (the governed, mutable state) and the Zustand store interface (the reactive state used by the UI).

```typescript
// The raw target state structure that holds actual values
interface CounterTarget {
  count: number;
  lastUpdatedBy: string;
}

// The Zustand store interface which includes actions
interface CounterStore {
  count: number;
  lastUpdatedBy: string;
  increment: (user: string) => void;
  reset: () => void;
}
```

### Step 3: Create the Governed Proxy Store

Use `createProxyStore` to create a reactive Zustand store backed by a Membrane-governed proxy. When you mutate properties on the proxy directly, those mutations are caught by the proxy traps and synchronized automatically to the Zustand store.

```typescript
import { createProxyStore } from './proxyStore';

// Initial state target
const initialTarget: CounterTarget = {
  count: 0,
  lastUpdatedBy: 'system',
};

// Create the governed proxy and bound Zustand store hook
const { proxy, useStore } = createProxyStore<CounterTarget, CounterStore>({
  target: initialTarget,
  context: membraneContext,
  flowName: 'CounterFlow',
  // Directs mutation sync from the proxy to the Zustand store state
  syncToStore: (prop, value, set) => {
    if (prop === 'count') {
      set({ count: value as number });
    } else if (prop === 'lastUpdatedBy') {
      set({ lastUpdatedBy: value as string });
    }
  },
  // Instantiates the store state and actions
  createStore: (set, get, proxyObj) => ({
    count: proxyObj.count,
    lastUpdatedBy: proxyObj.lastUpdatedBy,
    increment: (user) => {
      // Direct mutations on the proxy trigger traps and sync to Zustand
      proxyObj.count += 1;
      proxyObj.lastUpdatedBy = user;
    },
    reset: () => {
      proxyObj.count = 0;
      proxyObj.lastUpdatedBy = 'reset_action';
    },
  }),
});
```

### Step 4: Render Hydrated State in a React Native Component

When using persistent stores (see how-to guide below), state must hydrate from the local database before rendering. The framework provides the `useHydration` hook to prevent UI flashes.

```tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useHydration } from './hooks';

export function CounterView() {
  // Check if store has completed hydration (always returns true if non-persistent)
  const isHydrated = useHydration(useStore);
  const count = useStore((state) => state.count);
  const lastUpdatedBy = useStore((state) => state.lastUpdatedBy);
  const { increment, reset } = useStore.getState();

  if (!isHydrated) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading cached state...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Governed State Counter</Text>
      <Text style={styles.text}>Count: {count}</Text>
      <Text style={styles.subtext}>Last updated by: {lastUpdatedBy}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={() => increment('user_tutorial')}>
          <Text style={styles.buttonText}>+1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.danger]} onPress={reset}>
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  heading: { fontSize: 20, color: '#ffffff', fontWeight: 'bold', marginBottom: 10 },
  text: { fontSize: 18, color: '#eaeaea', marginBottom: 5 },
  subtext: { fontSize: 14, color: '#888888', marginBottom: 20 },
  row: { flexDirection: 'row', gap: 10 },
  button: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  danger: { backgroundColor: '#cc3300' },
  buttonText: { color: '#ffffff', fontWeight: 'bold' },
});
```

### Step 5: Synchronize State Across Stores

Sometimes, an update to one store must trigger a side-effect update in another store. The `syncStores` utility establishes a clean, non-circular state pipe.

```typescript
import { createStore } from 'zustand';
import { syncStores } from './sync';

// Define a separate logs store
interface LogStore {
  history: string[];
  addLog: (msg: string) => void;
}

const logStore = createStore<LogStore>((set) => ({
  history: [],
  addLog: (msg) => set((state) => ({ history: [...state.history, msg] })),
}));

// Sync the Counter's state changes directly to the LogStore
const unsubscribe = syncStores(
  useStore, // source store API
  logStore, // target store API
  (state) => state.count, // slice selector
  (targetState, count) => {
    // Return partial state or apply action on target store
    targetState.addLog(`Counter state changed to ${count}`);
    return null; // returning null prevents zustand from overriding target state keys directly
  }
);

// To clean up the sync listener:
// unsubscribe();
```

---

## 2. How-To Guide: Enforcing Multi-Store Hydrated Sync with Isolated Persistence

### Goal

Define an advanced local profile cache that is:

1. **Isolated**: Persisted in its own private MMKV file instance.
2. **Hydrated**: Delays UI rendering until local cache is loaded.
3. **Governed**: State mutations undergo Membrane interceptor checks.
4. **Synced**: User session logs update when profile updates occur.

### Complete, Production-Ready Implementation

Copy and paste this TypeScript implementation to set up the multi-store persistent sync architecture.

```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { create, StoreApi, UseBoundStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPersistenceConfig } from './middleware';
import { useHydration } from './hooks';
import { syncStores } from './sync';
import { createProxyStore } from './proxyStore';
import { MembraneContext } from '../../lib/membrane/context';
import { Interceptors } from '../../lib/membrane/interceptors';

// ==========================================
// 1. MEMBRANE GOVERNANCE CONFIGURATION
// ==========================================

const membraneContext = new MembraneContext({
  mode: 'strict',
  tenantId: 'tenant-finance-zoe',
  authorityRole: 'admin',
});

// Register a membrane interceptor that validates email formatting on profile mutations
Interceptors.clear();
Interceptors.register(async (ctx) => {
  if (ctx.capabilityId === 'property-mutator') {
    const { property, value } = ctx.input;
    if (property === 'email') {
      const emailStr = String(value);
      // Deny emails that do not contain '@' and do not end with zoeapp.org
      if (!emailStr.includes('@') || !emailStr.endsWith('zoeapp.org')) {
        return false; // Deny set mutation
      }
    }
  }
  return true; // Allow operation
});

// ==========================================
// 2. PROFILE STORE (PERSISTENT & MEMBRANE-GOVERNED)
// ==========================================

export interface ProfileTarget {
  name: string;
  email: string;
}

export interface ProfileStore {
  name: string;
  email: string;
  updateProfile: (name: string, email: string) => void;
}

const initialProfile: ProfileTarget = {
  name: 'John Doe',
  email: 'john@zoeapp.org',
};

// Create a persistence config utilizing isolated MMKV database instance 'profile-store-db'
const persistenceConfig = createPersistenceConfig<ProfileStore>({
  name: 'profile-store-db',
  version: 1,
});

// Wrap the proxy store setup with Zustand's persist middleware
let storeSetFn: StoreApi<ProfileStore>['setState'] | undefined;

const { proxy: profileProxy, useStore: useProfileStore } = createProxyStore<ProfileTarget, ProfileStore>({
  target: initialProfile,
  context: membraneContext,
  flowName: 'ProfileUpdateFlow',
  syncToStore: (prop, value, set) => {
    if (prop === 'name') set({ name: value as string });
    if (prop === 'email') set({ email: value as string });
  },
  createStore: (set, get, proxyObj) => {
    storeSetFn = set;
    return {
      name: proxyObj.name,
      email: proxyObj.email,
      updateProfile: (name, email) => {
        // Traps the sets: validation happens on background membrane execution
        proxyObj.name = name;
        proxyObj.email = email;
      },
    };
  },
});

// Re-wrap the store implementation with persist middleware to support MMKV caching
const persistentStore = create<ProfileStore>()(
  persist(
    (set, get) => {
      // Connect our proxy setter to persistence setter
      storeSetFn = set;
      return useProfileStore.getState();
    },
    persistenceConfig
  )
);

// Synchronize profile proxy back to persistent store on background rollbacks
useProfileStore.subscribe((state) => {
  persistentStore.setState({ name: state.name, email: state.email });
});

// ==========================================
// 3. SESSION LOG STORE (PERSISTENT SUMMARY)
// ==========================================

export interface SessionStore {
  lastUpdated: string;
  updateCount: number;
  incrementUpdate: (timestamp: string) => void;
}

const sessionStoreConfig = createPersistenceConfig<SessionStore>({
  name: 'session-store-db',
  version: 1,
});

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      lastUpdated: 'Never',
      updateCount: 0,
      incrementUpdate: (timestamp) =>
        set((state) => ({
          lastUpdated: timestamp,
          updateCount: state.updateCount + 1,
        })),
    }),
    sessionStoreConfig
  )
);

// ==========================================
// 4. INTER-STORE SYNCHRONIZATION PIPELINE
// ==========================================

// Establish state synchronization:
// Every time the profile email or name changes, update the Session Log metadata
export const unsubscribeSync = syncStores(
  persistentStore,
  useSessionStore,
  (state) => ({ name: state.name, email: state.email }), // Selector slice
  (targetState, slice) => {
    const timestamp = new Date().toISOString();
    targetState.incrementUpdate(timestamp);
    return null; // Using action mutator
  }
);

// ==========================================
// 5. REACT NATIVE COMPONENT VIEW
// ==========================================

export function ProfileDashboardView() {
  const profileHydrated = useHydration(persistentStore);
  const sessionHydrated = useHydration(useSessionStore);

  const name = persistentStore((state) => state.name);
  const email = persistentStore((state) => state.email);

  const lastUpdated = useSessionStore((state) => state.lastUpdated);
  const updateCount = useSessionStore((state) => state.updateCount);

  const { updateProfile } = persistentStore.getState();

  const handleUpdateValid = () => {
    // Matches validation: ends with zoeapp.org
    updateProfile('Jane Doe', 'jane@zoeapp.org');
  };

  const handleUpdateInvalid = () => {
    // Fails validation: does not end with zoeapp.org
    // Membrane will block mutation asynchronously and roll back state
    updateProfile('Malicious Actor', 'attacker@untrusted.com');
  };

  if (!profileHydrated || !sessionHydrated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading State Databases...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Governed User Dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Local Profile Cache</Text>
        <Text style={styles.text}>Name: {name}</Text>
        <Text style={styles.text}>Email: {email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync Session Metadata</Text>
        <Text style={styles.text}>Updates Count: {updateCount}</Text>
        <Text style={styles.text}>Last Synced: {lastUpdated}</Text>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.button} onPress={handleUpdateValid}>
          <Text style={styles.btnText}>Apply Valid Update</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.btnDanger]} onPress={handleUpdateInvalid}>
          <Text style={styles.btnText}>Apply Denied Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#1a1a1a', justifyContent: 'center' },
  title: { fontSize: 22, color: '#fff', fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#2a2a2a', padding: 15, borderRadius: 8, marginBottom: 15 },
  cardTitle: { fontSize: 16, color: '#38bdf8', fontWeight: 'bold', marginBottom: 8 },
  text: { fontSize: 14, color: '#e2e8f0', marginVertical: 2 },
  btnRow: { flexDirection: 'column', gap: 10, marginTop: 10 },
  button: { backgroundColor: '#0284c7', padding: 12, borderRadius: 6, alignItems: 'center' },
  btnDanger: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
```

---

## 3. Reference Guide: API Specifications

### Source Layout

Here is the directory structure for the State synchronization module:

- [index.ts](file:///Users/sac/zoeapp/src/framework/state/index.ts) - Public exports and entry point.
- [storage.ts](file:///Users/sac/zoeapp/src/framework/state/storage.ts) - Isolated MMKV database state storage adapter.
- [proxyStore.ts](file:///Users/sac/zoeapp/src/framework/state/proxyStore.ts) - Interface connecting Membrane targets to Zustand reactive states.
- [middleware.ts](file:///Users/sac/zoeapp/src/framework/state/middleware.ts) - Local persistence JSON-Zustand configuration helper.
- [hooks.ts](file:///Users/sac/zoeapp/src/framework/state/hooks.ts) - Hydration lifecycle tracking hooks for React Native.
- [sync.ts](file:///Users/sac/zoeapp/src/framework/state/sync.ts) - Inter-store synchronization pipeline.

---

### Storage Management (`storage.ts`)

Defines the isolated storage wrappers backed by `react-native-mmkv`.

#### `StorageAdapter` Interface

Describes the wrapper holding the storage interface and the raw engine instance.

| Property   | Type           | Description                                 |
| :--------- | :------------- | :------------------------------------------ |
| `storage`  | `StateStorage` | Zustand-compatible storage instance.        |
| `instance` | `MMKV`         | Raw `react-native-mmkv` database reference. |

#### `createStorageAdapter()`

Creates an isolated Zustand storage adapter backed by a unique MMKV database instance.

```typescript
export function createStorageAdapter(storeId: string): StorageAdapter;
```

- **Parameters**:
  - `storeId`: A non-empty string used as the isolated MMKV identifier.
- **Exceptions**:
  - Throws an `Error` if `storeId` is empty or only contains whitespace.

---

### Proxy Stores (`proxyStore.ts`)

Establishes a reactive Zustand store backed by a Membrane-governed proxy.

#### `ProxyStoreConfig<TTarget, TStore>` Interface

| Config Property | Type                                                                           | Description                                                                        |
| :-------------- | :----------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| `target`        | `TTarget`                                                                      | The raw mutable target object that holds the actual state values.                  |
| `context`       | `MembraneContext`                                                              | The membrane context governing state transitions and boundary rules.               |
| `syncToStore`   | `(prop: keyof TTarget, value: any, set: StoreApi<TStore>['setState']) => void` | Callback that synchronizes a trapped mutation from the proxy to the Zustand store. |
| `createStore`   | `(set, get, proxy) => TStore`                                                  | Factory returning the initialized store state and actions.                         |
| `flowName`      | `string` (Optional)                                                            | Telemetry flow name for verification matching.                                     |

#### `ProxyStoreResult<TTarget, TStore>` Interface

| Return Property | Type                              | Description                                             |
| :-------------- | :-------------------------------- | :------------------------------------------------------ |
| `proxy`         | `TTarget`                         | The governed proxy instance wrapping the target object. |
| `useStore`      | `UseBoundStore<StoreApi<TStore>>` | The bound Zustand store hook.                           |

#### `createProxyStore()`

```typescript
export function createProxyStore<TTarget extends object, TStore extends object>(
  config: ProxyStoreConfig<TTarget, TStore>
): ProxyStoreResult<TTarget, TStore>;
```

---

### Local Persistence Middleware (`middleware.ts`)

Provides helper options for Zustand persistence.

#### `LocalPersistenceOptions<T>` Interface

Omit `name` and `storage` keys from standard Zustand `PersistOptions`.

| Property | Type     | Description                                                  |
| :------- | :------- | :----------------------------------------------------------- |
| `name`   | `string` | The unique name of the store (used for the cache file name). |

#### `createPersistenceConfig()`

Generates a persist configuration backed by an isolated MMKV instance.

```typescript
export function createPersistenceConfig<T>(
  options: LocalPersistenceOptions<T>
): PersistOptions<T, T>;
```

---

### Hydration React Hooks (`hooks.ts`)

#### `PersistApi<T>` Interface

Describes Zustand's persistence tracking capabilities.

```typescript
export interface PersistApi<T> {
  persist?: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: (state: T) => void) => () => void;
  };
}
```

#### `useHydration()`

Tracks hydration status of a persistent Zustand store.

```typescript
export function useHydration<T>(useStore: UseBoundStore<StoreApi<T>> & PersistApi<T>): boolean;
```

- **Returns**: `true` if the store does not use persistence or has finished hydrating; `false` otherwise.

---

### State Synchronization (`sync.ts`)

#### `syncStores()`

Synchronizes a specific slice of state from a source store to a target store.

```typescript
export function syncStores<TSource, TTarget, TSlice>(
  source: StoreApi<TSource>,
  target: StoreApi<TTarget>,
  selector: (state: TSource) => TSlice,
  setter: (targetState: TTarget, slice: TSlice) => Partial<TTarget> | void | null
): () => void;
```

- **Parameters**:
  - `source`: Source Zustand store.
  - `target`: Target Zustand store.
  - `selector`: Synchronous function returning the watched state slice.
  - `setter`: Function applying updates on the target store. If it returns a partial object, the target store will merge it. If it returns `null` or `void`, target updates must be handled manually inside the function body.
- **Returns**: Unsubscribe function to stop the synchronization bridge.

---

## 4. Explanation: Architectural & Mathematical Design

The State Synchronization and Middleware layer serves the Zoe 2030 Innovation Peak by ensuring **Local-First Reliability**, **Strict Isolation**, and **Cryptographic Governance** of local user data.

```
                  MUTATION & GOVERNANCE PIPELINE

    [ MUTATION ] ─────────────────────────┐
         │                                │
         ▼                                ▼
┌─────────────────┐             ┌──────────────────┐
│   ES6 Proxy     │             │ Membrane Context │
│ (Traps Set/Get) │             │  (Verifies Rule) │
└────────┬────────┘             └────────┬─────────┘
         │                               │
         │ (Optimistic syncToStore)      │ (Async execution verdict)
         ▼                               │
┌─────────────────┐              Allowed │ Denied (Rollback)
│  Zustand Store  │◄─────────────────────┴────────────┐
│ (Reactive State)│                                   │
└────────┬────────┘                                   ▼
         │                                      ┌───────────┐
         │ (Persists)                           │ Restore   │
         ▼                                      │ Original  │
┌─────────────────┐                             │ Value     │
│  MMKV Storage   │                             └───────────┘
│ (Isolated DB)   │
└─────────────────┘
```

### The Chatman Equation Mapping

This architecture corresponds directly to the Receipted Chatman Equation:

$$R \vdash A = \mu(O^*)$$

Where:

1. **$O^*$ (Lawful Closure Ontology)**: The target state object (e.g. `ProfileTarget`). The `ProxyableBridge` ensures that this object is never modified outside of the safety parameters of the application domain.
2. **$\mu$ (Transformation/Manufacturing Function)**: The proxy mutation trap. When code executes a set operation `proxy.name = 'New Name'`, the trap acts as the transformation function. It synchronously applies the update and immediately reports it through `onMutation`.
3. **$A$ (Emitted Consequence)**: The resulting Zustand state ($A$) which updates React Native views.
4. **$R$ (Receipt Lineage)**: The cryptographic receipt. After an optimistic write is applied, the Membrane evaluates safety interceptors in the background.
   - If validated, it issues an admissibility receipt $R$.
   - If denied, the Membrane triggers a rollback to the original state. This sends a secondary rollback mutation trap update to Zustand. This guarantees that $R \vdash A$ always holds true: **no state changes are committed in $A$ without a validating receipt in $R$**.

### Core Concepts & Rationale

#### ES6 Proxy-Backed Zustand Stores

Traditional state management systems either force complete immutability (which can introduce CPU and garbage collection bottlenecks in high-frequency React Native rendering) or mutable state (which lacks tracking and can lead to side effects).

Zoe resolves this through **governed proxies**:

- Developers mutate state using straightforward, mutable operations on the proxy object (e.g., `proxy.user = 'Bob'`).
- Under the hood, an ES6 Proxy traps the operation, optimistically updates the local state, and synchronizes the values to a Zustand store.
- Concurrently, the Membrane schedules validation checks. If a check fails, the proxy automatically rolls back target changes and notifies the store, maintaining UI consistency.

#### Multi-Instance MMKV Isolation

React Native's standard `AsyncStorage` is slow and runs on a separate bridge thread. Zoe uses `react-native-mmkv`, which communicates directly with JS via JSI (JavaScript Interface).

To prevent cross-tenant leakages (e.g., Volunteer data leaking into Pastor views), `createStorageAdapter` enforces strict instance isolation. Each store has an isolated MMKV binary file backed by a unique `storeId` (`framework-state-storage-${storeId}`).

### Design Trade-offs & Constraints

#### 1. Synchronous UI Updates vs Asynchronous Membrane Execution

To achieve high responsiveness, proxy stores sync to Zustand synchronously. However, Membrane interceptors and trajectory checks might require asynchronous cryptographic operations.

- **Trade-off**: The UI will temporarily show the optimistic update. If the Membrane later rejects the mutation, the state rolls back, causing a visible UI reset.
- **Constraint**: High-tension actions (like financial adjustments or authorization upgrades) should use manual verification steps rather than direct proxy properties.

#### 2. Synchronous Inter-Store Propagation

The `syncStores` helper listens to Zustand changes and propagates updates.

- **Warning**: Developers must avoid circular synchronizations (e.g., Store A updating Store B, which updates Store A). Circular dependencies will trigger recursive loops. The `syncStores` selector compares current and previous slices using `Object.is` to stop update cascades, but state mutations within the setter callback must be structured carefully to prevent stack overflows.
