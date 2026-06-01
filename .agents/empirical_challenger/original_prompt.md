## 2026-06-01T10:10:08Z

Objective: Implement the comprehensive E2E test suite inside a new file `/Users/sac/process-intelligence/sources/wasm4pm/tests/e2e_tests.rs`.

Scope boundaries: Do not edit any other files. Only create and populate `/Users/sac/process-intelligence/sources/wasm4pm/tests/e2e_tests.rs`.

Input: The test cases should follow the 4-tier test plan and feature inventory. Use the fully implemented public APIs in the codebase:
- Type-Law: `Evidence`, `Lattice`, `WitnessState` (Bottom, PartialReplay, Top), typestates (Parsed, ValidatedSound, Replayed).
- Petri Net: `PetriNet`, `Marking`, `SoundnessResult`, transition firing and soundness checking.
- Sandbox & Safety: `GasMeter`, `RecursionGuard`, `FfiSafetyChecker`, `execute_oblivion_protocol` (oblivion protocol).
- FFI Sandboxing: `wasm_init`, `wasm_alloc`, `wasm_parse_and_query`, `wasm_shred_heap`, last error.
- OpenTelemetry: `OtelTrace`, `OtelSpan`, `verify_otel_trace` Blake3 span hashing, timing constraint validation, cyclic span dependency checking.

Write fully realized, compile-tested tests that cover these API components. Do not write placeholders or stubs. Ensure the file contains:
- `test_e2e_typelaw_monotonicity` (lattice join/meet, absorption laws)
- `test_e2e_typelaw_evidence_lifecycle` (typestate state transitions Parsed -> ValidatedSound -> Replayed)
- `test_e2e_petri_net_token_firing` (places, transitions, pre/post maps, firing)
- `test_e2e_petri_net_soundness` (WF-net soundness analysis on valid/invalid topologies)
- `test_e2e_sandbox_gas_meter` (GasMeter limits and balance)
- `test_e2e_sandbox_recursion_guard` (RecursionGuard depth limits)
- `test_e2e_sandbox_oblivion_protocol` (Oblivion protocol memory scrubbing)
- `test_e2e_safety_checker` (alignment, overflow, partition boundaries)
- `test_e2e_ffi_lifecycle` (wasm_init, wasm_alloc, wasm_parse_and_query)
- `test_e2e_otel_trace_verification` (OtelTrace parsing, Blake3 receipts verification, parent-child timing violation, cyclic dependency detection)

Output requirements: Write the complete code to `/Users/sac/process-intelligence/sources/wasm4pm/tests/e2e_tests.rs`. Ensure all modules compile successfully.

Completion criteria: `/Users/sac/process-intelligence/sources/wasm4pm/tests/e2e_tests.rs` is successfully created and compiles.

Mandatory Integrity Warning: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.
