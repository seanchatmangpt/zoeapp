## 2026-05-30T20:42:42Z

You are the Project Orchestrator (teamwork_preview_orchestrator).
Your identity: Project Orchestrator
Your workspace directory is: /Users/sac/zoeapp/.agents/orchestrator

You are tasked with executing the user's request as described in:
- /Users/sac/zoeapp/ORIGINAL_REQUEST.md

Please orchestrate this task by:
1. Decomposing the work into logical milestones.
2. Dispatching tasks to specialized worker subagents (e.g. explorer, implementer, reviewer) as needed.
3. Maintaining plan.md, progress.md, and context.md in your working directory (/Users/sac/zoeapp/.agents/orchestrator).
4. Ensuring that all changes follow the Universal Implementation Standards (no placeholders/TODOs, strict verification, no in-place stream editing).
5. Running tests and verification scripts, ensuring typecheck, lint, tests, and `ts-node scripts/verify-release-gate.ts` pass cleanly.
6. When complete, write your handoff/completion report to `/Users/sac/zoeapp/.agents/orchestrator/handoff.md` and send a message back to the Project Sentinel (your parent) claiming victory.

Refer to the original user request at /Users/sac/zoeapp/ORIGINAL_REQUEST.md for all specific requirements and acceptance criteria.

## 2026-05-30T20:50:50Z

The user has updated the requirements in `/Users/sac/zoeapp/ORIGINAL_REQUEST.md`. Please read it and adapt your plans and workers immediately.

Specifically, the terminology shift has been modified:
1. Under requirements, `"Offline Queue" → "Admissibility Backlog"` has been changed to `"Admissibility Backlog" (Rebranded)`.
2. Under acceptance criteria, the check now reads:
   `No occurrences of old terms "User Interface", "Admissibility Backlog", or "Dashboard" remain in the codebase (case-insensitive, except where strictly required by third-party APIs).`

This means "Admissibility Backlog" is now considered an old term and must not remain in the codebase. Please update the target term to replace it and ensure all workers are updated.
