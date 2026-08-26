# Autonomic Behaviors Catalogue

This document catalogues the autonomic behaviors found in the TrueX Membrane Client framework.

## 1. Actor Supervisor Retries
- **Trigger**: Operation failure (exception) during an actor's command execution.
- **Action**: The `ActorSupervisor` performs exponential backoff retries (default 3 retries, 50ms base backoff).
- **User Visibility**: A slight delay in action completion; transparent if a subsequent retry succeeds.

## 2. Membrane Optimistic Rollback
- **Trigger**: A property mutation (set, delete, or define) is denied by the asynchronous `MembraneContext` validation.
- **Action**: The `ProxyableBridge` reverts the object's property to its original value and emits a "rollback" telemetry event.
- **User Visibility**: The UI state "snap back" or reverts to its previous value after an initial optimistic update.

## 3. Actor Dispatcher Compensating Rollback
- **Trigger**: A `rejected_remote` status is received from the authoritative remote dispatcher during outbox synchronization.
- **Action**: The `ActorDispatcher` explicitly reverts optimistic local Virtual Knowledge Graph (VKG) changes by removing added quads and re-adding removed quads. It also logs the failure to the `actor_quarantine` table.
- **User Visibility**: Application data reverts to its previous state; an error indicator or notification may appear; the command is marked as rejected/quarantined in logs.

## 4. Runtime Supervisor Quarantine
- **Trigger**: A hook or actor enters a failed state that the supervisor deems unrecoverable or requiring isolation (e.g., repeated execution failures).
- **Action**: The `HookRuntime` sets the actor's `quarantined` flag to `true`, preventing further message processing for that instance.
- **User Visibility**: Specific features or UI components powered by the quarantined actor may become unresponsive or display a "quarantined" warning.

## 5. Self-Healing Repair (Supervisor Intervention)
- **Trigger**: User or system-initiated `repairLastQuarantine` action.
- **Action**: The supervisor sends a `supervisor_signal` with a known good "repair state" to the actor, clears the `quarantined` flag, and resumes processing.
- **User Visibility**: A "Repair" button or indicator appears during incidents; clicking it restores the feature to a healthy, functional state.

## 6. Network-Aware Sync Persistence
- **Trigger**: Outbox synchronization failure due to being offline or network errors.
- **Action**: The `ActorSyncEngine` and `ActorDispatcher` pause synchronization and queue jobs for retry when connectivity is restored.
- **User Visibility**: A status banner (e.g., "Reconnecting to Truex Membrane...") appears; actions are queued and eventually synced without user intervention.

## 7. Error Boundary State Preservation
- **Trigger**: Uncaught exception within the React component tree.
- **Action**: The `ErrorBoundary` catches the crash, prevents further state corruption, and preserves the current system state for recovery.
- **User Visibility**: A fallback UI is shown with a message: "An unexpected tension occurred within the membrane client. The system state has been preserved."
