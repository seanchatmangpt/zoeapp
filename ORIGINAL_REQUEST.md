# Original User Request

## Initial Request — 2026-05-30T20:42:21Z

Complete the Truex architectural rebranding and missing invariants for the `zoeapp` codebase.

Working directory: /Users/sac/zoeapp
Integrity mode: development

## Requirements

### R1. Namespace and Terminology Transition
1. Rename all internal references, files, and imports to use the new namespaces:
   - `zoeapp` → `@truex/membrane-client`
   - `maestro/actor` → `maestro/truex-geometry`
   - `scripts/truex.ts` → `scripts/dispatch.ts`
2. Perform terminology shift across all documentation, UI text, and comments:
   - "User Interface" / "Screen" → "Avatar-Relative Projection"
   - "API Call" → "Propagation Trigger"
    - "Offline Queue" → "Pre-Admission Tension Queue"
   - "Dashboard" → "Consequence Supervision"
3. Update package dependency declarations in `package.json` for migrated/aliased packages to use the new `@truex` scope:
   - `@seanchatmangpt/unjucks` → `@truex/unjucks`
   - `@seanchatmangpt/pictl` → `@truex/pictl`
   - `@seanchatmangpt/pm4wasm` → `@truex/pm4wasm`
   - `@unrdf/zkp` → `@truex/zkp`

### R2. Strict Membrane Traps & Receipt-Driven UI Invariants
1. Ensure all global state mutations in Expo use membrane traps (such as `proxyable`) so that state transitions cannot bypass Truex envelope generation.
2. Refactor the UI screens to use a "Receipt Theater" defense model where projections/screens do not unlock until the local storage (SQLite/MMKV) records the matching BLAKE3 receipt.

### R3. Verification and Clean Build
1. Ensure `npm run typecheck` and `npm run lint` execute successfully without errors.
2. Ensure the release gate verification script `npm run truex verify` (using `scripts/verify-release-gate.ts`) passes successfully.
3. Make sure all existing test suites in the repository run and pass cleanly.

## Acceptance Criteria

### Static Checks and Clean Build
- [ ] No occurrences of old terms "User Interface", "Offline Queue", or "Dashboard" remain in the codebase (case-insensitive, except where strictly required by third-party APIs).
- [ ] No occurrences of `@seanchatmangpt/` dependencies remain in `package.json` or source imports.
- [ ] `npm run typecheck` passes with zero typescript compilation errors.
- [ ] `npm run lint` passes without any violations.

### Verification Run
- [ ] The command `ts-node scripts/verify-release-gate.ts` (or package script equivalent) completes successfully with exit code 0.
- [ ] All tests in `src/lib/crypto/verify-release-gate.test.ts` and general test suites pass.
