# Zoe Synchronization, P2P, Delta Logs, and CRDT Layer

The Zoe Synchronization and P2P Replication layer provides local-first, offline-ready state persistence, transactional outbox management with cryptographic receipt chains, and decentralized peer-to-peer state sharing. It ensures eventual consistency across distributed devices through Conflict-Free Replicated Data Types (CRDTs), payload compression pipelines, and event-log playback capabilities.

This documentation describes the API contracts, architectural philosophy, and operational patterns of the sync layer, mapping its operation directly to the Zoe 2030 Innovation Peak and the Chatman Equation.

---

## 1. Tutorial: Getting Started with Offline-First State & P2P Replication

This tutorial guides you through setting up an offline-first data replication pipeline from scratch. You will:
1. Implement a custom offline job queue in memory.
2. Build a synchronization engine with conflict resolution and exponential backoff retry strategies.
3. Mutate states locally and push them asynchronously when online.
4. Establish P2P synchronization for decentralized state sharing.

### Prerequisites

Ensure you have the Zoe sync module types and classes available in your project paths. All imports are resolved relative to the `@truex/membrane-client` source tree.

---

### Step 1: Define Your Data Contract and Jobs

Create a file `todoJob.ts` to define the schema of your offline synchronization jobs. Offline jobs must extend the `SyncJobBase` interface.

```typescript
import { SyncJobBase } from '../../src/framework/sync/types';

// Define the payload structure for our offline task creation
export interface TodoPayload {
  taskId: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

// Define the sync job type
export interface TodoSyncJob extends SyncJobBase {
  jobType: 'create_todo' | 'update_todo';
  payload: string; // JSON-serialized TodoPayload
}
```

---

### Step 2: Implement a Sync Storage Adapter

The `FrameworkSyncEngine` requires a storage engine that implements the `SyncStorageAdapter` interface. In a production environment, this adapter writes to an SQLite database or MMKV. For learning purposes, we implement a reactive, in-memory queue adapter.

```typescript
import { SyncStorageAdapter } from '../../src/framework/sync/types';
import { TodoSyncJob } from './todoJob';

export class MemoryTodoStorageAdapter implements SyncStorageAdapter<TodoSyncJob> {
  private jobs: TodoSyncJob[] = [];
  private blockedEntityIds = new Set<string>();

  public async insertJob(
    job: Omit<TodoSyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>
  ): Promise<TodoSyncJob> {
    const newJob: TodoSyncJob = {
      ...job,
      id: Math.random().toString(36).substring(7),
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
    };
    this.jobs.push(newJob);
    return newJob;
  }

  public async updateJobStatus(
    id: TodoSyncJob['id'],
    status: TodoSyncJob['status'],
    attempts?: number
  ): Promise<void> {
    const job = this.jobs.find((j) => j.id === id);
    if (job) {
      job.status = status;
      if (attempts !== undefined) {
        job.attempts = attempts;
      }
    }
  }

  public async updateJob(
    id: TodoSyncJob['id'],
    updates: Partial<Omit<TodoSyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>>
  ): Promise<void> {
    const job = this.jobs.find((j) => j.id === id);
    if (job) {
      Object.assign(job, updates);
    }
  }

  public async deleteJob(id: TodoSyncJob['id']): Promise<void> {
    this.jobs = this.jobs.filter((j) => j.id !== id);
  }

  public async getReadyJobs(supportedJobTypes?: string[]): Promise<TodoSyncJob[]> {
    return this.jobs.filter(
      (job) =>
        job.status === 'pending' &&
        (!supportedJobTypes || supportedJobTypes.includes(job.jobType))
    );
  }

  public async getBlockedEntityIds(supportedJobTypes?: string[]): Promise<Set<string>> {
    return this.blockedEntityIds;
  }

  public blockEntity(entityId: string) {
    this.blockedEntityIds.add(entityId);
  }

  public unblockEntity(entityId: string) {
    this.blockedEntityIds.delete(entityId);
  }

  public async resetJobsStatus(
    fromStatus: TodoSyncJob['status'],
    toStatus: TodoSyncJob['status'],
    supportedJobTypes?: string[],
    resetAttempts?: boolean
  ): Promise<void> {
    this.jobs.forEach((job) => {
      if (
        job.status === fromStatus &&
        (!supportedJobTypes || supportedJobTypes.includes(job.jobType))
      ) {
        job.status = toStatus;
        if (resetAttempts) {
          job.attempts = 0;
        }
      }
    });
  }

  public async getQueueStatus(supportedJobTypes?: string[]) {
    const filtered = this.jobs.filter(
      (job) => !supportedJobTypes || supportedJobTypes.includes(job.jobType)
    );
    return {
      total: filtered.length,
      pending: filtered.filter((j) => j.status === 'pending').length,
      processing: filtered.filter((j) => j.status === 'processing').length,
      failed: filtered.filter((j) => j.status === 'failed').length,
      quarantined: filtered.filter((j) => j.status === 'quarantined').length,
      jobs: filtered,
    };
  }
}
```

---

