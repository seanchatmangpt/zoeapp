# BRIEFING — 2026-05-30T20:47:00Z

## Mission
Implement Milestone 2 (Rebranding & Dependencies) in the zoeapp codebase.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: /Users/sac/zoeapp/.agents/worker_m2
- Original parent: 06a255cf-d3cb-450a-82fe-6698aa1e5863
- Milestone: Milestone 2 (Rebranding & Dependencies)

## 🔒 Key Constraints
- Avoid renaming third-party code references, Expo router imports, `<Stack.Screen>`, `<Tabs.Screen>`, or `screenOptions` since they are strictly required by third-party APIs. Only application-level occurrences of the term, such as screen components, titles, comments, JSDoc headers, and files, should be replaced.
- Perform the renaming precisely and cleanly. Do not use facade implementations or cheat.
- Run typecheck and linting to verify no compilation errors.
- Ensure "Offline Queue" and "Admissibility Backlog" are renamed to "Pre-Admission Tension Queue" instead of "Admissibility Backlog" (no occurrences of "Admissibility Backlog" should remain).


## Current Parent
- Conversation ID: 06a255cf-d3cb-450a-82fe-6698aa1e5863
- Updated: not yet

## Task Summary
- **What to build**: Rebranding of zoeapp to @truex/membrane-client and directory structure adjustments.
- **Success criteria**: All references/renames correctly handled, code compiling and type-checking successfully, tests passing.
- **Interface contracts**: PROJECT.md or similar files (if they exist).
- **Code layout**: Native and JS/TS codebase elements.

## Key Decisions Made
- Follow the exact renaming rules for directories and files first, then perform content replacements across files to avoid missing any renamed paths.

## Artifact Index
- /Users/sac/zoeapp/.agents/worker_m2/handoff.md — Final handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: None yet

## Loaded Skills
- None
