# Virtual Knowledge Graph (VKG) Module Documentation

The **Virtual Knowledge Graph (VKG)** module is a core architectural framework component of the Zoe 2030 platform. It serves as an abstraction and Developer Experience (DX) facade over low-level Resource Description Framework (RDF) triple stores and state synchronization systems. By shifting the computing paradigm from raw relational fields to graph-reactive, object-centric trajectories, the VKG framework empowers the Zoe client runtime to evaluate autonomic rules, resolve multi-join queries, and project avatar-relative interfaces in real time.

---

## 1. Overview & Philosophical Foundations

Historically, enterprise software treated static databases as the source of truth, leaving user interfaces to pull data through rigid, page-centric REST or GraphQL boundaries. Under the Zoe 2030 paradigm, we declare the **End of CRUD**. Persistent states are merely derivative slices of ongoing operational motion.

The VKG module provides a virtual, local semantic graph representing an agent's current state, environment, and social ontology. It allows:
- **Graph-Reactive Autonomics**: Subscribing to semantic mutations (Graph Deltas) and triggering execution rules.
- **Fluent Graph Querying**: Querying the local state using a SPARQL-like fluent builder.
- **Local Inference Engines**: Evaluating rules locally (e.g., transitivity, symmetry) using forward-chaining reasoning to derive implicit truths.
- **Real-Time React Projections**: Subscribing to semantic trajectories and projecting responsive interfaces that update dynamically as the underlying graph changes.

---

## 2. Architectural & Philosophical Mapping

### 2.1 The Truex Architecture

The VKG framework maps directly onto the four pillars of the **Truex Core Architecture**:

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      Zoe Membrane                           │
 │  ┌───────────────────────────────────────────────────────┐  │
 │  │      VKG Facades & React Hooks (Security/Isolation)   │  │
 │  └───────────────────────────────────────────────────────┘  │
 └──────────────────────────────┬──────────────────────────────┘
                                │
    ┌───────────────────────────┼───────────────────────────┐
    ▼                           ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│     VKG Intake        │   │    VKG Projection     │   │    VKG Supervision    │
│                       │   │                       │   │                       │
│ JSON-LD Ingestion     │   │ useGraphTraversal     │   │ Supervisor Hooks      │
│ RDF Quad Conversion   │   │ useSemanticQuery      │   │ Metrics & Outbox      │
│                       │   │ useGraphInference     │   │ Cascade Throttling    │
└───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