### Step 3: Implement the Custom Sync Engine

Subclass the abstract `FrameworkSyncEngine` and define the custom remote mutation dispatch loop (`dispatchJob`).

```typescript
import { FrameworkSyncEngine } from '../../src/framework/sync/engine';
import { TodoSyncJob } from './todoJob';

export class TodoSyncEngine extends FrameworkSyncEngine<TodoSyncJob> {
  protected supportedJobTypes = ['create_todo', 'update_todo'];
  public simulatedNetworkSuccess = true;

  // Implement the dispatch logic to synchronize a single job with the remote server
  protected async dispatchJob(job: TodoSyncJob): Promise<void> {
    console.log(`[TodoSyncEngine] Dispatching job ${job.id} containing action: ${job.jobType}`);

    // Simulate network delay
    await this.delay(300);

    if (!this.simulatedNetworkSuccess) {
      throw new Error('Network Connection Error - Peer Host Unreachable');
    }

    const payload = JSON.parse(job.payload);
    console.log(`[TodoSyncEngine] Remote commit successful for entity: ${job.entityId}`, payload);
  }

  // Optional: Listen to lifecycle hooks
  protected onJobSuccess(job: TodoSyncJob) {
    console.log(`[TodoSyncEngine] Job successfully synced: ${job.id}`);
  }

  protected onJobFailure(job: TodoSyncJob, error: any) {
    console.error(`[TodoSyncEngine] Job failed: ${job.id}. Reason: ${error.message}`);
  }

  protected onJobQuarantined(job: TodoSyncJob, error: any) {
    console.warn(`[TodoSyncEngine] Job quarantined for administration review: ${job.id}`);
  }
}
```

---

### Step 4: Run the Sync Engine and Queue Jobs

Now, initialize your engine and queue sync tasks while controlling simulated network connectivity.

```typescript
import { MemoryTodoStorageAdapter } from './MemoryTodoStorageAdapter';
import { TodoSyncEngine } from './TodoSyncEngine';
import { TodoPayload } from './todoJob';

async function runDemo() {
  const adapter = new MemoryTodoStorageAdapter();
  
  // Configure the sync engine with retry policies and conflict callbacks
  const engine = new TodoSyncEngine(adapter, {
    retryStrategy: {
      maxAttempts: 3,
      backoffType: 'exponential',
      baseDelayMs: 200,
      maxDelayMs: 2000,
    },
    onConflict: ({ job, error }) => {
      console.log(`[Conflict Callback] Handling issue for job ${job.id}: ${error.message}`);
      // Discard, retry with modifications, or quarantine the job
      return { action: 'retry' };
    },
  });

  console.log('--- Step A: Network Online, Queueing Task ---');
  const todo: TodoPayload = {
    taskId: 'task-1',
    title: 'Design distributed database',
    description: 'Implement CRDT synchronization',
    isCompleted: false,
  };

  await engine.queueJob({
    jobType: 'create_todo',
    payload: JSON.stringify(todo),
    entityId: todo.taskId,
  });

  // Wait for processing loop to finish
  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log('Queue Status:', await engine.getQueueStatus());

  console.log('\n--- Step B: Network Offline, Queueing Another Task ---');
  engine.simulatedNetworkSuccess = false;

  await engine.queueJob({
    jobType: 'update_todo',
    payload: JSON.stringify({ ...todo, isCompleted: true }),
    entityId: todo.taskId,
  });

  // Wait for attempts to exhaust and quarantine to trigger
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log('Queue Status after failure:', await engine.getQueueStatus());

  console.log('\n--- Step C: Restore Network & Recovery ---');
  engine.simulatedNetworkSuccess = true;
  await engine.retryQuarantined();

  // Wait for processing to settle
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log('Final Queue Status:', await engine.getQueueStatus());
}

runDemo();
```

---

### Step 5: Establish P2P CRDT Synchronizations in React Native

To synchronize non-transactional visual states directly between surrounding devices over a mesh network (e.g. a shared counter or active editor cursor map), Zoe utilizes decentralized mesh adapters paired with React bindings.

Wrap your React Native application root in the `<MeshSyncProvider>` to expose the sync adapter workspace.

```tsx
import React from 'react';
import { SafeAreaView, Text } from 'react-native';
import { MeshSyncProvider } from '../../src/framework/sync/p2p/hooks';
import { TaskBoardCollaborators } from './TaskBoardCollaborators';

export default function App() {
  return (
    <MeshSyncProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', margin: 16 }}>
          Zoe Collaborative P2P Sandbox
        </Text>
        <TaskBoardCollaborators />
      </SafeAreaView>
    </MeshSyncProvider>
  );
}
```

Implement the `TaskBoardCollaborators` child component using the local CRDT hooks:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePNCounter } from '../../src/framework/sync/crdt/hooks';
import { useMeshSync } from '../../src/framework/sync/p2p/hooks';

