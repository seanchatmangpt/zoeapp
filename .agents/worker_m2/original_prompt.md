## 2026-05-30T20:46:48Z

Your identity: Worker 1 (teamwork_preview_worker)
Your working directory is: /Users/sac/zoeapp/.agents/worker_m2

Objective:
Implement Milestone 2 (Rebranding & Dependencies) in the zoeapp codebase.

1. Package & Dependency Declartions:
   - In package.json, add the new dependencies:
     "@truex/unjucks": "^1.0.0",
     "@truex/pictl": "^1.0.0",
     "@truex/pm4wasm": "^1.0.0",
     "@truex/zkp": "^1.0.0"
     (Note: Ensure no @seanchatmangpt/ dependencies remain, though none are currently in package.json).
   - In package.json scripts, rename "truex": "tsx scripts/truex.ts" to "truex": "tsx scripts/dispatch.ts".

2. File & Folder Renaming:
   - Rename directory `maestro/actor` to `maestro/truex-geometry`.
   - Rename file `scripts/truex.ts` to `scripts/dispatch.ts`.
   - Rename file `scripts/cli/commands/truex.ts` to `scripts/cli/commands/dispatch.ts`.
   - Rename file `src/app/(tabs)/__tests__/hooks-screen.test.tsx` to `src/app/(tabs)/__tests__/hooks-projection.test.tsx`.
   - Rename file `src/components/EditScreenInfo.tsx` to `src/components/EditProjectionInfo.tsx`.
   - Rename file `src/app/admin/dashboard.tsx` to `src/app/admin/consequence-supervision.tsx`.
   - Rename the Android package directory path:
     `android/app/src/main/java/com/truex/zoeapp` to `android/app/src/main/java/com/truex/membraneclient`.
     (Move MainActivity.kt and MainApplication.kt there, and update the Kotlin `package com.truex.zoeapp` header to `package com.truex.membraneclient` in both files).

3. Terminology Shift & References Renaming:
   - Replace "zoeapp" with "@truex/membrane-client" inside package.json (app name / identifier), app.json, db.ts, mmkvStorage.ts, build.gradle, project.pbxproj, Info.plist, and all Maestro YAML files (`.maestro/*.yaml`).
     For bundle identifier / android package, change `com.truex.zoeapp` to `com.truex.membraneclient`.
   - Perform the following terminology transitions across all files in `src/`, `scripts/`, `docs/`, and project root (case-insensitive where applicable, but preserve case and casing conventions, e.g. PascalCase vs camelCase, and JSDocs/comments):
     - "User Interface" / "Screen" → "Avatar-Relative Projection"
       (Note: Do NOT change third-party code references, Expo router imports, `<Stack.Screen>`, `<Tabs.Screen>`, or `screenOptions` since they are strictly required by third-party APIs. Only application-level occurrences of the term, such as screen components, titles, comments, JSDoc headers, and files, should be replaced).
     - "API Call" → "Propagation Trigger"
     - "Offline Queue" → "Admissibility Backlog"
     - "Dashboard" → "Consequence Supervision"
   - Rename internal references and imports to:
     - `zoeapp` → `@truex/membrane-client`
     - `maestro/actor` → `maestro/truex-geometry`
     - `scripts/truex.ts` → `scripts/dispatch.ts`
     - Update citty commands or CLI files references accordingly (e.g. truexCommand / dispatchCommand in the renamed files).

4. Verification:
   - Run typecheck and linting to verify no compilation errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Output Requirements:
- Write a detailed handoff report in /Users/sac/zoeapp/.agents/worker_m2/handoff.md detailing all modifications and verification results.
- Call send_message to notify the Project Orchestrator (conversation ID: 06a255cf-d3cb-450a-82fe-6698aa1e5863).

## 2026-05-30T20:51:06Z

**Context**: Rebranding Terminology Shift Update
**Content**: The requirements in ORIGINAL_REQUEST.md have been updated. The term "Admissibility Backlog" is now considered an old term and must NOT remain in the codebase.
Instead of rebranding "Offline Queue" to "Admissibility Backlog", the final rebranded term to use is "Pre-Admission Tension Queue".
Please ensure:
1. No occurrences of "Admissibility Backlog" remain in the codebase (except in this instruction/prompt file in .agents if applicable, but definitely not in src/, scripts/, docs/, or package.json).
2. All occurrences of "Offline Queue" and "Admissibility Backlog" are replaced with "Pre-Admission Tension Queue" (preserving case, e.g., "pre-admission tension queue").
3. Verify that typechecks, lint, and tests pass with this change.
**Action**: Please acknowledge receipt of this updated instruction and incorporate it into your rebranding work. Update your handoff report to reflect "Pre-Admission Tension Queue" as the final rebranded term.

