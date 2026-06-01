# Zoe 2030 Process Mining and Conformance Checking

This module implements the **Dr. Wil van der Aalst AGI** process mining doctrine for secure governance of agent-native operations in the Zoe Framework.

For architectural design, see [process-mining.md](file:///Users/sac/zoeapp/docs/vision2030/framework/process-mining.md).

## 1. Formal Petri Net Schema

The execution path of agent operations is governed by a Petri Net containing the following components:

### Places
* `p_init`: Starting state for command processing.
* `p_received`: Command successfully parsed.
* `p_zkp_verified`: Cryptographic authorization checks passed.
* `p_membrane_approved`: Admissibility checks verified.
* `p_executed`: Operation code executed.
* `p_state_mutated`: State adjustments persisted.
* `p_completed`: Success state.
* `p_failed`: Sink for failed operations.

### Transitions
* `t_receive`: `p_init` -> `p_received`
* `t_verify_zkp_success`: `p_received` -> `p_zkp_verified`
* `t_verify_zkp_fail`: `p_received` -> `p_failed`
* `t_inspect_state`: `p_zkp_verified` -> `p_completed`
* `t_membrane_success`: `p_zkp_verified` -> `p_membrane_approved`
* `t_membrane_fail`: `p_zkp_verified` -> `p_failed`
* `t_execute_success`: `p_membrane_approved` -> `p_executed`
* `t_execute_fail`: `p_membrane_approved` -> `p_failed`
* `t_mutate_state`: `p_executed` -> `p_state_mutated`
* `t_complete`: `p_state_mutated` -> `p_completed`

---

## 2. OCEL 2.0 Log Format

Object-Centric Event Logs (OCEL) 2.0 store relationships between events and objects (commands, agents, membranes, and states).
Logs are serialized to JSON format with the following attributes:
* `eventTypes`
* `objectTypes`
* `events` (with `type`, `time`, `relationships`, `attributes`)
* `objects` (with `type`, `attributes`)

---

## 3. Token Replay Conformance checking

Replay logs compare traces to the Petri Net model to calculate Fitness ($f$):
$$f = \frac{1}{2} \left( \frac{c - m}{c} + \frac{p - r}{p} \right)$$
Where:
* $c$: consumed tokens
* $p$: produced tokens
* $m$: missing tokens
* $r$: remaining tokens

---

## 4. Process Drift Detection

Process drifts (shifts in agent behavior or governance rules over time) are detected using:
1. **Directly-Follows Relations (DFR) Distance**: Manhattan distance between the relative transition-pair frequencies of two adjacent trace windows.
2. **Fitness Drift**: Drop in average token-replay conformance fitness between two adjacent windows.
