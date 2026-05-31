# Truex Database Library (db)

The `db` module is the core persistent storage layer for `@truex/membrane-client` (formerly `zoeapp`), providing a lightweight, high-performance local SQLite database engine. Driven by **Drizzle ORM** and **Expo SQLite**, it serves as the client-side state repository for offline queues, event-sourced actor state machines, and the local Virtual Knowledge Graph (VKG).

---

## 1. Overview & Philosophical Foundations

In the Zoe 2030 architecture, execution trust and user interaction align with the principle that local clients operate in a partially connected, zero-trust environment. The database library provides the local ground truth for a user's device. 

The database file is stored locally as `@truex/membrane-client.db`. It handles:
- **Offline Sync Queueing**: Storing offline mutations inside the `sync_queue` table to be synchronized with the remote system when connectivity is restored.
- **Semantic Storage**: Persisting Resource Description Framework (RDF) quad statements under `quads` to support the Virtual Knowledge Graph client.
- **Actor Event Sourcing**: Maintaining immutable logs of actor commands, emitted events, and cryptographic receipts. This guarantees event replayability and deterministic state transitions.
- **Error Quarantine**: Isolating faulted actions in a dedicated quarantine log for auditing and supervisor-driven remediation.

---

## 2. Architectural & Philosophical Mapping

### 2.1 Core Truex Pillars

The `db` library aligns with the core architectural components of the Truex client substrate:

```
  ┌────────────────────────────────────────────────────────────────┐
  │                         Zoe Membrane                           │
  │  ┌──────────────────────────────────────────────────────────┐  │
  │  │ Drizzle ORM Type-Safe Schemas & Column Constraint Rules  │  │
  │  └──────────────────────────────────────────────────────────┘  │
  └───────────────────────────────┬────────────────────────────────┘
                                  │
      ┌───────────────────────────┼───────────────────────────┐
      ▼                           ▼                           ▼
  ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
  │       Intake          │   │      Projection       │   │      Supervision      │
  │                       │   │                       │   │                       │
  │ actor_commands Log    │   │ quads (VKG RDF Store) │   │ actor_quarantine      │
  │ sync_queue Buffering  │   │ actor_receipts        │   │ attempts Count / WAL  │
  └───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

1. **Membrane**: The schema files and Drizzle ORM definitions serve as a schema validation membrane. Direct raw database access is controlled through type-safe queries, enforcing constraints and prevents corrupted data structures from landing on client storage.
2. **Intake**: Incoming telemetry, remote synchronization events, and user intentions are serialized as JSON payloads and loaded into the `actor_commands` and `sync_queue` tables, preparing them for local application or outbound dispatch.
3. **Projection**: Relational rows stored in the `quads` table represent semantic RDF triples. These are queried by VKG engine facades and projected into visual layout models via React state bindings.
4. **Supervision**: Retries and quarantine logs (`actor_quarantine`) provide supervisor agents and administrative dashboards with deep visibility into local transaction lifecycle, allowing diagnostic replays of failed commands.

### 2.2 Mathematical Mapping to the Chatman Equation

The database library is the concrete local backing of the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where the variables map to database elements as follows:

*   **$O^*$ (Lawful Closure Ontology)**: The local active database records representing state. This includes the semantic RDF triples stored in the `quads` table and the local actor states derived by applying `actor_events`.
*   **$\mu$ (Transformation Function)**: Relational query logic, database updates, and event processing. SQLite transactions convert local actions (`actor_commands`) into updated state records.
*   **$A$ (Emitted Consequence / Avatar Projection)**: The derived UI structures shown to the user, constructed by querying the tables.
*   **$R$ (Receipt Lineage)**: Represented by the `actor_receipts` table. Cryptographic proofs of execution (such as `deltaHash` and matching `eventIds`) map command executions to validation confirmations. No local speculative action is promoted to a fully acknowledged state until a corresponding receipt is recorded in `actor_receipts`.

---

## 3. Source Code Structure

The library is located in the client codebase at `src/lib/db/` and consists of the following files:

*   [db.ts](file:///Users/sac/zoeapp/src/lib/db/db.ts): Sets up the database file name, opens the Expo SQLite connection, executes basic optimization PRAGMAs (WAL mode, Foreign Keys), performs self-healing bootstrapping of the `sync_queue` table, and initializes the Drizzle client with the imported schema.
*   [schema.ts](file:///Users/sac/zoeapp/src/lib/db/schema.ts): Houses the Drizzle ORM table definitions, constraints, type wrappers, and inferred select/insert Typescript types.
*   [__tests__/db.test.ts](file:///Users/sac/zoeapp/src/lib/db/__tests__/db.test.ts): Unit tests verifying database instantiation, PRAGMA parameters, table creation logic, and Drizzle client binding.

---

## 4. Public Interfaces & API Contracts

### 4.1 Connection & Client Configuration

The entry point [db.ts](file:///Users/sac/zoeapp/src/lib/db/db.ts) exports the following runtime variables:

```typescript
/**
 * The filename representing the local SQLite database.
 */
