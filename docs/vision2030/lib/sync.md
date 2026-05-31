# Drizzle-SQLite Sync Outbox Library (`src/lib/sync`)

The Drizzle-SQLite Sync Outbox library, located in [syncEngine.ts](file:///Users/sac/zoeapp/src/lib/sync/syncEngine.ts), is a specialized, production-ready implementation of the offline-first `FrameworkSyncEngine` pattern designed specifically for the Truex platform. It uses Drizzle ORM and SQLite as its persistent transactional outbox store to queue, process, serialize, and retry server mutation requests in degraded or disconnected network states.

---

## 1. Overview

In offline-first architectures, state mutations triggered by users must be captured immediately, persisted locally to survive application restarts, and synced to remote gateways in a reliable, in-order manner once connectivity is restored.

The `src/lib/sync` library bridges the framework-level abstract sync patterns and the concrete application database schema by providing:
1. **`DrizzleSyncStorageAdapter`**: A high-performance storage adapter that interfaces directly with Drizzle ORM and SQLite. It provides atomic CRUD operations for the queue, queries pending jobs in a First-In-First-Out (FIFO) manner, and implements blocklists for entity serializations.
2. **`SyncEngine`**: An abstract engine subclass that defaults to using `DrizzleSyncStorageAdapter` to manage FIFO processing queues, poison-pill quarantine handling, and linear/exponential retry backoffs.
3. **Concurrent Serialization Keying**: Serialization based on `entityId` to prevent race conditions or out-of-order execution when multiple updates target the same resource, blocking subsequent tasks until the initial tasks complete.

---

## 2. Architectural & Philosophical Mapping

The `src/lib/sync` library serves as a critical gateway in the **Truex Collaborative Substrate**. It directly coordinates with the four core architectural pillars and maps to the mathematical proof of the **Receipted Chatman Equation**.

### 2.1 Mappings to the Truex Execution Pillars
* **Intake**: Incoming mutation payloads (e.g. database updates, API operations) are admitted into the local system and written to the SQLite transaction log via `queueJob`. This guarantees that user intents are captured in a valid local state before remote transmission.
* **Membrane**: The Drizzle-backed SQLite outbox table (`sync_queue`) serves as the local execution membrane. It isolates the user-facing interface from remote API availability, ensuring the UI remains responsive, interactive, and consistent even during complete network partitions.
* **Projection**: Once jobs are successfully dispatched and verified by the remote server, they are deleted from the local outbox. Any resulting server state changes are projected back to the application and synchronized with local models.
* **Supervision**: Stuck processing tasks are detected and repaired using `recoverStuckJobs`. Poison-pill transactions are isolated using the quarantine engine after failing a specified threshold of attempts (`maxAttempts`), ensuring active supervision of state hygiene.

### 2.2 Alignment with the Receipted Chatman Equation

The execution pipeline operates in accordance with the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where:
* **$O^*$ (Lawful Closure Ontology)**: Represents the set of locally queued operations persisted in the `syncQueue` SQLite table. It defines the valid, closed boundaries of user operations pending synchronization.
* **$\mu$ (Manufacturing / Propagation Function)**: The `SyncEngine.pushChanges()` execution loop. It sequentially processes jobs, enforces concurrency limits per `entityId`, handles backoffs/delays, and dispatches requests.
* **$A$ (Operational Consequence)**: The resulting server changes that alter authoritative records, which eventually reflect back to the UI.
* **$R$ (Receipt Lineage)**: The deletion/cleanup of successfully dispatched jobs, updates to attempt counters, and the tracking of job states (`pending` -> `processing` -> `deleted`/`quarantined`), providing a local lineage trace verifying which intents were safely transmitted or isolated.

---

## 3. Source Code Structure

The library contains the following files in its directory structure:

* **[syncEngine.ts](file:///Users/sac/zoeapp/src/lib/sync/syncEngine.ts)**:
  Exposes `DrizzleSyncStorageAdapter`, the global `defaultStorageAdapter` singleton, and the abstract `SyncEngine` base class.
* **[__tests__/syncEngine.test.ts](file:///Users/sac/zoeapp/src/lib/sync/__tests__/syncEngine.test.ts)**:
  A comprehensive suite of unit tests validating the database interactions, batch queuing, concurrent entity serialization, and retry logic.

### Related Schema Definition
* **[schema.ts](file:///Users/sac/zoeapp/src/lib/db/schema.ts)**:
  Defines the `syncQueue` Drizzle table structure containing the database columns (`id`, `jobType`, `payload`, `status`, `attempts`, `entityId`, `createdAt`).

---

## 4. Public Interfaces & API Contracts

### 4.1 `DrizzleSyncStorageAdapter`

Implements the framework-defined `SyncStorageAdapter<SyncJob>` contract using Drizzle ORM.

#### Methods

* **`insertJob(job: Omit<SyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<SyncJob>`**
  Inserts a new job record into the `sync_queue` table.
  * *Parameters*: `job` object with `jobType`, `payload`, and optional `entityId`.
  * *Returns*: The newly created, fully-populated `SyncJob` record.

* **`updateJobStatus(id: number, status: SyncJob['status'], attempts?: number): Promise<void>`**
  Updates the `status` and optionally the `attempts` count of a job.
  * *Parameters*: `id` (the job's primary key), `status` (new state), `attempts` (optional current attempt count).

* **`updateJob(id: number, updates: Partial<Omit<SyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>>): Promise<void>`**
  Updates arbitrary fields of a job record in the database (e.g. payload modifications during conflict resolution).
  * *Parameters*: `id`, `updates` object.

* **`deleteJob(id: number): Promise<void>`**
  Deletes a successfully processed job from the database.
  * *Parameters*: `id`.

* **`getReadyJobs(supportedJobTypes?: string[]): Promise<SyncJob[]>`**
  Queries all jobs in the database with status `'pending'` or `'failed'`, ordered in ascending order of their IDs (FIFO).
  * *Parameters*: `supportedJobTypes` (optional string array to filter specific job types).
  * *Returns*: Array of matching `SyncJob` records.

* **`getBlockedEntityIds(supportedJobTypes?: string[]): Promise<Set<string>>`**
  Retrieves a set of all `entityId` values that are currently locked by a job with status `'quarantined'` or `'processing'`. This prevents subsequent updates on the same entity from executing until the prior blocking job is cleared.
  * *Parameters*: `supportedJobTypes` (optional filter).
  * *Returns*: A `Set` of blocked entity IDs.

* **`resetJobsStatus(fromStatus: SyncJob['status'], toStatus: SyncJob['status'], supportedJobTypes?: string[], resetAttempts?: boolean): Promise<void>`**
  Bulk-updates jobs from one status to another. Commonly used when retrying quarantined jobs or recovering from stuck processing runs.
  * *Parameters*: `fromStatus`, `toStatus`, `supportedJobTypes` (optional), `resetAttempts` (optional boolean).

* **`getQueueStatus(supportedJobTypes?: string[]): Promise<...>`**
  Aggregates counts of all jobs in the queue, categorized by their state.
  * *Returns*: An object containing `total`, `pending`, `processing`, `failed`, `quarantined`, and the raw `jobs` array.

---

### 4.2 `SyncEngine`

An abstract orchestrator extending `FrameworkSyncEngine<SyncJob>`. Classes must inherit from this and implement `dispatchJob` to send the mutations to the server.

#### Methods

* **`queueJob(job: Omit<NewSyncJob, 'id' | 'status' | 'attempts' | 'createdAt'>): Promise<SyncJob>`**
  Persists a job to local storage and triggers the synchronization process in the background.
  * *Parameters*: The parameters representing the database insert type.
  * *Returns*: The saved job.

* **`pushChanges(): Promise<void>`**
  Retrieves ready jobs, checks for blocked entities, and dispatches them sequentially.

* **`retryQuarantined(): Promise<void>`**
  Resets all quarantined jobs to `pending` and sets attempts to `0`, re-triggering the push loop.

* **`recoverStuckJobs(): Promise<void>`**
  Finds any jobs stuck in the `processing` status (typically due to application crash during dispatch) and resets them to `failed`, allowing retry schedules to resume.

---

## 5. Usage Guide

Below is a complete, copy-pasteable example of how to implement and initialize the `SyncEngine` with Drizzle ORM, queue jobs, and manage the execution queue.

```typescript
import { SyncEngine } from '@/src/lib/sync/syncEngine';
import { SyncJob } from '@/src/lib/db/schema';

// 1. Extend the SyncEngine and define the remote dispatch execution logic
export class AppSyncEngine extends SyncEngine {
  // Specify which job types this engine instance is responsible for
  protected supportedJobTypes = ['UPDATE_PROFILE', 'SYNC_ORDER'];

  constructor(maxAttempts: number = 3) {
    super();
    // Configure engine thresholds and hooks if necessary
    this.maxAttempts = maxAttempts;
    this.config = {
      retryStrategy: {
        maxAttempts,
        backoffType: 'exponential',
        baseDelayMs: 500,
        maxDelayMs: 5000,
      },
      // Define inline conflict resolution policies
      onConflict: async ({ job, error }) => {
        console.warn(`[Sync Conflict] Job ${job.id} failed:`, error.message);
        
        // Example: If server returns unauthorized or bad request, discard the job
        if (error.status === 400) {
          return { action: 'discard' };
        }
        
        // Example: If version conflict, modify the payload to include a resolved flag and retry
        if (error.status === 409) {
          try {
            const parsed = JSON.parse(job.payload);
            return {
              action: 'retry',
              modifiedJob: {
                payload: JSON.stringify({ ...parsed, conflictResolved: true }),
              },
            };
          } catch {
            return { action: 'quarantine' };
          }
        }

        // Otherwise default back to standard retry limits
        return { action: 'retry' };
      },
    };
  }

  /**
   * Implement the concrete remote API/Database call.
   * If this throws an error, the engine automatically registers a failure
   * and triggers the backoff/retry/quarantine flow.
   */
  protected async dispatchJob(job: SyncJob): Promise<void> {
    const payload = JSON.parse(job.payload);

    switch (job.jobType) {
      case 'UPDATE_PROFILE':
        await this.sendProfileUpdate(job.entityId!, payload);
        break;
      case 'SYNC_ORDER':
        await this.sendOrder(job.entityId!, payload);
        break;
      default:
        throw new Error(`Unsupported job type: ${job.jobType}`);
    }
  }

  private async sendProfileUpdate(profileId: string, data: any): Promise<void> {
    const response = await fetch(`https://api.truex.platform/profiles/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { status: response.status, message: errorData.message || 'Network request failed' };
    }
  }

  private async sendOrder(orderId: string, data: any): Promise<void> {
    const response = await fetch(`https://api.truex.platform/orders/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { status: response.status, message: errorData.message || 'Network request failed' };
    }
  }

  // Hook overrides for system auditing
  protected override onJobSuccess(job: SyncJob): void {
    console.log(`[Sync Successful] Job ${job.id} dispatched for Entity ${job.entityId}`);
  }

  protected override onJobFailure(job: SyncJob, error: any): void {
    console.error(`[Sync Failure] Job ${job.id} failed attempt ${job.attempts}:`, error);
  }

  protected override onJobQuarantined(job: SyncJob, error: any): void {
    console.error(`[Sync Quarantined] Job ${job.id} exceeded maximum retry limits and is isolated:`, error);
  }
}

// 2. Singleton Initialization
export const appSyncEngine = new AppSyncEngine();

// 3. Operational Usage Example
export async function triggerUserUpdate(userId: string, updatedName: string) {
  // Queue profile change job
  const job = await appSyncEngine.queueJob({
    jobType: 'UPDATE_PROFILE',
    entityId: userId,
    payload: JSON.stringify({ name: updatedName }),
  });

  console.log(`Job queued locally in SQLite. ID: ${job.id}, Status: ${job.status}`);
}
```

---

## 6. Testing

The robustness of the sync engine queue lifecycle is verified using automated Jest unit tests.

### Test Scenarios Covered
The unit test suite at [syncEngine.test.ts](file:///Users/sac/zoeapp/src/lib/sync/__tests__/syncEngine.test.ts) isolates the code from physical SQLite requirements by mocking Drizzle ORM queries, verifying:
1. **Queuing Operations**: Asserts that `queueJob` inserts values into Drizzle with the status `pending` and immediately launches a background sync push.
2. **Sequential Outbox Processing**: Verifies that pending jobs are queried in order (FIFO) and successfully deleted from the SQLite table upon completed dispatch.
3. **Retry & Backoff Logic**: Triggers simulated API errors and validates that job attempts increment correctly, execute delayed retry attempts, and quarantine the job when it hits `maxAttempts`.
4. **Key Serialization & Concurrency**: Tests that the engine locks execution for an `entityId` when there is a processing or quarantined job associated with that entity, routing updates sequentially.
5. **Stuck & Quarantine Recovery**: Asserts that stuck `processing` jobs can be safely returned to `failed` and quarantined jobs can be returned to `pending`.

### Executing the Tests

To run the unit tests of the local `sync` library, run the following command from the project root:

```bash
npm test src/lib/sync
```

> [!NOTE]  
> The tests run inside Node and use Jest's mocking system to simulate Drizzle ORM returns. No physical SQLite migration is executed during testing.
