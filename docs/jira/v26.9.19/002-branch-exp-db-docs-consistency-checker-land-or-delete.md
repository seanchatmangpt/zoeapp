# zoeapp: land or delete remote branch `exp/db-docs-consistency-checker`

- Standing: OPEN
- Created: 2026-09-19 (v26.9.19 gh survey wave)
- Source: remote branch `exp/db-docs-consistency-checker` — not merged into `main`, no open PR
- Evidence: `git branch -r --no-merged origin/main` lists it; absent from `gh pr list` heads

## Work to complete
- Decide: open a PR (`gh pr create -R seanchatmangpt/zoeapp --head exp/db-docs-consistency-checker`) or delete (`git push origin --delete exp/db-docs-consistency-checker`).
- If superseded, delete; otherwise land through review.

## Acceptance
- After `git fetch --prune`, `git branch -r --no-merged origin/main` no longer lists `exp/db-docs-consistency-checker`.

## History
- 2026-09-19 | OPEN | survey found PR-less unmerged branch | exp/db-docs-consistency-checker | decision pending
