# Virtual Knowledge Graph (VKG) Library Documentation

## 1. Title & Overview

The **Virtual Knowledge Graph (VKG)** library is the core semantic layer of the Truex platform. It bridges local application states and telemetry event streams with W3C RDF.js-compliant graph structures and Schema.org semantic models. Rather than relying on rigid relational tables for application state transfers and logging, the VKG decouples local storage, remote synchronization, and event processing through directed semantic triples (Subject-Predicate-Object Quads).

### Purpose
* **Unified Semantic Mapping:** Translates unstructured application events and payloads (e.g., telemetry logs) into standard Schema.org entities (like `https://schema.org/Event`, `https://schema.org/CreativeWork`, `https://schema.org/Sermon`).
* **Offline-First Synchronization:** Integrates a local SQLite-backed store with a transactional Outbox sync engine. It logs graph modifications locally and pushes them asynchronously to an authoritative Supabase Edge database.
* **Reactive Hook Execution:** Evaluates high-frequency graph changes through synchronous semantic hooks, enabling the system to react, transform, annotate, or block state updates.
* **Cascade Governance:** Implements supervisors to monitor event propagation pressure, throttle notification floods, and quarantine oscillating state updates.

---

## 2. Architectural & Philosophical Mapping

The VKG library maps directly to the four pillars of the **Truex Architecture** and the core **Chatman Equation** ($R \vdash A = \mu(O^*)$).

### Core Architectural Pillars
1. **Membrane:** The local SQLite database acts as a boundary membrane. The `VirtualKnowledgeGraphClient` intercepts state updates and translates them into semantic quads, which are safely cached locally and queued for remote sync, decoupling network boundaries.
2. **Intake:** The `VkgEventDispatcher` acts as the operational intake gateway. It takes raw, heterogeneous telemetry inputs and rebrands them into standard ontology concepts before ingestion.
3. **Projection:** Visual states are defined as projection views of the underlying graph. The `AvatarProjection` schema outlines how graph nodes are mapped to different role surfaces (e.g., guest, member, pastor) and decides if a state is `visible`, `hidden`, `summary`, or `alert`.
4. **Supervision:** The `VkgHookEngine` registers `SupervisorHook` instances to act as validation gates. They calculate "propagation pressure" and detect anomalies (e.g., cycle patterns or flood rates), asserting supervisory control over state cascades.

### Philosophical Mapping: The Chatman Equation
$$\mathbf{R \vdash A = \mu(O^*)}$$

* **$O^*$ (Objective State / Knowledge Graph):** Represented by the RDF Quads (assertions about resources, literals, relationships) and Schema.org entities stored in the Virtual Knowledge Graph database.
* **$A$ (Avatar / User Persona):** The actor who interacts with the system, represented by specific profiles (such as `pastor`, `volunteer`, `member`) and defined within the `AvatarProjection` contracts.
* **$\mu(O^*)$ (Projection Operator):** The mapping function that transforms the underlying objective graph state ($O^*$) into a representation suitable for the active avatar's user interface, deciding what actions are permitted and what is visible.
* **$R$ (Rules / Governance):** The set of rules implemented by `VkgHook` and `SupervisorHook` (e.g., `FloodSupervisor`, `OscillationDetector`) that govern the validity of state transitions. The notation $R \vdash$ signifies that these rules prove/guarantee the safety and integrity of the avatar's projected reality.

---

## 3. Source Code Structure

