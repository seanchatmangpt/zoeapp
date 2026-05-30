# wasm4pm Example Integration Plan

This document outlines the detailed plan to port each wasm4pm example into native TS structures running under the Truex runtime.

## 1. Truex Receipt Verifier (`truex-cli.ts`)
- **Inputs**: Receipt envelope containing `session_id`, `ocel2` event log, `expected_path_hash`, `receipt_hash`.
- **Calculations**:
  - Recompute canonical string representation of `ocel2`.
  - Calculate SHA-256 batch hash (replacing BLAKE3 for native JS portability).
  - Verify receipt signature hash matches `computedReceiptHash`.
- **Truex Hook**: Runs inside the client/CLI trace analyzer.

## 2. Concept Drift Detector (`drift-detection.ts`)
- **Inputs**: Window of activities, smoothing lambda (0.2), activity key, threshold.
- **Calculations**:
  - Partition event log into sliding windows.
  - Calculate Jaccard distance between consecutive windows (relative activity set overlap).
  - Calculate Exponentially Weighted Moving Average (EWMA) of Jaccard distance.
  - Raise drift alerts when the EWMA exceeds the threshold.

## 3. Conformance Auditor (`conformance-audit-example.mjs`)
- **Inputs**: Declared process flow, actual trace spans.
- **Calculations**:
  - Translate command/event logs into a Directly-Follows Graph (DFG).
  - Compare actual DFG nodes/edges against the declared behavior specs in the registry.
  - Compute fitness, precision, and simplicity scores.

## 4. RL Orchestrator Monitor (`rl-monitoring.ts`)
- **Inputs**: Stream of telemetry metrics (alerts, rework ratios, errors).
- **Calculations**:
  - Reward calculation: `R = (1 - spc_alerts) * 0.4 + (1 - rework_ratio) * 0.4 + (guard_pass ? 0.2 : 0)`.
  - Simulate model optimization cycle.

## 5. Compliance Safety Guard (`prediction-next-activity.ts` / OCPQ)
- **Inputs**: Active VKG commands.
- **Calculations**:
  - Checks logic boundaries (e.g. multi-step order constraint: "If a command is rejected, no further commands for this actor should proceed").
