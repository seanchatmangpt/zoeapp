# BRIEFING — 2026-05-30T20:42:47Z

## Mission
Complete the Truex architectural rebranding and missing invariants for the zoeapp codebase.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/sac/zoeapp/.agents/orchestrator
- Original parent: main agent
- Original parent conversation ID: a8629b46-c5b9-47eb-8183-2ccb8e00ac4a

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: /Users/sac/zoeapp/PROJECT.md
1. **Decompose**: Split work into parallel/sequential milestones based on decoupled features/modules.
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: Explorer → Worker → Reviewer → Gate
   - **Delegate (sub-orchestrator)**: Spawn a sub-orchestrator for large milestones or dual tracks.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Milestone 1: Discovery & Analysis [pending]
  2. Milestone 2: Rebranding & Dependencies [pending]
  3. Milestone 3: Membrane Traps [pending]
  4. Milestone 4: Receipt Theater [pending]
  5. Milestone 5: E2E & Gate Verification [pending]
- **Current phase**: 1
- **Current focus**: Milestone 1: Discovery & Analysis

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- All changes must follow Universal Implementation Standards.
- Binary veto by Forensic Auditor on integrity violations.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: a8629b46-c5b9-47eb-8183-2ccb8e00ac4a
- Updated: not yet

## Key Decisions Made
- Rebranded term "Admissibility Backlog" is now deprecated; the final target name for the Offline Queue is "Pre-Admission Tension Queue". We updated the Worker's instructions mid-flight.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_1 | teamwork_preview_explorer | Rebrand Terminology/Files | completed | ddbd6c56-7a07-46b0-b0ac-a5f83e746b35 |
| explorer_2 | teamwork_preview_explorer | Dependencies/Membrane Traps | completed | 4bca53b3-b9b6-4640-a7eb-54909da0493b |
| explorer_3 | teamwork_preview_explorer | Receipt Theater/Storage | completed | 6f105460-46e0-441a-ba97-688a223488db |
| worker_1 | teamwork_preview_worker | Rebrand & Dependency Transition | in-progress | 7b04901c-be0a-4ef1-8b7c-97387977033b |

## Succession Status
- Succession required: no
- Spawn count: 4 / 16
- Pending subagents: 7b04901c-be0a-4ef1-8b7c-97387977033b
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: task-13
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- /Users/sac/zoeapp/PROJECT.md — Global project layout and milestone tracker.
- /Users/sac/zoeapp/.agents/orchestrator/original_prompt.md — Copy of the original user prompt.
