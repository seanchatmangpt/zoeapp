# zoeapp migration plan v26.11.16

Standing: UNVERIFIED

## Identity
- Path: /Users/sac/zoeapp
- Remote: https://github.com/seanchatmangpt/zoeapp.git (origin/chore/dx-qol-testing)
- Branch: chore/dx-qol-testing@392aab2; last commit 2026-09-17; commits: 103; size: 53 MB
- Languages/build: Expo/React Native + Supabase (package.json, bun.lock, app.json,
  babel/eslint), Justfile. No CLAUDE.md.
- Nested repos: zoeapp/pcp_symlink -> /Users/sac/pcp (symlink, WARM, main@7731fea,
  dirty 288 / untracked 917, ahead 1; catalogued in /Users/sac/pcp's own plan)

## Observed state
- Dirty: 0. Untracked: 4 — docs/jira/v26.9.19/.
- In sync with origin/chore/dx-qol-testing (0/0). main is tracked at c114265. Stash: 19.
  Unpushed local branches: 11 — exp/db-docs-consistency-checker plus ~9
  subagent-*-agi-expo-supabase-swarm-* branches all at 633c392.
- .git 32M. No node_modules/. Submodules: none (symlink only).
- Secrets: .env, .env.zoe.local.bak present (not read) + .env.example.
- Root scratch: b64.txt, b64_chunks.txt, do_b64.js, do_exec.js, exec_cmd.sh, fix_*.js,
  gen_*.js, foo.ts — base64 payload/exec helpers from a swarm run.

## What it is
"Zoe" — an Expo Router + Supabase + OpenAI React Native app (auth, profiles, RLS, AI
assistant) extended with process-intelligence examples (construct8-market-physics,
bible-o-star, OpenBible/OSHB TTL provenance) and a livestream dashboard.

## Classification
ACTIVE (census agrees; last commit 2 months ago, 19 stashes, swarm branches).

## Migration risk
- 19 stashes (unknown content) and 11 unpushed branches (one real: exp/db-docs-...).
- .env and .env.zoe.local.bak local secrets.
- Depends on /Users/sac/pcp via symlink.
- Rating: MEDIUM

## Recommended action
COMMIT-PUSH

1. `cd /Users/sac/zoeapp && git add docs/jira && git commit -m "docs(jira): migration docs"`.
2. `git push origin chore/dx-qol-testing exp/db-docs-consistency-checker`; verify.
3. DECISION: the 9 subagent-* branches share one sha (633c392) — push one or none; delete
   the rest on the new machine.
4. DECISION on 19 stashes: inspect `git stash show -p stash@{N}` on a quiet day; if any
   matter, commit them to a branch before migration. Otherwise copy .git (32M) verbatim
   so they survive: `rsync -a /Users/sac/zoeapp/.git /Volumes/archive/zoeapp.git-backup/`.
5. Secrets: move .env / .env.zoe.local.bak out-of-band; confirm `git check-ignore .env`.
6. Delete root scratch (b64*.txt, do_*.js, exec_cmd.sh, gen_b64*.js, foo.ts) or commit
   under scripts/ — DECISION.
7. Recreate the symlink after pcp is cloned: `ln -s /Users/sac/pcp /Users/sac/zoeapp/pcp_symlink`.
8. `rm -rf node_modules android/build .expo` before any copy (absent now).

## First commands on the new machine
`git clone https://github.com/seanchatmangpt/zoeapp.git && cd zoeapp && bun install && \
 bun run lint && bun test` (or `just check`).

## See Also
- ../v26.9.19/ (previous jira dir)
- /Users/sac/docs/jira/v26.11.16/README.md (master index)
