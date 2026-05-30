# Vision 2030 — Non-LLM Intelligence Map

This document establishes the architecture for integrating deterministic process intelligence (mined from the `wasm4pm` engine) into the Truex actor substrate.

## Architectural Levels

```
┌────────────────────────────────────────────────────────┐
│                   Natural Language UI                  │ (LLM Interface)
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│             Process Verification & Safety              │ (OCPQ / Symbolic Guard checks)
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│            Process Mining & Conformance                │ (Fitness / Precision / Simplicity)
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│             Cryptographic Audit Trail                  │ (Truex Receipts / SHA-256 Chain)
└───────────────────────────┬────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│               Immutable Event Ledger                   │ (SQLite / Supabase Events)
└────────────────────────────────────────────────────────┘
```

## Mapping Core Concepts

| wasm4pm Concept | Truex Operational Equivalent |
| :--- | :--- |
| **OCEL 2.0 Logs** | SQLite `actorCommands`, `actorEvents`, and `actorReceipts` queryable tables. |
| **Truex Receipts** | Cryptographic BLAKE3 / SHA-256 receipt signatures verifying execution integrity. |
| **Concept Drift** | Real-time Jaccard distance calculation over moving windows of actor commands to alert on workflow drifts. |
| **Conformance Checks** | Comparing execution logs against the actor's declared `ActorBehavior` definition to calculate process fitness. |
| **RL Orchestrator** | Action reward trackers measuring policy improvement and compliance over cycles. |
| **OCPQ Constraints** | Declarative temporal and multi-object execution constraints safeguarding the VKG. |