export const DATABASE_NAME = '@truex/membrane-client.db';

/**
 * Direct reference to the raw expo-sqlite database instance.
 */
export const expoDb: ExpoSQLiteDatabase; // Opened via openDatabaseSync(DATABASE_NAME)

/**
 * The primary type-safe database client interface using Drizzle ORM.
 */
export const db: DrizzleClient; // Initialized via drizzle(expoDb, { schema })
```

---

### 4.2 Schema Definitions (`schema.ts`)

#### 1. `syncQueue` Table
Tracks offline mutation tasks.
- **Table Name**: `sync_queue`
- **TypeScript Types**:
  - `SyncJob` (Select Type)
  - `NewSyncJob` (Insert Type)
- **Columns**:
  | Column Name | Database Type | Drizzle Modifier | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | `INTEGER` | Primary Key (Auto-Increment) | Unique sync job identifier |
  | `jobType` | `TEXT` | `notNull()` | Classification of the synchronization job |
  | `payload` | `TEXT` | `notNull()` | JSON-stringified command / data parameters |
  | `status` | `TEXT` | `notNull()`, Defaults to `'pending'` | Lifecycle state: `'pending' \| 'processing' \| 'failed' \| 'quarantined'` |
  | `attempts` | `INTEGER` | `notNull()`, Defaults to `0` | Number of dispatch attempts made |
  | `entityId` | `TEXT` | Nullable | Serialization key used to group/sequence actions on the same entity |
  | `createdAt` | `INTEGER` | `notNull()`, Defaults to current time | Timestamp of when the job was queued |

#### 2. `quads` Table
Local semantic triple store for the Virtual Knowledge Graph (VKG).
- **Table Name**: `quads`
- **TypeScript Types**:
  - `QuadRecord` (Select Type)
  - `NewQuadRecord` (Insert Type)
- **Columns**:
  | Column Name | Database Type | Drizzle Modifier | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | `INTEGER` | Primary Key (Auto-Increment) | Internal autoincrement ID |
  | `subject` | `TEXT` | `notNull()` | RDF subject URI or blank node ID |
  | `subjectTermType`| `TEXT` | `notNull()` | RDF Term Type (e.g. `'NamedNode'`, `'BlankNode'`) |
  | `predicate` | `TEXT` | `notNull()` | RDF predicate URI |
  | `objectValue` | `TEXT` | `notNull()` | RDF object value (URI, blank node, or literal string) |
  | `objectTermType` | `TEXT` | `notNull()` | RDF Term Type (e.g. `'NamedNode'`, `'BlankNode'`, `'Literal'`) |
  | `objectDatatype` | `TEXT` | Nullable | RDF Literal datatype URI (e.g., XML Schema string or integer) |
  | `objectLanguage` | `TEXT` | Nullable | Language tag for literal fields (e.g., `'en'`, `'es'`) |
  | `graph` | `TEXT` | `notNull()` | RDF graph URI (or DefaultGraph) |
  | `graphTermType` | `TEXT` | `notNull()` | RDF Term Type for the graph node |

#### 3. `actorCommands` Table
Maintains client-side commands issued to state machine actors.
- **Table Name**: `actor_commands`
- **TypeScript Types**:
  - `ActorCommandRecord`
  - `NewActorCommandRecord`
- **Columns**:
  | Column Name | Database Type | Drizzle Modifier | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | `TEXT` | Primary Key | Unique command UUID |
  | `actorRef` | `TEXT` | `notNull()` | JSON-string representing target `ActorRef` |
  | `command` | `TEXT` | `notNull()` | Classification string of command |
  | `principal` | `TEXT` | `notNull()` | JSON-string representing security Principal details |
  | `payload` | `TEXT` | `notNull()` | JSON-string representing input parameters |
  | `idempotencyKey` | `TEXT` | `notNull()` | String token preventing duplicate execution |
  | `causationId` | `TEXT` | Nullable | Tracing ID of the event/command that caused this action |
  | `correlationId` | `TEXT` | Nullable | Tracing ID of the overall request chain |
  | `status` | `TEXT` | `notNull()`, Defaults to `'pending'` | State: `'pending' \| 'processing' \| 'applied' \| 'rejected'` |
  | `createdAt` | `INTEGER` | `notNull()` | Timestamp of command creation |

#### 4. `actorEvents` Table
Immutable log of events emitted by actor state transitions.
- **Table Name**: `actor_events`
- **TypeScript Types**:
  - `ActorEventRecord`
  - `NewActorEventRecord`
- **Columns**:
  | Column Name | Database Type | Drizzle Modifier | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | `TEXT` | Primary Key | Unique event ID |
  | `commandId` | `TEXT` | `notNull()` | Correlation link to the causal command ID |
  | `actorRef` | `TEXT` | `notNull()` | JSON-string representing emitter `ActorRef` |
  | `type` | `TEXT` | `notNull()` | Classification string of the event |
  | `payload` | `TEXT` | `notNull()` | JSON-string representation of mutation diff |
  | `createdAt` | `INTEGER` | `notNull()` | Timestamp of when event was generated |

#### 5. `actorReceipts` Table
Contains confirmation logs verifying local or authoritative executions.
- **Table Name**: `actor_receipts`
- **TypeScript Types**:
  - `ActorReceiptRecord`
  - `NewActorReceiptRecord`
- **Columns**:
  | Column Name | Database Type | Drizzle Modifier | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | `TEXT` | Primary Key | Unique receipt ID |
  | `commandId` | `TEXT` | `notNull()` | Correlation link to command |
  | `actorRef` | `TEXT` | `notNull()` | JSON-string representing target actor |
  | `status` | `TEXT` | `notNull()` | Execution status: `'accepted_pending' \| 'rejected_local' \| 'applied_local' \| 'applied_remote' \| 'rejected_remote' \| 'quarantined'` |
  | `deltaHash` | `TEXT` | Nullable | Cryptographic hash representing state delta for lineage verification |
  | `eventIds` | `TEXT` | `notNull()` | JSON stringified list of emitted event UUIDs (`string[]`) |
  | `error` | `TEXT` | Nullable | Detailed failure log string if execution failed |
  | `createdAt` | `INTEGER` | `notNull()` | Timestamp of receipt writing |

#### 6. `actorOutbox` Table
Buffered command envelope logs waiting to be dispatched to remote authoritarians.
- **Table Name**: `actor_outbox`
- **TypeScript Types**:
  - `ActorOutboxRecord`
  - `NewActorOutboxRecord`
- **Columns**:
  | Column Name | Database Type | Drizzle Modifier | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | `TEXT` | Primary Key | Unique outbox entry ID |
  | `commandId` | `TEXT` | `notNull()` | Core command ID |
  | `jobType` | `TEXT` | `notNull()` | Outbox classification (e.g. `'DISPATCH_AUTHORITATIVE'`) |
  | `payload` | `TEXT` | `notNull()` | JSON-string representing the full outbound envelope |
  | `status` | `TEXT` | `notNull()`, Defaults to `'pending'` | Dispatch status: `'pending' \| 'processing' \| 'completed' \| 'failed'` |
  | `attempts` | `INTEGER` | `notNull()`, Defaults to `0` | Count of network dispatch attempts |
  | `createdAt` | `INTEGER` | `notNull()` | Timestamp of outbox record insertion |

#### 7. `actorQuarantine` Table
Quarantine log storing invalid or error-generating commands.
- **Table Name**: `actor_quarantine`
- **TypeScript Types**:
  - `ActorQuarantineRecord`
  - `NewActorQuarantineRecord`
- **Columns**:
  | Column Name | Database Type | Drizzle Modifier | Description |
  | :--- | :--- | :--- | :--- |
  | `id` | `TEXT` | Primary Key | Unique quarantine ID |
  | `commandId` | `TEXT` | `notNull()` | Correlated command ID |
  | `actorRef` | `TEXT` | `notNull()` | Target actor reference JSON |
  | `payload` | `TEXT` | `notNull()` | Command payload JSON |
  | `error` | `TEXT` | `notNull()` | Exception details and stack trace description |
  | `createdAt` | `INTEGER` | `notNull()` | Timestamp of quarantine containment |

---

## 5. Usage Guide

Below is a complete, production-ready TypeScript usage guide showing how to initialize, write, read, query, and wrap operations in transactions using the Drizzle ORM client.

```typescript
import { eq, and } from 'drizzle-orm';
import { db } from '@/src/lib/db/db';
import { 
  syncQueue, 
  quads, 
  actorCommands, 
  actorReceipts,
  NewSyncJob,
  NewQuadRecord,
  NewActorCommandRecord
} from '@/src/lib/db/schema';

