# Cleanup and Merge Plan: zoeapp

## Current State (as observed 2026-09-17)

| Path | Type | Git status | Last commit | Size |
|---|---|---|---|---|
| `/Users/sac/zoeapp` | independent repo, own product (`origin` = `github.com/seanchatmangpt/zoeapp.git`, unrelated to zoela's remote) | clean; branch `chore/dx-qol-testing` checked out, **27 commits ahead of `origin/chore/dx-qol-testing`** (needs push) | `8892f05` 2026-08-25 "feat(process-intelligence): add construct8-market-physics" | 1.2G |
| 10× `.gemini/antigravity-cli/.../worktrees/subagent-*-agi-expo-supabase-swarm-*` | git worktrees registered against zoeapp | all 10 point at the same stale commit `633c392` (2026-05-30) from an unrelated tool (a Gemini "antigravity-cli" agent swarm run), all reported `prunable` by `git worktree list --verbose` itself | 2026-05-30 | not separately measured — these are empty/small subagent-brain artifacts, not zoeapp checkouts |

zoeapp has **no worktree/scratch/duplicate sprawl** — it is a single clean checkout with unpushed commits and 10 harmless orphaned-tool worktree registrations. No `zoeapp-wt`, `zoeapp-worktrees`, `zoeapp-scratch`, or similar sibling directories exist anywhere under `/Users/sac`.


## What "merged" should look like

zoeapp has no worktree/scratch/duplicate sprawl to merge -- it is already a single canonical checkout. The only outstanding actions are hygiene, not consolidation:

- Push the 27 unpushed commits on  to  (or open a PR if that branch isn't meant to land directly).
- Prune the 10 stale, already- worktree registrations left behind by an unrelated Gemini antigravity-cli agent-swarm run.

## Commands to run (in order), once approved



## Open questions

- None outstanding for zoeapp itself. See  for the actual large worktree-sprawl family (zoela/zoela-wt/zoela-verify/zoela_phx), which is what generated most of the disk usage originally attributed to this investigation slot.

## Merge Execution Log (2026-09-17)

Re-verified current state before acting (all commands re-run live, not assumed from the doc above):

- `git status` on `/Users/sac/zoeapp`: clean except one untracked dir, `docs/jira/` (this plan doc itself, newly written by a prior pass).
- `git branch -vv`: `chore/dx-qol-testing` (HEAD, `8892f05`) already shows `up to date with 'origin/chore/dx-qol-testing'`; `git rev-list --left-right --count origin/chore/dx-qol-testing...HEAD` = `0 0`.
- `git reflog show origin/chore/dx-qol-testing` confirms the tip `8892f05` arrived via `update by push` — **the 27-commit push the doc flagged as outstanding was already completed** (by an earlier session/process, not this run). No push was needed or performed for this branch.
- `git worktree list --verbose` on the canonical repo shows only the primary checkout; `.git/worktrees/` does not exist. The 10 stale `subagent-*-agi-expo-supabase-swarm-*` **worktree registrations** the doc described are already gone — nothing to prune. (The 10 **local branches** of the same name still exist; see below — those are branches, not worktrees, and were left alone / archived, not deleted.)
- Filesystem sweep (`find /Users/sac -iname '*zoeapp*'`) confirms the doc's claim: no sibling `zoeapp-wt`/`zoeapp-scratch`/duplicate-repo directories exist anywhere under `/Users/sac`. `zoeapp-research-program/` and `docs/`-adjacent mentions elsewhere on disk are either already-tracked subdirectories of this same repo (clean, `git ls-files` confirms tracked) or unrelated files in other projects that merely mention "zoeapp" by name — not duplicate checkouts.

### New findings from this pass (not previously itemized in the doc)

1. **`exp/db-docs-consistency-checker` local branch had 2 unpushed, unique commits** not present on `chore/dx-qol-testing` or anywhere on `origin`: `2f16dee` (DATABASE.md vs. Supabase migrations consistency checker, `scripts/check_db_docs.py` + tests) and `d2d6872` (Justfile wiring for it). This was real, valuable, at-risk content (local-only, no upstream). **Action taken:** pushed as-is to origin, purely additive (new branch ref, no merge, no force):
   - `git push origin exp/db-docs-consistency-checker:exp/db-docs-consistency-checker` → `* [new branch] exp/db-docs-consistency-checker -> exp/db-docs-consistency-checker`, tip `d2d6872400869af4fb462b87ac4e1ba034caa92f`.
   - Verified with `git ls-remote --heads origin exp/db-docs-consistency-checker` → confirms `d2d6872…` present on origin.
   - Left un-merged into `chore/dx-qol-testing`/`main` intentionally — merging is a semantic decision (does the consistency checker still apply to the current schema/docs layout?) that belongs to a human review, not this pass. GitHub itself offered a compare/PR link: `https://github.com/seanchatmangpt/zoeapp/pull/new/exp/db-docs-consistency-checker`.

2. **The 10 `subagent-*-agi-expo-supabase-swarm-*` branches all point at the identical commit** `633c392ee63c05a57683a683d6760113e451b61f` (verified via `git rev-parse` on all 10 — byte-identical SHA, not just similar). This commit is **not** trivial/superseded noise as the original doc's characterization ("harmless orphaned-tool artifacts") suggested on first read — `git diff --stat` against its merge-base (`41ad774c`) shows a real, substantial divergent line of work: 369 files changed, 39,077 insertions (a "truex → Admissibility Backlog / Receipt Theater" rebrand, new `src/lib/vkg/*` modules, new Supabase edge functions and migrations, new route-law tests). This is exactly the kind of "unique valuable content on a scattered branch" this task exists to rescue.
   - **Attempted action:** back it up losslessly to origin under an archival name (no merge into any active branch — that would risk real conflicts against 3+ months of subsequent divergent history, which is not a "confidently safe/purely additive" action): `git push origin 633c392ee63c05a57683a683d6760113e451b61f:refs/heads/archive/agi-expo-supabase-swarm-2026-05-30`.
   - **Result: rejected by GitHub, not by us.** Push protection (GH013, secret scanning) blocked it: a live-looking **Supabase secret key is hardcoded in `scripts/cli/smoke/min.ts:18`**, in commit `0aeea5254656e7e1759ff606e99879df88111bad` (part of this same commit chain). GitHub's own message: "Push cannot contain secrets." No local state was touched by this attempt — the push simply failed server-side; all 10 local branches and the underlying commit remain exactly as they were, untouched, not deleted.
   - **This is now the one open, genuinely-manual item for zoeapp.** It cannot be resolved by more git mechanics without a human decision, per the hard constraint against guessing on discard/rewrite: rewriting the commit to strip the secret (`git filter-repo`/`BFG`) changes SHAs and is a history-rewrite, out of scope for an additive-only pass; approving GitHub's "allow secret" exception would publish a live credential to a remote and is not a call to make unilaterally; leaving it un-pushed (done) preserves it losslessly locally, which is the safe default until a human decides. The secret itself should also be checked for whether it is still live/in-use and rotated if so — independent of what happens to this branch.
   - Committed nothing else to canonical for these 10 branches; no data was discarded.

3. `main` branch vs. `chore/dx-qol-testing`: confirmed `chore/dx-qol-testing` is a strict superset (27 commits ahead, 0 behind). Whether `chore/dx-qol-testing` should be merged/PR'd into `main` is a product decision (branch may be intentionally still in flight), not decided in this pass — left as-is per the doc's own "(or open a PR if that branch isn't meant to land directly)" framing.

### Commands run (verification + action)

```
git status ; git branch -vv ; git remote -v ; git log --oneline -5
git rev-list --left-right --count origin/chore/dx-qol-testing...HEAD   # -> 0  0
git for-each-ref --format='%(refname:short) -> %(upstream:short)' refs/heads/
git log --oneline main..chore/dx-qol-testing | wc -l                   # -> 27
git log --oneline chore/dx-qol-testing..main | wc -l                   # -> 0
git log --oneline exp/db-docs-consistency-checker..chore/dx-qol-testing | wc -l   # -> 0
git log --oneline chore/dx-qol-testing..exp/db-docs-consistency-checker | wc -l   # -> 2
git worktree list --verbose
git reflog show origin/chore/dx-qol-testing | head -5
git push origin exp/db-docs-consistency-checker:exp/db-docs-consistency-checker  # succeeded, new branch
git rev-parse <each subagent-* branch>                                  # all identical: 633c392e...
git diff --stat 41ad774 633c392                                         # 369 files, +39077/-228
git push origin 633c392...:refs/heads/archive/agi-expo-supabase-swarm-2026-05-30  # REJECTED (GH013 secret scanning)
```

### Still open (for human decision / separate deletion pass)

- **Secret in history**: `scripts/cli/smoke/min.ts:18` on commit `0aeea525` (reachable from all 10 `subagent-*` branches / commit `633c392`) contains what GitHub identifies as a Supabase secret key. Needs: (a) confirm whether it's a live credential and rotate if so, (b) a human decision on how to preserve that 39k-line rebrand branch upstream — history-rewrite-and-push, or accept-and-allow via GitHub's URL, or leave local-only — before it is safe to push anywhere. Until decided, the content stays exactly where it already was: local-only, on the 10 identical `subagent-*` branches, untouched.
- **Merge/PR decision for `chore/dx-qol-testing` → `main`**: 27 commits, already pushed to origin, ready for a PR if that's the intent. Not opened here (a GitHub PR creation is a "send on the user's behalf"-adjacent action outside this pass's git-mechanics scope) — left for the user.
- **`exp/db-docs-consistency-checker` → merge decision**: now safely on origin (`d2d6872`) alongside `chore/dx-qol-testing`; whether the consistency checker still matches the current DATABASE.md/migrations layout, and whether to merge or PR it, is unverified/unevaluated here and left for a human/functional review.
- **Once a human has made the above calls**, everything now confirmed safe to remove in a separate deletion pass: the 10 `subagent-*-agi-expo-supabase-swarm-*` local branches (after the secret/backup decision above is resolved, so nothing is lost) — no other zoeapp-local cleanup candidates were found (no stale worktree directories exist on disk to remove; `docs/jira/` is new documentation, not cleanup debris).
