# Release Ledger

This ledger defines the formal transitions for release discipline in the ZOEAPP project, governed by the `ReleaseDiscipline` process-law.

## Transitions

### 1. EAS Build
- **Trigger**: `StartBuild`
- **States**: `Idle` -> `Building` -> `Built`

### 2. OTA Updates
- **Trigger**: `TriggerUpdate`
- **States**: `Active` -> `Updating` -> `Active`

### 3. Version Transition
- **Trigger**: `StartVersionTransition`
- **States**: `Active` -> `Transitioning` -> `Active`

All transitions must follow the semantic laws defined in `release-process-law.ttl`.