/**
 * 1. Queue an Offline Sync Job
 */
export async function queueOfflineSyncJob(jobType: string, payloadObj: object, entityId?: string): Promise<void> {
  const newJob: NewSyncJob = {
    jobType,
    payload: JSON.stringify(payloadObj),
    status: 'pending',
    attempts: 0,
    entityId: entityId || null,
    createdAt: new Date(),
  };

  try {
    await db.insert(syncQueue).values(newJob);
    console.log(`[Database] Successfully queued offline sync job for type: ${jobType}`);
  } catch (error) {
    console.error('[Database] Failed to queue sync job:', error);
    throw error;
  }
}

/**
 * 2. Query RDF Quads for the Virtual Knowledge Graph
 */
export async function queryQuadsBySubjectAndPredicate(subject: string, predicate: string) {
  try {
    const results = await db
      .select()
      .from(quads)
      .where(
        and(
          eq(quads.subject, subject),
          eq(quads.predicate, predicate)
        )
      );
    return results;
  } catch (error) {
    console.error(`[Database] Failed to query quads for ${subject}:`, error);
    throw error;
  }
}

/**
 * 3. Atomic Transaction: Record a Command and Create its Initial Receipt
 */
export async function processActorCommandTransaction(
  commandRecord: NewActorCommandRecord,
  initialEventIds: string[]
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // 1. Insert the Command Log
      await tx.insert(actorCommands).values(commandRecord);

      // 2. Insert the Accompanying Pending Receipt
      await tx.insert(actorReceipts).values({
        id: `receipt_${Math.random().toString(36).substring(2, 11)}`,
        commandId: commandRecord.id,
        actorRef: commandRecord.actorRef,
        status: 'accepted_pending',
        eventIds: JSON.stringify(initialEventIds),
        createdAt: new Date(),
      });
    });
    console.log(`[Database] Transaction succeeded: logged command ${commandRecord.id}`);
  } catch (error) {
    console.error('[Database] Actor Command Transaction failed. Rolled back.', error);
    throw error;
  }
}

