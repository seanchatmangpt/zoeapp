# Livestream Recovery Route Atlas

This document outlines the recovery path for livestream incidents, treating them as process-state transitions rather than media playback issues.

## State Machine
The livestream operates as a state machine with the following states:
- `Healthy`
- `Degraded`
- `Critical`

## Recovery Path

When in a degraded or critical state, the system must receive a `resolve` event to return to the `Healthy` state.

### Transitions
| From State | Event | To State |
|---|---|---|
| `Healthy` | `degrade` | `Degraded` |
| `Degraded` | `escalate` | `Critical` |
| `Degraded` | `resolve` | `Healthy` |
| `Critical` | `resolve` | `Healthy` |

### Recovery Procedure
1. **Identify State:** Determine if the stream is `Degraded` or `Critical`.
2. **Trigger Resolve:** Send the `resolve` event to the `livestream_degradation` hook.
3. **Verify:** The hook internal state will update the history log and transition the stream status to `Healthy`.
