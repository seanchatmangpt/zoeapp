# Truex Membrane Framework: Execution Trust & Runtime Protection

The Membrane framework is the execution boundary and state gatekeeper of the Truex runtime. It ensures that every state mutation and capability invocation is validated before execution, logged cryptographically in a receipt chain, monitored for telemetric profiling, and isolated on failure.

---

## 1. Overview & Motivation

In complex decentralized environments, state transitions are prone to concurrency issues, undocumented side effects, unauthorized modifications, state drift, and unhandled execution failures. The Membrane module was introduced to solve these challenges by:
- **Enforcing Admissibility Barriers**: Intercepting capability invocations and verifying policies before mutations hit the state.
- **Providing Deterministic Consequence**: Cryptographically linking state changes into a hash chain of execution receipts.
- **Isolating Faults**: Quarantining crashing inputs, illegal state transitions, and unhandled errors.
- **Securing Direct Mutations**: Wrapping JavaScript objects in ES6 Proxies that intercept gets, sets, deletes, and defineProperty actions, automatically executing compensating rollbacks if the underlying transaction is denied.
- **Autonomous Recovery**: Supporting self-healing mechanisms that monitor receipt lineage, detect execution deadlocks, and roll back state to the last known good snapshot.

---

## 2. Architectural & Philosophical Mapping

The Membrane framework serves as the primary enforcement layer of the **Truex Architecture** and maps directly to the **Receipted Chatman Equation**:

$$R \vdash A = \mu(O^*)$$

Where:
- **$O^*$ (Lawful Closure Ontology)**: The real-time application state bounded by safety invariants and lawful transition families. The Membrane guarantees that state remains inside $O^*$ by validating all actions against registered flows and running interceptors.
- **$\mu$ (Transformation/Manufacturing Function)**: The code execution block or the mutation trap that transforms state.
- **$A$ (Emitted Consequence)**: The resulting state of the target object or the returned value.
- **$R$ (Receipt Lineage)**: The cryptographic audit chain managed by the `ReceiptManager`. Each receipt links back to the previous receipt's hash: $\text{deltaHash} = \text{sha256}(\text{prevHash} + \text{hash}(\text{consequence}))$. This provides mathematical proof that the sequence of state transitions was lawful and conforms to $R \vdash A$.

### Truex Lifecycle Mapping

The Membrane interacts with the core Truex layers (Membrane, Intake, Projection, Supervision) as follows:

```
┌────────────────────────────────────────────────────────────────────────┐
│                                INTAKE                                  │
│                 (Command ID & Capability Input Received)               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                               MEMBRANE                                 │
│  (Evaluates Interceptors, Validates Trajectories, Checks Entitlements) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
               Allowed                              Denied
                  │                                   │
                  ▼                                   ▼
┌───────────────────────────────────┐       ┌────────────────────────────┐
│            PROJECTION             │       │        SUPERVISION         │
│ (Optimistic Write applied via ES6 │       │ (Emits Refusal, rolls back │
│  Proxy and execution block run)   │       │  mutations, Quarantines)   │
└─────────────────┬─────────────────┘       └────────────────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│            SUPERVISION            │
│ (Executes sha256 Hash Chain,      │
│  Appends Receipt, Captures State) │
└───────────────────────────────────┘
```

1. **Intake**: Operations target a specific `capabilityId` with a given `commandId` and `input`.
2. **Membrane**: The Membrane evaluates interceptors and validates trajectories. If a transition is illegal or an interceptor returns `deny`, execution is blocked.
3. **Projection**: In strict/optimistic execution, the state is wrapped in a proxy target. Writes are optimistically projected, and the actual execution block is run.
4. **Supervision**: If execution fails or is denied post-facto (e.g., due to a trajectory transition error or code crash), the supervisor performs a compensating rollback of the optimistic projection, quarantines the failing input/command/error, and registers the failure in the audit log. In the `SelfHealingMembrane`, supervision extends to detecting deadlocks and chain corruptions, triggering autonomous rollbacks to the last known good state snapshot.