/**
 * 4. Update Sync Job Status
 */
export async function updateSyncJobStatus(jobId: number, status: 'pending' | 'processing' | 'failed' | 'quarantined', incrementAttempt: boolean): Promise<void> {
  try {
    const updates: Partial<NewSyncJob> = { status };
    
    if (incrementAttempt) {
      // Drizzle supports SQL expressions inside updates
      await db.execute(async (tx) => {
        // Query the current attempts manually due to SQLite driver configuration limits
        const existing = await tx
          .select({ attempts: syncQueue.attempts })
          .from(syncQueue)
          .where(eq(syncQueue.id, jobId))
          .limit(1);

        const currentAttempts = existing[0]?.attempts ?? 0;

        await tx.update(syncQueue)
          .set({
            status,
            attempts: currentAttempts + 1
          })
          .where(eq(syncQueue.id, jobId));
      });
    } else {
      await db.update(syncQueue)
        .set(updates)
        .where(eq(syncQueue.id, jobId));
    }
  } catch (error) {
    console.error(`[Database] Failed to update sync job status for job ${jobId}:`, error);
    throw error;
  }
}
```

---

## 6. Testing

The module is verified via unit and integration tests found under [db.test.ts](file:///Users/sac/zoeapp/src/lib/db/__tests__/db.test.ts).

### 6.1 Testing Architecture
Because the library interacts with device hardware boundaries (`expo-sqlite`), the test environment mocks sqlite connections to verify command generation:
- **`expo-sqlite` Mocks**: Intercepts `openDatabaseSync` and returns a mock object implementing `execSync`.
- **`drizzle-orm/expo-sqlite` Mocks**: Mocks `drizzle` invocation, ensuring the database client correctly integrates the schema and engine reference.
- **Initial Verification Hooks**: Validates:
  - Database file targets match `@truex/membrane-client.db`.
  - WAL Journaling and Foreign Keys are applied during client startup.
  - The bootstrapping script builds `sync_queue` if it does not exist.

### 6.2 Running Tests
Execute the database unit test suite with the following terminal execution:

```bash
npm run test -- src/lib/db/__tests__/db.test.ts
```