The VKG library codebase is located in the [src/lib/vkg/](file:///Users/sac/zoeapp/src/lib/vkg) directory. Below is the file structure and the role of each source file:

### Core Files
* **[types.ts](file:///Users/sac/zoeapp/src/lib/vkg/types.ts):** Defines the fundamental graph interfaces used for queries, including `GraphNode`, `GraphEdge`, and `TraversalOptions`.
* **[rdf.ts](file:///Users/sac/zoeapp/src/lib/vkg/rdf.ts):** A zero-dependency implementation of the W3C/RDF.js Data Model Specification. It exports terms like `NamedNode`, `BlankNode`, `Literal`, `Variable`, `DefaultGraph`, `Quad`, and the `DataFactory` helper.
* **[client.ts](file:///Users/sac/zoeapp/src/lib/vkg/client.ts):** Contains the primary class `VirtualKnowledgeGraphClient` for handling CRUD operations on RDF quads via Drizzle ORM and SQLite. It also houses `VKGRdfSyncEngine` which synchronizes local assertions with Supabase.
* **[event.ts](file:///Users/sac/zoeapp/src/lib/vkg/event.ts):** Implements telemetry event transformation rules. It converts telemetry payloads into Schema.org JSON-LD and dispatches them via the `VkgEventDispatcher`.

### Hooks Engine Subdirectory
* **[hooks/types.ts](file:///Users/sac/zoeapp/src/lib/vkg/hooks/types.ts):** Defines Hook rules, modes (`advise`, `simulate`, `annotate`, `block`, `repair`, `settle`), conditions, effects, and the projection surface layouts.
* **[hooks/engine.ts](file:///Users/sac/zoeapp/src/lib/vkg/hooks/engine.ts):** The `VkgHookEngine` evaluated on delta streams. Matches predicate patterns synchronously and schedules jobs to the sync outbox.

### Supervisors Subdirectory
* **[supervisors/index.ts](file:///Users/sac/zoeapp/src/lib/vkg/supervisors/index.ts):** Standardized governance models including `PropagationPressureMonitor`, `FloodSupervisor` (rate limits notifications), and `OscillationDetector` (prevents loop propagation).

### Outbox & Simulation Subdirectories
* **[sync/outbox.ts](file:///Users/sac/zoeapp/src/lib/vkg/sync/outbox.ts):** Implements `OutboxManager`, extending the base framework manager to serialize graph updates and chain cryptographically secure receipts.
* **[simulation/twin.ts](file:///Users/sac/zoeapp/src/lib/vkg/simulation/twin.ts):** Defines Digital Twin and Design of Experiments (DOE) parameters, modeling factors, treatment settings, and synthetic divergence metrics.

---

## 4. API Contracts

### Types File (`types.ts`)
* `GraphNode`: Representation of a Schema.org or general JSON-LD semantic object.
  * `@id: string` - Unique IRI identifier.
  * `@type: string` - Ontology type IRI.
  * `[property: string]: any` - Additional semantic properties.
* `GraphEdge`: A directed relation between two `GraphNode` subjects.
  * `sourceId: string` - Subject node IRI.
  * `predicate: string` - Edge type predicate IRI.
  * `targetId: string` - Object node IRI.
* `TraversalOptions`: Query filters for graphing connected edges.
  * `limit?: number` / `offset?: number` - Pagination values.
  * `targetType?: string` - Target node type filter.

### RDF Module (`rdf.ts`)
* `Term`: Base interface for RDF terms.
  * `termType: string`
  * `value: string`
  * `equals(other: Term | null | undefined): boolean`
* `NamedNode`, `BlankNode`, `Literal`, `Variable`, `DefaultGraph`: Concrete implementations of `Term`.
* `Quad`: Represents an RDF statement with `subject: Term`, `predicate: Term`, `object: Term`, and `graph: Term` (defaults to `DefaultGraph`).
* `DataFactory`: Factory methods for constructing the standard RDF terms.

### Client Module (`client.ts`)
* `VKGRdfSyncEngine` (extends `SyncEngine`):
  * `dispatchJob(job: { jobType: string; payload: string }): Promise<void>` - Synchronizes insertions (`RDF_ADD_QUAD`) or deletions (`RDF_REMOVE_QUAD`) to the Supabase `rdf_quads_ld` table.
* `VirtualKnowledgeGraphClient`:
  * `match(subject?: Term, predicate?: Term, object?: Term, graph?: Term): Promise<Quad[]>` - Queries local SQLite storage for matching RDF triples.
  * `addQuads(quadsList: Quad[]): Promise<void>` - Inserts quads locally (checking for duplicates) and logs synchronization jobs.
  * `removeQuads(quadsList: Quad[]): Promise<void>` - Deletes quads locally and logs synchronization deletion jobs.
  * `jsonLdToQuads(doc: any, defaultGraph?: Term): Quad[]` - Recursively maps nested JSON-LD objects into RDF.js Quads.
  * `quadsToJsonLd(quadsList: Quad[]): any[]` - Groups RDF.js Quads by subject and outputs fully nested JSON-LD documents.

### Event Module (`event.ts`)
* `TelemetryEvent`: Represents a raw client action.
  * `timestamp?: string`
  * `type: string`
  * `payload?: Record<string, any>`
* `telemetryToSchemaOrgEvent(telemetry: TelemetryEvent): Event`: Core rebrand translation mapping. Applies platform-specific transformations:
  * screen/UI views $\rightarrow$ `'Avatar-Relative Projection Event'`
  * API calls $\rightarrow$ `'Propagation Trigger Event'`
  * Offline sync/tension queues $\rightarrow$ `'Pre-Admission Tension Queue Event'`
  * Dashboards/Supervision $\rightarrow$ `'Consequence Supervision Event'`
  * Form submissions/Intakes $\rightarrow$ `'Operational Intake Event'`
  * Webhooks/Adjudication $\rightarrow$ `'Settlement Adjudication Event'`
  * Admin Panels $\rightarrow$ `'Supervision Geometry Event'`
* `VkgEventDispatcher`:
  * `dispatchTelemetry(telemetry: TelemetryEvent): Promise<Event>` - Concurrently converts and dispatches telemetry events to local and remote sync engines.

### Hook Engine & Supervisors (`hooks/engine.ts`, `supervisors/index.ts`)
* `VkgHookEngine`:
  * `registerHook(hook: VkgHook): void`
  * `registerSupervisor(supervisor: SupervisorHook): void`
  * `processDelta(delta: GraphDelta): void` - Feeds a state change through supervisor validation gates and hook trigger rules.
  * `getMetrics(): PropagationMetrics` - Returns calculations on delta processing rate and depth.
* `FloodSupervisor`: Intervenes when activation rates exceed specified thresholds.
* `OscillationDetector`: Suppresses loops when cyclic oscillation score exceeds `0.8`.

---

## 5. Usage Guide

Below is a complete, copy-pasteable TypeScript example showcasing how to initialize the Virtual Knowledge Graph Client, ingest telemetry data, run semantic queries, and pass changes through the reactive Hook Engine.

```typescript
import { VirtualKnowledgeGraphClient } from './src/lib/vkg/client';
import { DataFactory } from './src/lib/vkg/rdf';
import { VkgEventDispatcher } from './src/lib/vkg/event';
import { VkgHookEngine } from './src/lib/vkg/hooks/engine';
import { OutboxManager } from './src/lib/vkg/sync/outbox';
import { FloodSupervisor, OscillationDetector } from './src/lib/vkg/supervisors';
import { VkgHook } from './src/lib/vkg/hooks/types';

async function runVkgPipelineExample() {
  // 1. Initialize the VKG client
  const vkgClient = new VirtualKnowledgeGraphClient();

  // 2. Dispatch a raw telemetry event (this auto-converts to a Schema.org Event representation)
  const dispatcher = new VkgEventDispatcher(vkgClient);
  console.log("Ingesting raw screen view telemetry event...");
  const schemaEvent = await dispatcher.dispatchTelemetry({
    timestamp: new Date().toISOString(),
    type: 'screen_view_home',
    payload: {
      screen: 'HomeFeed',
      activeTab: 'Sermons'
    }
  });
  console.log(`Dispatched Schema.org Event ID: ${schemaEvent['@id']}`);
  console.log(`Translated Platform Concept Name: ${schemaEvent.name}`);

  // 3. Query the local storage using RDF.js Match filters
  const subjectTerm = DataFactory.namedNode(schemaEvent['@id']);
  const predicateTerm = DataFactory.namedNode('https://schema.org/avatarRelativeProjection');
  
  console.log("Matching triples in local database...");
  const matchedQuads = await vkgClient.match(subjectTerm, predicateTerm);
  console.log(`Found ${matchedQuads.length} matching quad(s).`);
  matchedQuads.forEach(quad => {
    console.log(`Triple: <${quad.subject.value}> <${quad.predicate.value}> "${quad.object.value}"`);
  });

  // 4. Set up the Hook & Supervision Engine
  const outboxManager = new OutboxManager();
  const hookEngine = new VkgHookEngine(outboxManager);

  // Register Supervisors to protect the cascade pipeline
  hookEngine.registerSupervisor(new FloodSupervisor());
  hookEngine.registerSupervisor(new OscillationDetector());

  // Define and register a custom Hook rule
  const trackingHook: VkgHook = {
    id: 'sermon-view-hook',
    name: 'Auto-annotate Sermon Projection Views',
    authority: 'client',
    mode: 'annotate',
    condition: {
      kind: 'pattern',
      pattern: 'https://schema.org/avatarRelativeProjection'
    },
    effects: [
      {
        kind: 'annotateProjection',
        annotation: 'User is viewing home feed screen'
      }
    ],
    projections: [
      {
        avatar: 'member',
        jtbd: 'Read latest announcements',
        surface: 'visible',
        actions: ['view', 'click']
      }
    ],
    supervisors: ['flood-supervisor'],
    receipts: true
  };

  hookEngine.registerHook(trackingHook);

  // 5. Feed local graph changes into the Hook Engine
  console.log("Evaluating GraphDelta through Hook Engine...");
  matchedQuads.forEach(quad => {
    hookEngine.processDelta({
      id: `delta-${Math.random().toString(36).substring(2, 9)}`,
      subject: quad.subject.value,
      predicate: quad.predicate.value,
      object: quad.object.value,
      timestamp: Date.now()
    });
  });

  // Flush pending queued events in the outbox
  console.log("Flushing outbox manager...");
  outboxManager.flushPending();
  console.log(`Outbox Processed Count: ${outboxManager.processedCount}`);
  console.log(`Cryptographic Sync Receipts Generated: ${outboxManager.getReceiptCount()}`);
}

runVkgPipelineExample().catch(console.error);
```

---

## 6. Testing

The VKG library features a robust suite of unit tests, executing 93 total assertions across 7 test files. 

### Test Suite Structure
* **[rdf.test.ts](file:///Users/sac/zoeapp/src/lib/vkg/__tests__/rdf.test.ts):** Asserts the W3C RDF.js standard conformity of RDF terms, literal datatypes, variable evaluations, and factory constructor functions.
* **[client.test.ts](file:///Users/sac/zoeapp/src/lib/vkg/__tests__/client.test.ts):** Validates Drizzle ORM mapping logic, checks query condition compilation, verifies that duplicate quads are skipped, and mocks remote Supabase updates.
* **[event.test.ts](file:///Users/sac/zoeapp/src/lib/vkg/__tests__/event.test.ts):** Guarantees the rebrand translation maps legacy events to platform equivalents, and checks the telemetry event dispatcher.
* **[sermon.test.ts](file:///Users/sac/zoeapp/src/lib/vkg/__tests__/sermon.test.ts):** Validates specific Schema.org Sermon serialization/deserialization mapping.
* **[creativework.test.ts](file:///Users/sac/zoeapp/src/lib/vkg/__tests__/creativework.test.ts):** Asserts Schema.org CreativeWork serialization accuracy.
* **[engine.test.ts](file:///Users/sac/zoeapp/src/lib/vkg/hooks/__tests__/engine.test.ts):** Checks the reactive engine hooks delta matching, resets, and supervisor throttle controls.
* **[outbox.test.ts](file:///Users/sac/zoeapp/src/lib/vkg/sync/__tests__/outbox.test.ts):** Asserts queue batching/flushing speeds and verifies cryptographic chaining of transaction receipt hashes.

### Running the Tests
To execute the tests, verify database and client mock functions, run the following command from the repository root:

```bash
# Execute VKG unit tests via Jest
npx jest src/lib/vkg
```