export function TaskBoardCollaborators() {
  const localPeerId = 'device-peer-alice';

  // 1. Initialize a CRDT Positive-Negative Counter to track active collaborators
  const [collaboratorsCount, actions, mergeCounter] = usePNCounter(localPeerId, 0);

  // 2. Bind the CRDT instance to the P2P Mesh engine for auto-propagation
  const meshStatus = useMeshSync('mesh-collaborator-counter', {
    state: { p: {}, n: {} }, // Match interface shape
    merge: (otherState: any) => mergeCounter(otherState),
    toJSON: () => ({ p: {}, n: {} }), // Return serializable state
  } as any);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>P2P Mesh Network: {meshStatus.isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
      <Text style={styles.label}>Active Peers Found: {meshStatus.peers.length}</Text>
      <Text style={styles.counterText}>Collaborators Count: {collaboratorsCount}</Text>
      
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={() => actions.increment(1)}>
          <Text style={styles.btnText}>Join Session (+)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => actions.decrement(1)}>
          <Text style={styles.btnText}>Leave Session (-)</Text>
        </TouchableOpacity>
      </View>
      {meshStatus.lastSyncTimestamp && (
        <Text style={styles.timeText}>
          Last Synced: {new Date(meshStatus.lastSyncTimestamp).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  counterText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#4f46e5',
    borderRadius: 6,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
});
```

---

## 2. How-To Guide: Implementing an Offline-First Collaborative Task Board

This guide demonstrates how to configure and execute a production-grade, collaborative offline task board using **payload compression**, **cryptographic outbox receipt verification**, and **event replay tracking**.

The implementation handles:
* Local queue caching.
* Background batch dispatch loops.
* Automatic data payload compression/decompression based on size threshold settings.
* Cryptographic signature chaining to enforce local-first trust boundaries.
* Real-time status views displaying queue and outbox operations.

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import crypto from 'crypto';

// ----------------------------------------------------
// 1. Types & Data Interfaces
// ----------------------------------------------------
import { SyncJobBase, SyncStorageAdapter, ConflictResolutionResult } from '../../src/framework/sync/types';
import { FrameworkSyncEngine } from '../../src/framework/sync/engine';
import { FrameworkOutboxManager } from '../../src/framework/sync/outbox';
import { usePayloadCompression } from '../../src/framework/sync/compression/usePayloadCompression';

interface TaskPayload {
  id: string;
  name: string;
  assignedTo: string;
  timestamp: number;
}

interface TaskSyncJob extends SyncJobBase {
  jobType: 'upsert_task';
  payload: string; // Compressed or raw JSON TaskPayload
}

interface LogEntry {
  message: string;
  timestamp: string;
}

// ----------------------------------------------------
// 2. Memory Storage Adapter with Hook Hookups
// ----------------------------------------------------
class ReactiveStorageAdapter implements SyncStorageAdapter<TaskSyncJob> {
  private jobs: TaskSyncJob[] = [];
  private onQueueUpdate: () => void;

  constructor(onQueueUpdate: () => void) {
    this.onQueueUpdate = onQueueUpdate;
  }

  public async insertJob(
    job: Omit<TaskSyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>
  ): Promise<TaskSyncJob> {
    const newJob: TaskSyncJob = {
      ...job,
      id: `job_${Math.random().toString(36).substring(7)}`,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
    };
    this.jobs.push(newJob);
    this.onQueueUpdate();
    return newJob;
  }

  public async updateJobStatus(
    id: TaskSyncJob['id'],
    status: TaskSyncJob['status'],
    attempts?: number
  ): Promise<void> {
    const job = this.jobs.find((j) => j.id === id);
    if (job) {
      job.status = status;
      if (attempts !== undefined) {
        job.attempts = attempts;
      }
      this.onQueueUpdate();
    }
  }

  public async updateJob(
    id: TaskSyncJob['id'],
    updates: Partial<Omit<TaskSyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>>
  ): Promise<void> {
    const job = this.jobs.find((j) => j.id === id);
    if (job) {
      Object.assign(job, updates);
      this.onQueueUpdate();
    }
  }

  public async deleteJob(id: TaskSyncJob['id']): Promise<void> {
    this.jobs = this.jobs.filter((j) => j.id !== id);
    this.onQueueUpdate();
  }

  public async getReadyJobs(supportedJobTypes?: string[]): Promise<TaskSyncJob[]> {
    return this.jobs.filter(
      (job) =>
        job.status === 'pending' &&
        (!supportedJobTypes || supportedJobTypes.includes(job.jobType))
    );
  }

  public async getBlockedEntityIds(): Promise<Set<string>> {
    return new Set<string>();
  }

  public async resetJobsStatus(
    fromStatus: TaskSyncJob['status'],
    toStatus: TaskSyncJob['status'],
    supportedJobTypes?: string[],
    resetAttempts?: boolean
  ): Promise<void> {
    this.jobs.forEach((job) => {
      if (
        job.status === fromStatus &&
        (!supportedJobTypes || supportedJobTypes.includes(job.jobType))
      ) {
        job.status = toStatus;
        if (resetAttempts) {
          job.attempts = 0;
        }
      }
    });
    this.onQueueUpdate();
  }

  public async getQueueStatus(supportedJobTypes?: string[]) {
    const filtered = this.jobs.filter(
      (job) => !supportedJobTypes || supportedJobTypes.includes(job.jobType)
    );
    return {
      total: filtered.length,
      pending: filtered.filter((j) => j.status === 'pending').length,
      processing: filtered.filter((j) => j.status === 'processing').length,
      failed: filtered.filter((j) => j.status === 'failed').length,
      quarantined: filtered.filter((j) => j.status === 'quarantined').length,
      jobs: [...filtered],
    };
  }
}

// ----------------------------------------------------
// 3. Collaborative Outbox Screen Component
// ----------------------------------------------------
export function CollaborativeTaskBoard() {
  const [taskName, setTaskName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [queueJobs, setQueueJobs] = useState<TaskSyncJob[]>([]);
  const [receiptCount, setReceiptCount] = useState(0);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [
      { message, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  }, []);

  // 1. Initialize Payload Compression hooks
  const { compress, decompress } = usePayloadCompression({
    algorithm: compressionEnabled ? 'zlib' : 'none',
    threshold: 30, // Compress payloads larger than 30 characters
  });

  // 2. Initialize Cryptographic Outbox Manager to chain mutation records
  const outboxManager = useMemo(() => new FrameworkOutboxManager(), []);

  // Triggered when storage structure transitions state
  const handleQueueUpdate = useCallback(() => {
    if (syncEngineRef.current) {
      syncEngineRef.current.getQueueStatus().then((status) => {
        setQueueJobs(status.jobs);
      });
    }
  }, []);

  const storageAdapter = useMemo(() => new ReactiveStorageAdapter(handleQueueUpdate), [handleQueueUpdate]);

  // 3. Subclass FrameworkSyncEngine
  const syncEngineRef = React.useRef<FrameworkSyncEngine<TaskSyncJob> | null>(null);

  useEffect(() => {
    class BoardSyncEngine extends FrameworkSyncEngine<TaskSyncJob> {
      protected supportedJobTypes = ['upsert_task'];

      protected async dispatchJob(job: TaskSyncJob): Promise<void> {
        addLog(`[Engine] Initiating dispatch for Job ${job.id}`);
        await this.delay(400); // Simulate network latency

        if (!networkOnline) {
          throw new Error('Kernel server unreachable');
        }

        // Decompress the payload dynamically
        const decompressed = await decompress(job.payload);
        const parsed = JSON.parse(decompressed) as TaskPayload;

        addLog(`[Engine] Successfully Synced task ID: ${parsed.id} ("${parsed.name}")`);
      }

      protected onJobSuccess(job: TaskSyncJob) {
        addLog(`[Engine] Job ${job.id} removed from queue (commit completed)`);
      }

      protected onJobFailure(job: TaskSyncJob, error: any) {
        addLog(`[Engine] Failed processing job ${job.id}: ${error.message}`);
      }

      protected onJobQuarantined(job: TaskSyncJob, error: any) {
        addLog(`[Engine] Job ${job.id} QUARANTINED due to persistent failure`);
      }
    }

    syncEngineRef.current = new BoardSyncEngine(storageAdapter, {
      retryStrategy: {
        maxAttempts: 2,
        backoffType: 'linear',
        baseDelayMs: 200,
      },
    });

    handleQueueUpdate();
  }, [storageAdapter, networkOnline, decompress, addLog, handleQueueUpdate]);

  // 4. Handle Submitting Task Intent
  const handleAddTask = async () => {
    if (!taskName || !assignee) return;

    const task: TaskPayload = {
      id: `task_${Math.random().toString(36).substring(7)}`,
      name: taskName,
      assignedTo: assignee,
      timestamp: Date.now(),
    };

    const serializedPayload = JSON.stringify(task);

    // Compress the payload if it meets criteria
    const preparedPayload = await compress(serializedPayload);
    const isCompressed = preparedPayload !== serializedPayload;

    addLog(`[Outbox] Enqueueing Task. Compressed: ${isCompressed ? 'YES' : 'NO'}`);

    // Track Transaction Outbox Delta & generate cryptographic signature link
    outboxManager.enqueue(
      {
        subject: task.id,
        predicate: 'assigned_to',
        object: task.assignedTo,
        timestamp: task.timestamp,
      },
      { receipts: true },
      false // Flush immediately to generate receipt chain
    );

    setReceiptCount(outboxManager.getReceiptCount());

    // Submit Job to standard Pre-Admission Persistence Loop
    if (syncEngineRef.current) {
      await syncEngineRef.current.queueJob({
        jobType: 'upsert_task',
        payload: preparedPayload,
        entityId: task.id,
      });
    }

    setTaskName('');
    setAssignee('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Collaborative Task Board</Text>

      {/* Network & Config Controls */}
      <View style={styles.configCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Simulated Connection Status:</Text>
          <Text style={[styles.statusText, networkOnline ? styles.online : styles.offline]}>
            {networkOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Network Switch:</Text>
          <Switch value={networkOnline} onValueChange={setNetworkOnline} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payload Compression (Zlib/Brotli):</Text>
          <Switch value={compressionEnabled} onValueChange={setCompressionEnabled} />
        </View>
      </View>

      {/* Task Intake Form */}
      <View style={styles.formCard}>
        <TextInput
          placeholder="Enter Task Title"
          value={taskName}
          onChangeText={setTaskName}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
        <TextInput
          placeholder="Enter Assignee Name"
          value={assignee}
          onChangeText={setAssignee}
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.submitBtn} onPress={handleAddTask}>
          <Text style={styles.submitBtnText}>Submit Task</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Queue Status */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sync Queue Jobs ({queueJobs.length})</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => syncEngineRef.current?.retryQuarantined()}
          >
            <Text style={styles.retryBtnText}>Retry Quarantined</Text>
          </TouchableOpacity>
        </View>

        {queueJobs.length === 0 ? (
          <Text style={styles.emptyText}>No pending transactions in local storage</Text>
        ) : (
          queueJobs.map((job) => (
            <View key={job.id} style={styles.jobRow}>
              <View>
                <Text style={styles.jobId}>ID: {job.id}</Text>
                <Text style={styles.jobDetails}>
                  Attempts: {job.attempts} | Entity: {job.entityId}
                </Text>
              </View>
              <Text style={[styles.badge, styles[job.status]]}>{job.status.toUpperCase()}</Text>
            </View>
          ))
        )}
      </View>

      {/* Verification Ledger */}
      <View style={styles.receiptCard}>
        <Text style={styles.sectionTitle}>Verification Ledger</Text>
        <Text style={styles.receiptCount}>
          Cryptographic Outbox Receipts Chained: <Text style={styles.bold}>{receiptCount}</Text>
        </Text>
        <Text style={styles.caption}>
          Each mutation creates a cryptographic receipt hash linked back to the genesis block.
        </Text>
      </View>

      {/* Log Terminal console */}
      <View style={styles.consoleCard}>
        <Text style={styles.consoleTitle}>Telemetry Terminal Output</Text>
        <ScrollView nestedScrollEnabled style={styles.consoleLogScroll}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.consoleText}>
              [{log.timestamp}] {log.message}
            </Text>
          ))}
          {logs.length === 0 && <Text style={styles.consoleText}>Awaiting operations...</Text>}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
    color: '#818cf8',
  },
  configCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  online: {
    color: '#4ade80',
  },
  offline: {
    color: '#f87171',
  },
  formCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  submitBtn: {
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  retryBtn: {
    backgroundColor: '#475569',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  retryBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 10,
  },
  jobId: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 13,
  },
  jobDetails: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  pending: {
    backgroundColor: '#eab308',
    color: '#0f172a',
  },
  processing: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  failed: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  },
  quarantined: {
    backgroundColor: '#ec4899',
    color: '#ffffff',
  },
  receiptCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  receiptCount: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 8,
  },
  caption: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 6,
  },
  consoleCard: {
    backgroundColor: '#020617',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
  },
  consoleTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  consoleLogScroll: {
    height: 150,
  },
  consoleText: {
    color: '#a7f3d0',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
});
```

---

## 3. Reference Guide: API Schema & Module File Structure

This section outlines the layout of the source files in the codebase, followed by the interfaces and properties of the synchronization layer modules.

### Workspace Directory Layout

The sync framework source files are structured as follows:

*   [index.ts](file:///Users/sac/zoeapp/src/framework/sync/index.ts) - Top-level module aggregator and core API exports.
*   [types.ts](file:///Users/sac/zoeapp/src/framework/sync/types.ts) - Schema specifications for database jobs, outbox state mutations, and storage interfaces.
*   [engine.ts](file:///Users/sac/zoeapp/src/framework/sync/engine.ts) - Base orchestrator class handling transaction pushes, batch logic, entity locking, and retries.
*   [outbox.ts](file:///Users/sac/zoeapp/src/framework/sync/outbox.ts) - Accumulator for delta tracking and generation of cryptographic hash linkages.
*   [compression/index.ts](file:///Users/sac/zoeapp/src/framework/sync/compression/index.ts) - Aggregator exporting compression interfaces and hooks.
*   [compression/types.ts](file:///Users/sac/zoeapp/src/framework/sync/compression/types.ts) - Type contracts for Brotli, Zlib, and None compression strategies.
*   [compression/strategies.ts](file:///Users/sac/zoeapp/src/framework/sync/compression/strategies.ts) - Implementations of mock and native compression encoders.
*   [compression/usePayloadCompression.ts](file:///Users/sac/zoeapp/src/framework/sync/compression/usePayloadCompression.ts) - Context-free React hook for dynamic string payload compression.
*   [crdt/index.ts](file:///Users/sac/zoeapp/src/framework/sync/crdt/index.ts) - CRDT entry module.
*   [crdt/types.ts](file:///Users/sac/zoeapp/src/framework/sync/crdt/types.ts) - State interfaces for registers, counters, sets, and maps.
*   [crdt/register.ts](file:///Users/sac/zoeapp/src/framework/sync/crdt/register.ts) - Monotone Last-Write-Wins Register.
*   [crdt/counter.ts](file:///Users/sac/zoeapp/src/framework/sync/crdt/counter.ts) - Grow-Only Counter (G-Counter) and Positive-Negative Counter (PN-Counter).
*   [crdt/map.ts](file:///Users/sac/zoeapp/src/framework/sync/crdt/map.ts) - Monotone Last-Write-Wins Map collection.
*   [crdt/hooks.ts](file:///Users/sac/zoeapp/src/framework/sync/crdt/hooks.ts) - Specialized React state sync hooks (`useLWWRegister`, `usePNCounter`, `useLWWMap`).
*   [p2p/index.ts](file:///Users/sac/zoeapp/src/framework/sync/p2p/index.ts) - P2P Mesh synchronization aggregator.
*   [p2p/types.ts](file:///Users/sac/zoeapp/src/framework/sync/p2p/types.ts) - Network adapter definitions and messaging structures.
*   [p2p/adapter.ts](file:///Users/sac/zoeapp/src/framework/sync/p2p/adapter.ts) - Stub and network transport interfaces for peer discovery.
*   [p2p/engine.ts](file:///Users/sac/zoeapp/src/framework/sync/p2p/engine.ts) - Sync state/delta message broadcaster.
*   [p2p/hooks.tsx](file:///Users/sac/zoeapp/src/framework/sync/p2p/hooks.tsx) - Mesh network providers and peer subscription React hooks.
*   [replay/index.ts](file:///Users/sac/zoeapp/src/framework/sync/replay/index.ts) - Replay debugger aggregator.
*   [replay/types.ts](file:///Users/sac/zoeapp/src/framework/sync/replay/types.ts) - Time-travel queue event snapshots.
*   [replay/manager.ts](file:///Users/sac/zoeapp/src/framework/sync/replay/manager.ts) - Event log manager for recording queue histories.
*   [replay/useSyncReplay.ts](file:///Users/sac/zoeapp/src/framework/sync/replay/useSyncReplay.ts) - State hooks driving step-by-step debugger playback.
*   [replay/SyncReplayDebugger.tsx](file:///Users/sac/zoeapp/src/framework/sync/replay/SyncReplayDebugger.tsx) - Time-travel debugger user interface.

---

### Core Sync Queue API

#### Interface: `SyncJobBase`
The structural baseline for any task inserted into the transaction queue.
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `id` | `string \| number` | Unique identifier generated for the job in storage. |
| `jobType` | `string` | Tag designating the target endpoint or mutation mutation. |
| `payload` | `string` | Serialized parameter variables (can be compressed). |
| `status` | `'pending' \| 'processing' \| 'failed' \| 'quarantined'` | The current transactional workflow state. |
| `attempts` | `number` | The number of failed execution attempts. Used for retry algorithms. |
| `entityId` | `string \| null` | Logical identifier for lock-ordering checks (blocks serial queue executions on matching keys). |
| `createdAt` | `Date` | Timestamp recording job insertion time. |

#### Interface: `RetryStrategy`
Configures engine delays between execution attempts of failing jobs.
*   `maxAttempts`: `number` - Number of failures permitted before transitioning a job to `quarantined`.
*   `backoffType`: `'fixed' | 'linear' | 'exponential'` - Algorithm used to calculate delayed execution intervals.
*   `baseDelayMs`: `number` - The base multiplier delay in milliseconds.
*   `maxDelayMs` *(Optional)*: `number` - Maximum delay upper-bound.

#### Interface: `SyncStorageAdapter<TJob extends SyncJobBase>`
Implement this interface to bind database engines (e.g. Drizzle SQLite or MMKV instances) to the sync loop.
*   `insertJob(job: Omit<TJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<TJob>` - Pushes job data onto local storage.
*   `updateJobStatus(id: TJob['id'], status: TJob['status'], attempts?: number): Promise<void>` - Updates job status and increments attempts.
*   `updateJob(id: TJob['id'], updates: Partial<Omit<TJob, 'id' | 'status' | 'attempts' | 'createdAt'>>): Promise<void>` - Mutates the payload or internal fields of a pending job.
*   `deleteJob(id: TJob['id']): Promise<void>` - Removes a successful job from the database.
*   `getReadyJobs(supportedJobTypes?: string[]): Promise<TJob[]>` - Queries pending transactions that match engine job tags.
*   `getBlockedEntityIds(supportedJobTypes?: string[]): Promise<Set<string>>` - Fetches keys locked by active processing threads.
*   `resetJobsStatus(...)` - Resets statuses to allow re-evaluation (e.g. recovering crashed jobs).
*   `getQueueStatus(supportedJobTypes?: string[]): Promise<{ total, pending, processing, failed, quarantined, jobs: TJob[] }>` - Returns active statistics.

---

### CRDT Module APIs

#### Class: `LWWRegister<T>`
Last-Write-Wins Register. Merges updates monotonically, prioritizing higher timestamps.
*   `constructor(peerId: string, initialValue: T, timestamp?: number)`
*   `state`: `LWWRegisterState<T>` - Returns `{ value, timestamp, peerId }`.
*   `value`: `T` - Getter and setter for the payload.
*   `set(value: T, timestamp?: number): void` - Updates the register value. Ensures `timestamp` is greater than or equal to `current.timestamp + 1`.
*   `merge(other: LWWRegisterState<T>): void` - Evaluates current state against incoming peer updates. Updates the local value if the incoming state timestamp is higher (or if timestamps match and the peer ID is lexicographically greater).

#### Class: `PNCounter`
Positive-Negative Counter. Tracks increments and decrements separately to ensure commutativity.
*   `constructor(peerId: string, initialState?: PNCounterState)`
*   `value`: `number` - Computed as `p.value - n.value`.
*   `increment(amount?: number): void` - Increments the local peer's value in the positive counter state.
*   `decrement(amount?: number): void` - Increments the local peer's value in the negative counter state.
*   `merge(other: PNCounterState): void` - Merges positive and negative counter maps by taking the maximum value for each peer.

#### Class: `LWWMap<V>`
An object-like state collection of named properties mapped to individual `LWWRegister` instances.
*   `constructor(peerId: string, initialState?: LWWMapState<V>)`
*   `set(key: string, value: V): void` - Assigns a property. Instantiates a new Last-Write-Wins Register if the key does not exist.
*   `get(key: string): V | undefined` - Fetches the value.
*   `delete(key: string): void` - Purges the property register.
*   `merge(other: LWWMapState<V>): void` - Merges registers for matching keys, adding missing keys from the incoming map.

---

### React Hooks APIs

#### Hook: `useCrdtState`
Connects CRDT merges to component lifecycle renders.
```typescript
export function useCrdtState<TState, TDelta, TCRDT extends CRDT<TState, TDelta>, TValue>(
  factory: (peerId: string, initialState?: TState) => TCRDT,
  peerId: string,
  initialState?: TState,
  getValue?: (crdt: TCRDT) => TValue
): [TValue, TCRDT, (other: TState | TDelta) => void, () => void];
```
*   **Returns**: `[value, crdtInstance, mergeCallback, forceUpdateCallback]`.

#### Hook: `useLWWRegister`
Specialized hook for managing Last-Write-Wins register hooks.
*   `useLWWRegister<T>(peerId: string, initialValue: T): [T, (val: T) => void, (state: LWWRegisterState<T>) => void]`

#### Hook: `usePNCounter`
Specialized hook for managing PN-Counters.
*   `usePNCounter(peerId: string, initialValue?: number): [number, { increment, decrement }, (state: PNCounterState) => void]`

#### Hook: `useLWWMap`
Specialized hook for managing LWW-Maps.
*   `useLWWMap<V>(peerId: string, initialState?: LWWMapState<V>): [LWWMapState<V>, { set, delete, get }, (state: LWWMapState<V>) => void]`

---

### P2P mesh Networking

#### Interface: `MeshNetworkAdapter`
Enables plugging in WebRTC, mDNS local discovery, or Bluetooth network engines.
*   `start(): Promise<void>` - Starts peer discovery and initializes connection handlers.
*   `stop(): Promise<void>` - Closes active network connections.
*   `broadcast(message: MeshMessage): Promise<void>` - Sends an envelope payload to all discovered peers.
*   `sendTo(peerId: string, message: MeshMessage): Promise<void>` - Transmits an envelope payload to a specific peer.
*   `onMessage(callback: (message: MeshMessage) => void): () => void` - Registers message listener callbacks.
*   `onPeerFound(callback: (peer: Peer) => void): () => void` - Listens for new peers joining the network.
*   `onPeerLost(callback: (peerId: string) => void): () => void` - Listens for peers disconnecting.

#### Hook: `useMeshSync`
Integrates P2P Mesh sync loops into React Native components.
*   `useMeshSync(id: string, crdt: CRDT<any, any>): MeshSyncState`
*   **Returns**: `{ peers: Peer[], isOnline: boolean, lastSyncTimestamp: number | null }`.

---

## 4. Explanation: Architecture, Concurrency, and Philosophy

### Architectural Overview

The Zoe Framework Synchronization module utilizes a dual-path replication architecture to support local-first offline applications. This design separates transactional, network-bound operations from peer-to-peer visual updates:

```
                            +----------------------------------------+
                            |            Zoe UI Component            |
                            +----+------------------------------+----+
                                 |                              |
      [Path 1: Transactional Outbox]                [Path 2: Real-time P2P Mesh]
                                 |                              |
                                 v                              v
                    +------------+-----------+      +-----------+-----------+
                    |  FrameworkOutboxManager |      |     useMeshSync Hook   |
                    +------------+-----------+      +-----------+-----------+
                                 |                              |
                                 v                              v
                    +------------+-----------+      +-----------+-----------+
                    |   FrameworkSyncEngine  |      |   MeshSyncEngineImpl  |
                    +------------+-----------+      +-----------+-----------+
                                 |                              |
                                 v                              v
                    +------------+-----------+      +-----------+-----------+
                    | SQLite Transaction DB  |      |   MeshNetworkAdapter  |
                    +------------------------+      +-----------+-----------+
                                                                |
                                                                v
                                                       WebRTC / BLE / mDNS
```

1.  **Path 1: The Transactional Outbox (Write Ahead Lineage)**:
    Handles core user mutations (e.g. updating schedules, checking off tasks). Mutations are appended to a queue in local storage and dispatched asynchronously to the kernel server. This path uses retry strategies and conflict resolution callbacks to guarantee delivery.
2.  **Path 2: The P2P Mesh (Decentralized CRDT Sync)**:
    Propagates visual states (e.g. presence indictors, active selections) directly between devices over local networks (WebRTC, BLE, or UDP), bypassing the central server. It uses Conflict-Free Replicated Data Types (CRDTs) to merge conflicting states deterministically.

---

### Philosophical Integration: The Chatman Equation

The synchronization system implements the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where the system variables map to the client-side architecture as follows:

*   **$O^*$ (Lawful Closure Ontology)**: The local ground truth state. This represents the local SQLite database state, pending sync logs, and active CRDT states (`LWWMapState`, `PNCounterState`).
*   **$\mu$ (Manufacturing / Propagation Function)**: The transport pipeline. It serializes, compresses, and routes local state changes. This is managed by the `FrameworkSyncEngine` and `MeshSyncEngine` dispatch loops.
*   **$A$ (Operational Consequence / Avatar Projection)**: The updated visual display rendered in the client UI.
*   **$R$ (Receipt Lineage)**: Cryptographic proofs of execution. The `FrameworkOutboxManager` generates SHA256 hashes linking input states, output outcomes, and previous receipts to form a tamper-proof receipt chain. Consequence $A$ is unlocked in the user interface once a matching remote or local receipt $R$ is verified.

---

### Monotone Time in CRDTs

Standard wall-clock timestamps are subject to network latency, local clock drift, and manual user system time modifications. To maintain ordering across asynchronous peers without a central coordinator, Zoe enforces monotone clock updates on Last-Write-Wins (LWW) registers:

```typescript
const finalTimestamp = Math.max(timestamp, this._state.timestamp + 1);
```

This mathematical guard ensures that:
*   Local updates generated on a single device are ordered monotonically, even if the system clock drifts backwards.
*   State updates are commutative, associative, and idempotent:
    $$A \cup B = B \cup A$$
    $$(A \cup B) \cup C = A \cup (B \cup C)$$
    $$A \cup A = A$$
*   If two updates arrive with identical timestamps, conflicts are resolved deterministically using lexicographical comparison of the peer IDs (`peerIdA > peerIdB`).

---

### Concurrency and Entity Locking

In high-concurrency, offline-first environments, out-of-order execution of queued operations can cause state inconsistencies. If a user modifies the same task multiple times while offline, executing these actions out of order on the server will corrupt the data.

Zoe resolves this through **Entity-Level Locking**:

```typescript
const availableJobs = jobs.filter((job) => {
  if (!job.entityId) return true;
  return !this.activeEntityIds.has(job.entityId) && !blockedEntityIds.has(job.entityId);
});
```

*   **Entity ID Assignment**: Every job targeting a resource specifies an `entityId` (e.g. `task_101`).
*   **Serial Execution**: While `job_A` for `task_101` is processing, any subsequent `job_B` for `task_101` is blocked from executing.
*   **Concurrency Isolation**: Jobs targeting different entity IDs (e.g. `task_999`) are executed in parallel, maintaining high throughput without risking out-of-order mutations on the same resource.

---

### Data Compression & Network Latency Trade-Offs

To optimize battery usage and payload transmission sizes, Zoe uses a dynamic compression layer supporting Zlib and Brotli algorithms. This involves a trade-off between client CPU cycles and network payload size:

*   **Small Payloads**: Under 30-100 bytes, compression overhead (additional CPU cycles and base64 encoding headers) exceeds the network transit cost. For these, the engine defaults to raw JSON payloads.
*   **Large Payloads**: For payloads exceeding the configured size threshold, compression is applied. This reduces network packet sizes and payload delivery latency.

---

### Outbox Receipt Cryptographic Chain of Custody

The outbox receipt chain forms a local hash chain of state mutations. The signature generation formula is:

$$H_n = \text{SHA256}(H_{n-1} \mathbin{\Vert} \text{Hash}(I_n) \mathbin{\Vert} \text{Hash}(O_n) \mathbin{\Vert} \text{Hash}(D_n))$$

Where:
*   $H_{n-1}$ is the signature of the previous transaction.
*   $I_n$ is the input transaction state.
*   $O_n$ is the output state representation.
*   $D_n$ is the delta mutation metadata.

This cryptographic lineage ensures that local operations cannot be modified or reordered after creation. The receipt chain is validated against the server ledger during synchronization to detect tamper attempts. If validation fails, the sync engine isolates the affected operations in the quarantined queue for manual intervention.