---

## 3. Source Code Structure

The module is structured as follows:

- [index.ts](file:///Users/sac/zoeapp/src/framework/membrane/index.ts): Exports all public-facing classes, functions, and interfaces.
- [types.ts](file:///Users/sac/zoeapp/src/framework/membrane/types.ts): Contains common TypeScript interfaces for configurations, receipts, context, and events.
- [membrane.ts](file:///Users/sac/zoeapp/src/framework/membrane/membrane.ts): Houses the core `Membrane` class that orchestrates execution, telemetry, receipts, audits, and quarantine.
- [proxy.ts](file:///Users/sac/zoeapp/src/framework/membrane/proxy.ts): Employs the `ProxyFactory` class to wrap JS targets, enabling optimistic mutation rollbacks and telemetry emission.

### Managers (`src/framework/membrane/managers/`)
- [managers/audit.ts](file:///Users/sac/zoeapp/src/framework/membrane/managers/audit.ts): Manages security audit trails (`SecurityAuditEvent`) and dispatches notifications to listeners.
- [managers/interceptors.ts](file:///Users/sac/zoeapp/src/framework/membrane/managers/interceptors.ts): Chains validation middleware to output admissibility verdicts (`allow`, `deny`, `fork`, `observe`).
- [managers/quarantine.ts](file:///Users/sac/zoeapp/src/framework/membrane/managers/quarantine.ts): Isolates crashed inputs, trajectory violations, or operational faults.
- [managers/receipts.ts](file:///Users/sac/zoeapp/src/framework/membrane/managers/receipts.ts): Generates cryptographic proof-of-execution receipts and validates chain lineage integrity.
- [managers/telemetry.ts](file:///Users/sac/zoeapp/src/framework/membrane/managers/telemetry.ts): Emits granular lifecycle events (`set`, `get`, `delete`, `rollback`) and measures duration using span boundaries.
- [managers/trajectories.ts](file:///Users/sac/zoeapp/src/framework/membrane/managers/trajectories.ts): Enforces process grammar by ensuring that state transitions follow registered flows.

### Decentralized Governance (`src/framework/membrane/governance/`)
- [governance/index.ts](file:///Users/sac/zoeapp/src/framework/membrane/governance/index.ts): Entry point for the governance system.
- [governance/types.ts](file:///Users/sac/zoeapp/src/framework/membrane/governance/types.ts): Typings for verification status, steps, requests, flow configs, and hooks.
- [governance/manager.ts](file:///Users/sac/zoeapp/src/framework/membrane/governance/manager.ts): Orchestrates multi-party verification steps for high-tension operations.
- [governance/interceptor.ts](file:///Users/sac/zoeapp/src/framework/membrane/governance/interceptor.ts): Creates a membrane interceptor that catches high-tension mutations and moves them into a pending verification queue.

### Self-Healing & Autonomous Recovery (`src/framework/membrane/self-healing/`)
- [self-healing/index.ts](file:///Users/sac/zoeapp/src/framework/membrane/self-healing/index.ts): Defines the `SelfHealingMembrane` extending the base class.
- [self-healing/types.ts](file:///Users/sac/zoeapp/src/framework/membrane/self-healing/types.ts): Defines self-healing configuration, results, and state tracking structures.
- [self-healing/manager.ts](file:///Users/sac/zoeapp/src/framework/membrane/self-healing/manager.ts): Serializes state snapshots, verifies chain lineage, registers deadlock polling intervals, and executes autonomous state rollbacks.

### Tests
- [__tests__/membrane.test.ts](file:///Users/sac/zoeapp/src/framework/membrane/__tests__/membrane.test.ts): Tests core execution, ES6 proxy traps, audit trails, and trajectory validation.
- [governance/__tests__/governance.test.ts](file:///Users/sac/zoeapp/src/framework/membrane/governance/__tests__/governance.test.ts): Asserts high-tension transition trapping, step completion, and hook propagation.
- [self-healing/__tests__/self-healing.test.ts](file:///Users/sac/zoeapp/src/framework/membrane/self-healing/__tests__/self-healing.test.ts): Verifies autonomous rollback on chain corruption, deadlock detection timing, and hard-reset fallbacks.

---

## 4. API Contracts & Specifications

### 4.1 Core Membrane

#### `Membrane` Class
The main runtime coordinator.
- **Properties**:
  - `config: MembraneConfig` - The active mode (`strict`, `simulate`, `audit`) and context metadata.
  - `interceptors: InterceptorManager` - Manages gatekeeping interceptors.
  - `receipts: ReceiptManager` - Tracks execution receipts.
  - `quarantine: QuarantineManager` - Isolates failed executions.
  - `trajectories: TrajectoryManager` - Enforces state transitions.
  - `telemetry: TelemetryManager` - Measures runtime performance.
  - `audit: AuditManager` - Records critical security logs.
- **Methods**:
  - `constructor(config: MembraneConfig)`: Instantiates the membrane and its sub-managers.
  - `run<T>(capabilityId: string, commandId: string, input: any, executionBlock: () => Promise<T>): Promise<ExecutionResult<T>>`: Runs an execution block inside the membrane boundary.
  - `getConfig(): MembraneConfig`: Returns the active configuration.

#### `ProxyFactory` Class
Generates ES6 proxies to wrap runtime objects.
- **Methods**:
  - `static wrap<T extends object>(target: T, membrane: Membrane, options?: ProxyWrapperOptions): T`: Wraps `target` in a proxy governed by the `membrane`. Optimistically writes properties, handles async validation rollbacks on deny, and intercepts nested objects lazily.

---

### 4.2 Sub-Managers

#### `InterceptorManager`
- **Methods**:
  - `register(interceptor: InterceptorFunction): void`: Adds a middleware to the evaluation chain.
  - `clear(): void`: Empties the interceptor chain.
  - `evaluate(ctx: InterceptorContext): Promise<AdmissibilityVerdict>`: Resolves interceptors. Returns `'deny'` if any return `false`, `'fork'` if any return `true`, or `'allow'` if all pass.

#### `ReceiptManager`
- **Methods**:
  - `clear(): void`: Resets the chain history.
  - `append(receipt: MembraneReceipt): void`: Directly appends a receipt.
  - `getLastHash(): string`: Returns the hash of the most recent receipt, or `''` if empty.
  - `getHistory(): MembraneReceipt[]`: Returns a shallow copy of the receipt chain.
  - `emitRefusal(commandId: string, capabilityId: string, prevHash: string, errorMsg: string): Promise<MembraneReceipt>`: Generates and appends a refusal receipt.
  - `validateChain(): { valid: boolean; error?: string }`: Verifies that the previous hash in each receipt matches the hash of its predecessor.

#### `QuarantineManager`
- **Methods**:
  - `clear(): void`: Clears quarantined records.
  - `getRecords(): QuarantineRecord[]`: Retrieves the list of quarantined files.
  - `isolate(commandId: string, payload: any, errorMsg: string): Promise<QuarantineRecord>`: Creates a quarantine record and pushes it to history.

#### `TrajectoryManager`
- **Methods**:
  - `registerFlow(flowName: string, allowedTransitions: Record<string, string[]>): void`: Registers a valid workflow state machine.
  - `validateTransition(flowName: string, fromState: string, toState: string): boolean`: Evaluates if the transition is allowed.
  - `getFlow(flowName: string): Record<string, string[]> | undefined`: Returns a registered workflow config.

#### `TelemetryManager`
- **Methods**:
  - `register(listener: TelemetryListener): void`: Subscribes to telemetry events.
  - `unregister(listener: TelemetryListener): void`: Unsubscribes from events.
  - `clear(): void`: Clears all listeners.
  - `emit(event: MembraneTelemetryEvent): void`: Dispatches an event.
  - `startSpan(name: string, traceId?: string, parentSpanId?: string): string`: Starts a telemetry span and returns a unique `spanId`.
  - `endSpan(spanId: string): void`: Ends a span and calculates duration in milliseconds.

#### `AuditManager`
- **Methods**:
  - `registerListener(listener: AuditListener): void`: Subscribes to audit logs.
  - `unregisterListener(listener: AuditListener): void`: Unsubscribes.
  - `log(level: 'info' | 'warn' | 'critical', action: string, details: Record<string, any>, commandId?: string, capabilityId?: string, actorId?: string): void`: Logs a security event.
  - `getLogs(): SecurityAuditEvent[]`: Retrieves audit events.
  - `clear(): void`: Clears audit records.

---

### 4.3 Governance

#### `ApprovalFlowManager`
- **Methods**:
  - `registerConfig(config: ApprovalFlowConfig): void`: Registers approval flow configs for specific capability IDs.
  - `registerHook(hook: GovernanceHook): void`: Attaches lifecycle hooks.
  - `findMatchingConfig(capabilityId: string, input: any): ApprovalFlowConfig | undefined`: Finds matching configurations.
  - `initiateApproval(ctx: InterceptorContext): Promise<VerificationRequest>`: Requests multi-party approvals.
  - `completeStep(requestId: string, stepId: string, actorId: string): Promise<VerificationRequest>`: Completes an approval step and triggers a resolve when all steps are approved.
  - `rejectRequest(requestId: string, reason: string): Promise<VerificationRequest>`: Rejects the request.
  - `getRequest(requestId: string): VerificationRequest | undefined`: Gets the request details.
  - `getPendingRequests(): VerificationRequest[]`: Gets all pending requests.

#### `createGovernanceInterceptor`
- **Function Signature**:
  `createGovernanceInterceptor(manager: ApprovalFlowManager): InterceptorFunction`
  Halts immediate execution (returns `false` to deny) when high-tension mutations are matched, moving them into the pending queue.

---

### 4.4 Self-Healing

#### `SelfHealingMembrane`
- **Inherits**: `Membrane`
- **Methods**:
  - `constructor(config: MembraneConfig, target: any, shConfig?: SelfHealingConfig)`: Instantiates a self-healing membrane.
  - `run<T>(...)`: Overrides `Membrane.run()` to capture state snapshots on success.
  - `dispose(): void`: Cleans up deadlock check timers.

#### `SelfHealingManager`
- **Methods**:
  - `heal(): Promise<HealingResult>`: Checks receipt chain integrity, finds the last valid receipt, restores the target state to that snapshot, and truncates invalid receipts. If no snapshot is found, performs a hard-reset (empty object `{}`).
  - `captureSnapshot(receiptHash: string): void`: Serializes target object state and associates it with `receiptHash`. Maintains the maximum snapshot cache limit.
  - `getState(): Readonly<SelfHealingState>`: Retrieves current healing status.
  - `dispose(): void`: Clears timers and caches.

---

## 5. Usage Guide

Below is a production-ready, complete TypeScript code block demonstrating how to instantiate a `SelfHealingMembrane`, wrap a target object in an ES6 Proxy, configure trajectory state transitions, set up decentralized governance for high-tension events, subscribe to telemetry/audit logs, and drive the execution lifecycle:

```typescript
import { 
  Membrane, 
  SelfHealingMembrane, 
  ProxyFactory, 
  ApprovalFlowManager, 
  createGovernanceInterceptor,
  MembraneTelemetryEvent,
  SecurityAuditEvent,
  ExecutionResult
} from './index';

// 1. Define target application state type
interface VaultState {
  balance: number;
  status: 'active' | 'suspended' | 'closed';
  owner: string;
}

// 2. Initialize raw state
const rawVaultState: VaultState = {
  balance: 5000,
  status: 'active',
  owner: 'actor_alice'
};

// 3. Create the SelfHealingMembrane instance
const membrane = new SelfHealingMembrane(
  { mode: 'strict', tenantId: 'tenant-omega-9' },
  rawVaultState,
  { deadlockTimeoutMs: 2000, autoHeal: true, maxSnapshots: 10 }
);

// 4. Wrap the target object inside the Proxy
const vaultProxy = ProxyFactory.wrap(rawVaultState, membrane, {
  flowName: 'VaultOperationFlow',
  onMutation: (prop, val) => {
    console.log(`[Proxy Mutation] Property '${String(prop)}' updated to:`, val);
  }
});

// 5. Register Trajectory Workflows on the membrane
// We define a state transition flow for the vault status field
membrane.trajectories.registerFlow('VaultStatusWorkflow', {
  active: ['suspended', 'closed'],
  suspended: ['active', 'closed'],
  closed: [] // Terminal state
});

// 6. Setup Decentralized Governance for high-tension changes
const governanceManager = new ApprovalFlowManager();

// Register a flow requiring approval for high-value transfers (mutations > $1,000)
governanceManager.registerConfig({
  id: 'high-value-vault-mutation',
  capabilityPattern: 'vault.modify',
  tensionPredicate: (input: any) => {
    return input.amount && input.amount > 1000;
  },
  steps: [
    { id: 'risk_officer', label: 'Risk Officer Signoff', requiredRole: 'risk' },
    { id: 'board_member', label: 'Board Director Signoff', requiredRole: 'director' }
  ]
});

// Register governance hooks
governanceManager.registerHook({
  onVerificationRequested: (req) => {
    console.log(`[Governance Alert] Verification required for request ID: ${req.id} (Command: ${req.commandId})`);
  },
  onStepCompleted: (req, stepId) => {
    console.log(`[Governance Update] Step '${stepId}' completed on request ${req.id}`);
  },
  onVerificationResolved: (req) => {
    console.log(`[Governance Resolved] Request ${req.id} has been resolved with status: ${req.status}`);
  }
});

// Integrate governance into the membrane's interceptor chain
const govInterceptor = createGovernanceInterceptor(governanceManager);
membrane.interceptors.register(govInterceptor);

// 7. Subscribe to Telemetry and Security Audit events
membrane.telemetry.register((event: MembraneTelemetryEvent) => {
  console.log(`[Telemetry Event] Type: ${event.type} | Property: ${event.property} | Duration: ${event.durationMs ?? 0}ms`);
});

membrane.audit.registerListener((event: SecurityAuditEvent) => {
  console.log(`[Audit Trail - ${event.level.toUpperCase()}] Action: ${event.action} | Details:`, event.details);
});


// ==========================================
// SCENARIO A: Safe Operation within standard parameters
// ==========================================
async function performSafeTransfer() {
  console.log('\n--- Scenario A: Performing Safe Transfer ---');
  
  const result: ExecutionResult<boolean> = await membrane.run(
    'vault.transfer',
    'cmd_tx_101',
    { amount: 200 },
    async () => {
      // Modify state safely inside the execution block
      vaultProxy.balance -= 200;
      return true;
    }
  );

  console.log(`Success: ${result.success}. Current Balance: $${vaultProxy.balance}`);
  console.log(`Emitted Receipt Hash: ${result.receipt.deltaHash}`);
}

// ==========================================
// SCENARIO B: Violation of State Trajectories (Quarantined)
// ==========================================
async function performIllegalStateTransition() {
  console.log('\n--- Scenario B: Performing Illegal State Transition ---');
  
  // Attempting to move state directly from 'closed' to 'active' which is illegal
  const result = await membrane.run(
    'vault.transition',
    'cmd_tx_102',
    {
      flowName: 'VaultStatusWorkflow',
      fromState: 'closed',
      toState: 'active'
    },
    async () => {
      vaultProxy.status = 'active';
      return true;
    }
  );

  console.log(`Success: ${result.success}. Error: ${result.error}`);
  console.log('Quarantined records:', membrane.quarantine.getRecords());
}

// ==========================================
// SCENARIO C: Intercepting High-Tension (Governance Pending)
// ==========================================
async function performHighTensionTransfer() {
  console.log('\n--- Scenario C: Requesting High-Tension Transfer ---');

  // Evaluated by the governance interceptor; amount exceeds $1000 threshold
  const result = await membrane.run(
    'vault.modify',
    'cmd_tx_103',
    { amount: 5000 },
    async () => {
      vaultProxy.balance -= 5000;
      return true;
    }
  );

  console.log(`Success: ${result.success}. Error: ${result.error}`); // Will be false/Denied by membrane
  
  const pendingRequests = governanceManager.getPendingRequests();
  if (pendingRequests.length > 0) {
    const request = pendingRequests[0];
    console.log(`Pending Request ID: ${request.id}`);
    
    // Complete steps to simulate multi-party approvals
    await governanceManager.completeStep(request.id, 'risk_officer', 'user_risk_bob');
    await governanceManager.completeStep(request.id, 'board_member', 'user_director_carol');
    
    // Once approved, run the operation again
    const retryResult = await membrane.run(
      'vault.modify',
      'cmd_tx_103_retry',
      { amount: 5000, bypassGovernance: true }, // Ensure predicate or bypass allows it
      async () => {
        // Run mutation directly
        vaultProxy.balance -= 5000;
        return true;
      }
    );
    console.log(`Execution after approvals - Success: ${retryResult.success}. Current Balance: $${vaultProxy.balance}`);
  }
}

// Execute Scenario Runners
async function runAll() {
  await performSafeTransfer();
  await performIllegalStateTransition();
  await performHighTensionTransfer();
  
  // Dispose membrane timers
  membrane.dispose();
}

runAll().catch(console.error);
```

---

## 6. Testing

The Membrane framework uses a Jest-based test suite that exercises all validation, telemetry, auditing, proxy trapping, and autonomous state healing capabilities.

### Running Tests
Execute the following commands in the workspace root directory:

```bash
# Run all membrane-related tests (Core, Governance, and Self-Healing)
npx jest src/framework/membrane

# Run only the core Membrane tests
npx jest src/framework/membrane/__tests__/membrane.test.ts

# Run only the Decentralized Governance tests
npx jest src/framework/membrane/governance/__tests__/governance.test.ts

# Run only the Self-Healing tests
npx jest src/framework/membrane/self-healing/__tests__/self-healing.test.ts
```

### Coverage Scope

| Test Suite | Verifies | Key Assertions |
|---|---|---|
| **Core Membrane** | Gated execution paths, interceptor evaluation, exception handling, and cryptographic hashing. | Checks that interceptor refusals return correct error codes and result in refusal receipts; checks that thrown code exceptions trigger automatic isolation in quarantine; asserts that the cryptographic hash sequence matches transition lineage. |
| **Proxy Trapping** | ES6 Proxy trap intercepts, nested lazy proxying, telemetry emission, and mutation rollbacks. | Asserts that property mutations, `defineProperty`, and `deleteProperty` traps trigger telemetry logs; tests that if an interceptor denies a set/define/delete action, the proxy successfully performs a rollback to restore the target property. |
| **Decentralized Governance** | High-tension command interception, multi-step signature aggregation, and governance hooks. | Checks that high-tension actions automatically fail fast while placing a verification request in the pending queue; verifies that multi-step completion flows trigger appropriate lifecycle hooks; ensures double completion or missing step scenarios raise appropriate exceptions. |
| **Self-Healing** | Snapshot capture, receipt chain integrity validation, deadlock polling, and rollback. | Asserts that successful executions capture target state snapshots; simulates chain corruption (modifying previous hashes) and validates that the manager successfully rolls back target state properties to the last known good snapshot; checks that deadlocks trigger auto-healing; verifies hard reset to `{}` when no snapshots exist. |