1. **Membrane**: The facade layer ([client.ts](file:///Users/sac/zoeapp/src/framework/vkg/client.ts) and [engine.ts](file:///Users/sac/zoeapp/src/framework/vkg/engine.ts)) encapsulates the low-level RDF storage engine. It provides isolation, ensures that only valid mutations traverse the boundary, and enables speculative simulation or verification of future state trajectories before committing them.
2. **Intake**: Incoming data (such as JSON-LD documents, synced network entities, and system events) is parsed and unified by the client facade ([client.ts](file:///Users/sac/zoeapp/src/framework/vkg/client.ts)) into standard W3C RDF Quads using W3C DataFactory definitions.
3. **Projection**: React components and hooks project semantic data into visual structures. Hooks like `useGraphTraversal` and `useSemanticQuery` translate the raw graph triples into declarative React state variables that render layout components suited to the specific avatar's role and visibility permissions.
4. **Supervision**: Oversees the execution of graph-reactive rules. The engine facade ([engine.ts](file:///Users/sac/zoeapp/src/framework/vkg/engine.ts)) exposes propagation metrics and registers supervisors (`SupervisorHook`) to detect deep cascades, trace rules fanout, and preempt recursive feedback loops.

---

### 2.2 Mathematical Mapping to the Chatman Equation

We formalize VKG's operations in terms of the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where:
- $O^*$ (**The Lawful Closure Ontology**): Represents the admissible operational state. This is defined by the namespaces and common vocabularies in [semantic/types.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/types.ts) and the active base quads managed by the client facade in [client.ts](file:///Users/sac/zoeapp/src/framework/vkg/client.ts).
- $\mu$ (**The Transformation Function**): Translates system events and user intents into logical assertions. It is implemented by the rules in [inference/engine.ts](file:///Users/sac/zoeapp/src/framework/vkg/inference/engine.ts) (`LocalInferenceEngine`) and query paths in [semantic/builder.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/builder.ts) (`SemanticQueryBuilder`).
- $A$ (**The Emitted Consequence**): The visual projections, updated layout elements, and UI triggers generated by the React layer in [react.tsx](file:///Users/sac/zoeapp/src/framework/vkg/react.tsx) and [semantic/hooks.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/hooks.ts).
- $R$ (**The Receipt Lineage**): Represents the proven trajectory history. Outbox management and delta recording within [engine.ts](file:///Users/sac/zoeapp/src/framework/vkg/engine.ts) verify that every operational transition is receipted and stored securely in Postgres.

---

## 3. Source Code Structure

The module is structured under `src/framework/vkg` as follows:

- [index.ts](file:///Users/sac/zoeapp/src/framework/vkg/index.ts): Exports the main public API facade, bundling client classes, caching policies, React hooks, and RDF query builders.
- [rdf.ts](file:///Users/sac/zoeapp/src/framework/vkg/rdf.ts): Re-exports W3C RDF.js structures (Term, NamedNode, BlankNode, Literal, Variable, DefaultGraph, Quad, DataFactory) from the lower-level library [src/lib/vkg/rdf.ts](file:///Users/sac/zoeapp/src/lib/vkg/rdf.ts). Includes the `createQuadFromStrings` utility.
- [cache.ts](file:///Users/sac/zoeapp/src/framework/vkg/cache.ts): Implements a Time-To-Live (TTL) Map cache (`SemanticNodeCache`) to prevent repetitive queries for hot semantic nodes.
- [client.ts](file:///Users/sac/zoeapp/src/framework/vkg/client.ts): Exposes the `VKGClientFacade` class which simplifies quad additions, deletions, pattern matching, and JSON-LD conversion.
- [engine.ts](file:///Users/sac/zoeapp/src/framework/vkg/engine.ts): Provides the `VKGEngineFacade` class, wrapping the low-level hooks engine, delta processing, and supervisor monitoring tools.
- [query.ts](file:///Users/sac/zoeapp/src/framework/vkg/query.ts): Introduces `RdfQueryBuilder`, a fluent API for executing single-quad pattern queries and traversing relations.
- [react.tsx](file:///Users/sac/zoeapp/src/framework/vkg/react.tsx): Implements the `<VkgProvider />` component alongside custom hooks `useVkg` and `useGraphTraversal`.

### 3.1 Inference Sub-Module (`inference/`)
- [inference/index.ts](file:///Users/sac/zoeapp/src/framework/vkg/inference/index.ts): Exports types, rule builders, and the rule factories `createTransitivityRule` and `createSymmetryRule`.
- [inference/types.ts](file:///Users/sac/zoeapp/src/framework/vkg/inference/types.ts): Declares structures for triple patterns, variable substitutions, rules, and inference metrics.
- [inference/engine.ts](file:///Users/sac/zoeapp/src/framework/vkg/inference/engine.ts): Implements `LocalInferenceEngine`, a forward-chaining rules engine that applies substitutions iteratively over matching patterns.
- [inference/hook.ts](file:///Users/sac/zoeapp/src/framework/vkg/inference/hook.ts): Introduces the `useGraphInference` hook, automating on-device rule evaluation inside React.

### 3.2 Semantic Sub-Module (`semantic/`)
- [semantic/index.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/index.ts): Exposes types, builder functions, and hooks.
- [semantic/types.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/types.ts): Houses common namespaces (rdf, rdfs, xsd, schema, zoe) and declares semantic types.
- [semantic/builder.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/builder.ts): Implements `SemanticQueryBuilder`, which supports complex, multi-pattern variable joins (similar to SPARQL).
- [semantic/hooks.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/hooks.ts): Exposes react hooks `useSemanticQuery` and `useSemanticMatch`.

### 3.3 Test Suite Directories
- [__tests__/cache.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/cache.test.ts): Tests caching behaviors, key generation, invalidation, and TTL expiration.
- [__tests__/client.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/client.test.ts): Validates client delegation, quad parsing, and JSON-LD shortcuts.
- [__tests__/engine.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/engine.test.ts): Evaluates hooks registration, supervisor metrics, and sequential delta batching.
- [__tests__/query.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/query.test.ts): Tests fluent RDF pattern builds and edge traversals.
- [__tests__/rdf.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/rdf.test.ts): Confirms named node, blank node, literal parsing, and re-exports.
- [__tests__/react.test.tsx](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/react.test.tsx): Tests React components, context aliasing, and relation-traverse updates.
- [inference/__tests__/engine.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/inference/__tests__/engine.test.ts): Tests transitivities, symmetries, iteration ceilings, and unbound variable protections.
- [semantic/__tests__/builder.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/__tests__/builder.test.ts): Tests SPARQL-style multi-triple pattern joins, namespaces, selection filters, and multi-variable matches.
- [semantic/__tests__/hooks.test.tsx](file:///Users/sac/zoeapp/src/framework/vkg/semantic/__tests__/hooks.test.tsx): Tests query execution and custom matching hooks inside simulated functional components.

---

## 4. API Contracts

### 4.1 RDF Foundations ([rdf.ts](file:///Users/sac/zoeapp/src/framework/vkg/rdf.ts))

#### `createQuadFromStrings`
Converts raw string parameters into W3C-compliant `Quad` instances, automatically inferring blank nodes and literals:
```typescript
export function createQuadFromStrings(
  subject: string,
  predicate: string,
  object: string,
  graph?: string
): Quad;
```

---

### 4.2 Caching Layer ([cache.ts](file:///Users/sac/zoeapp/src/framework/vkg/cache.ts))

#### `SemanticNodeCache`
A memory cache using a TTL scheme:
- `constructor(ttlMs: number = 60000)`: Sets the default cache validation lifetime in milliseconds.
- `set(nodeUri: string | Term, quads: Quad[]): void`: Sets a list of quads associated with a specific URI or Term.
- `get(nodeUri: string | Term): Quad[] | null`: Obtains valid cached quads or returns `null` if expired or missing.
- `invalidate(nodeUri?: string | Term): void`: Deletes a specific entry, or clears the entire cache if called without arguments.

---

### 4.3 Client Facade ([client.ts](file:///Users/sac/zoeapp/src/framework/vkg/client.ts))

#### `IVKGClient`
Interface defining core VKG interaction requirements:
```typescript
export interface IVKGClient {
  match(subject?: Term, predicate?: Term, object?: Term, graph?: Term): Promise<Quad[]>;
  addQuads(quads: Quad[]): Promise<void>;
  removeQuads(quads: Quad[]): Promise<void>;
  jsonLdToQuads(doc: any, defaultGraph?: Term): Quad[];
  quadsToJsonLd(quadsList: Quad[]): any[];
  getSyncEngine(): any;
  addJsonLd(doc: any): Promise<void>;
}
```

#### `VKGClientFacade`
Standard client facade implementing `IVKGClient`.
- `addJsonLd(doc: any): Promise<void>`: Convenience utility to parse JSON-LD documents and write the resulting quads directly.

---

### 4.4 Engine Facade ([engine.ts](file:///Users/sac/zoeapp/src/framework/vkg/engine.ts))

#### `VKGEngineFacade`
- `constructor(outboxManager: OutboxManager)`: Instantiates a hook engine bound to a synchronization manager.
- `registerHook(hook: VkgHook): void`: Registers a reactive graph hook.
- `registerSupervisor(supervisor: SupervisorHook): void`: Registers an execution supervisor for profiling.
- `processDelta(delta: GraphDelta): void`: Runs a single Graph Delta.
- `processMultiple(deltas: GraphDelta[]): void`: Runs a collection of Graph Deltas sequentially.
- `getMetrics(): PropagationMetrics`: Returns execution metrics (e.g., fanout, evaluations).
- `reset(): void`: Resets the engine state.

---

### 4.5 SPARQL-like Fluent Builders ([semantic/builder.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/builder.ts))

#### `SemanticQueryBuilder`
Constructs multi-variable, nested joins:
- `where(subject: QueryTerm, predicate: QueryTerm, object: QueryTerm): this`: Adds a triple match criteria.
- `match(subject: QueryTerm, predicate: QueryTerm, object: QueryTerm): this`: Alias for `where`.
- `select(...variables: Variable[]): this`: Confines results to specified variables (represented as `?varName`).
- `execute(): Promise<QueryResult[]>`: Processes joins sequentially using nested loop evaluations.

---

### 4.6 Inference Engine ([inference/engine.ts](file:///Users/sac/zoeapp/src/framework/vkg/inference/engine.ts))

#### `LocalInferenceEngine`
- `constructor(rules: InferenceRule[])`: Instantiates the engine with rules.
- `addRule(rule: InferenceRule): void`: Adds a rule.
- `infer(initialQuads: Quad[], maxIterations?: number): InferenceResult`: Evaluates forward-chaining rules. Returns newly inferred quads and evaluation metrics.

---

### 4.7 React Hooks & Context ([react.tsx](file:///Users/sac/zoeapp/src/framework/vkg/react.tsx), [inference/hook.ts](file:///Users/sac/zoeapp/src/framework/vkg/inference/hook.ts), [semantic/hooks.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/hooks.ts))

- `VkgProvider`: Global context provider initializing the VKG hooks engine.
- `useVkg()`: Accesses active engines, states, and telemetry.
- `useGraphTraversal(client, subject, predicate)`: Traverses single relations and returns matched target nodes.
- `useGraphInference(client, rules, options)`: Returns inferred quads dynamically computed on-device.
- `useSemanticQuery(client, buildQuery, deps)`: Evaluates complex query joins.
- `useSemanticMatch(client, subject, predicate, object)`: Runs single-pattern lookups.

---

## 5. Usage Guide

Below is a complete, copy-pasteable TypeScript integration illustrating how to initialize the VKG client, load metadata, establish transitivity rules, construct multi-variable queries, and connect the results to a React component:

```tsx
import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, FlatList, Button } from 'react-native';
import { 
  VKGClientFacade, 
  VkgProvider,
  createQuadFromStrings, 
  DataFactory 
} from '../vkg';
import { 
  semanticQuery, 
  useSemanticQuery 
} from '../vkg/semantic';
import { 
  createTransitivityRule, 
  useGraphInference 
} from '../vkg/inference';

// 1. Initialize high-level client facade
const vkgClient = new VKGClientFacade();

// 2. Define custom rules
const rules = [
  // parentOf(A, B) && parentOf(B, C) => grandparentOf(A, C)
  createTransitivityRule(
    'grandparentTransitivity',
    'https://zoe.framework/ontology/parentOf',
    'https://zoe.framework/ontology/grandparentOf'
  )
];

export const VKGDemoComponent: React.FC = () => {
  // 3. Load initial RDF dataset
  const setupData = async () => {
    const data = [
      createQuadFromStrings(
        'https://zoe.framework/person/Alice',
        'https://zoe.framework/ontology/parentOf',
        'https://zoe.framework/person/Bob'
      ),
      createQuadFromStrings(
        'https://zoe.framework/person/Bob',
        'https://zoe.framework/ontology/parentOf',
        'https://zoe.framework/person/Charlie'
      ),
      createQuadFromStrings(
        'https://zoe.framework/person/Alice',
        'http://www.w3.org/2000/01/rdf-schema#label',
        'Alice'
      ),
      createQuadFromStrings(
        'https://zoe.framework/person/Charlie',
        'http://www.w3.org/2000/01/rdf-schema#label',
        'Charlie the Toddler'
      )
    ];
    await vkgClient.addQuads(data);
  };

  // 4. Hook for multi-variable semantic query: Find grandparent labels
  // Query: ?g grandparentOf ?c, ?c rdfs:label ?cLabel
  const { results: queryResults, loading: queryLoading, error: queryError } = useSemanticQuery(
    vkgClient,
    (query) => {
      query
        .match('?grandparent', 'zoe:parentOf', '?child')
        .match('?child', 'zoe:parentOf', '?grandchild')
        .match('?grandchild', 'rdfs:label', '?grandchildLabel')
        .select('?grandparent', '?grandchildLabel');
    },
    []
  );

  // 5. Hook for forward-chaining rules evaluation
  const { inferredQuads, loading: inferenceLoading, isInferred } = useGraphInference(
    vkgClient,
    rules
  );

  if (queryLoading || inferenceLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Resolving Graph Queries and Inferences...</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20, flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        Virtual Knowledge Graph Console
      </Text>
      
      <Button title="Load Base Triples" onPress={setupData} />

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Active Query Results:</Text>
        <FlatList
          data={queryResults}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={{ marginVertical: 5, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Text>Grandparent URI: {item.grandparent?.value}</Text>
              <Text>Grandchild Name: {item.grandchildLabel?.value}</Text>
            </View>
          )}
        />
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Inference Engine Telemetry:</Text>
        <Text style={{ marginVertical: 5 }}>
          Derived Triples Count: {inferredQuads.length}
        </Text>
        <Text>
          Is Alice Grandparent of Charlie?{' '}
          {isInferred(
            'https://zoe.framework/person/Alice',
            'https://zoe.framework/ontology/grandparentOf',
            'https://zoe.framework/person/Charlie'
          ) ? '✅ INFERRED' : '❌ NOT YET'}
        </Text>
      </View>
    </View>
  );
};

// 6. Wrap Root Application with VKG Context Provider
export default function RootApplication() {
  return (
    <VkgProvider>
      <VKGDemoComponent />
    </VkgProvider>
  );
}
```

---

## 6. Testing

The module features a robust, zero-dependency testing strategy covering 50 units across 9 test suites.

### 6.1 Test Suites

1. **Client Facade Tests ([client.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/client.test.ts))**: Verify delegation patterns, JSON-LD schema processing, and shortcut helper operations.
2. **Local Rules Engine Tests ([inference/engine.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/inference/__tests__/engine.test.ts))**: Confirm transitivity, symmetry, recursion termination limits, and unbound variable protections.
3. **SPARQL Builder Joins Tests ([semantic/builder.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/semantic/__tests__/builder.test.ts))**: Validate multi-pattern joins, select queries, and namespaces expansion.
4. **React Integrations Tests ([react.test.tsx](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/react.test.tsx))**: Assess `<VkgProvider />` render cycles, hook mock delegations, and dynamic state updates.
5. **Caching Policies Tests ([cache.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/cache.test.ts))**: Verify cache hits, key mappings, custom TTL parameters, and invalidation calls.
6. **Traversal Query Tests ([query.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/query.test.ts))**: Check query creation workflows, literal type conversions, and semantic relation traversals.
7. **Semantic Hooks Tests ([semantic/hooks.test.tsx](file:///Users/sac/zoeapp/src/framework/vkg/semantic/__tests__/hooks.test.tsx))**: Check query hook integrations and simplified `useSemanticMatch` workflows.
8. **RDF Utils Tests ([rdf.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/rdf.test.ts))**: Check term conversions and W3C specification compliance.
9. **Hooks Engine Tests ([engine.test.ts](file:///Users/sac/zoeapp/src/framework/vkg/__tests__/engine.test.ts))**: Test sequential Graph Delta processing and supervisor instrumentation.

### 6.2 Running the Test Suite

To execute the test suite, run the following command in the root directory:

```bash
npm test src/framework/vkg
```

#### Expected Test Output:
```text
> @truex/membrane-client@1.0.0 test
> jest src/framework/vkg

PASS src/framework/vkg/__tests__/client.test.ts
PASS src/framework/vkg/__tests__/engine.test.ts
PASS src/framework/vkg/__tests__/cache.test.ts
PASS src/framework/vkg/semantic/__tests__/builder.test.ts
PASS src/framework/vkg/__tests__/query.test.ts
PASS src/framework/vkg/__tests__/rdf.test.ts
PASS src/framework/vkg/inference/__tests__/engine.test.ts
PASS src/framework/vkg/__tests__/react.test.tsx
PASS src/framework/vkg/semantic/__tests__/hooks.test.tsx

Test Suites: 9 passed, 9 total
Tests:       50 passed, 50 total
Snapshots:   0 total
Time:        1.26 s, estimated 6 s
Ran all test suites matching /src\/framework\/vkg/i.
```
