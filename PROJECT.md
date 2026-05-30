# Project: Truex Architectural Rebranding and Invariants

## Architecture
`zoeapp` is an Expo/React Native application acting as an operational membrane for telemetry intake and avatar projections. It interacts with SQLite and a local sync queue, settling state transitions against a Supabase Edge Truex Kernel.
- **State mutations**: Must pass through membrane traps (`proxyable`) to ensure Truex envelope generation.
- **UI Projections**: Must implement a "Receipt Theater" defense model, remaining locked until SQLite records a matching BLAKE3 receipt.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Discovery & Analysis | Map out all old references, dependencies, and state mutation/UI structures | None | IN_PROGRESS (ddbd6c56, 4bca53b3, 6f105460) |
| 2 | Rebranding & Dependencies | Rename files/folders, update package.json, replace terminology & imports | M1 | PLANNED |
| 3 | Membrane Traps | Implement/verify proxyable membrane traps on all global state mutations | M2 | PLANNED |
| 4 | Receipt Theater | Refactor projections to require BLAKE3 receipt in local storage before unlock | M3 | PLANNED |
| 5 | E2E & Gate Verification | Ensure all tests pass, lint/typecheck passes, and verify-release-gate script succeeds | M4 | PLANNED |

## Interface Contracts
### UI Projections ↔ Local Storage (SQLite/MMKV)
- Projections query local storage for BLAKE3 receipts.
- Screen unlocks only when a matching receipt is recorded.
