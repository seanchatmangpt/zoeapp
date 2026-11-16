# zoeapp: land or delete remote branch `chore/dx-qol-testing`

- Standing: OPEN
- Created: 2026-09-19 (v26.9.19 gh survey wave)
- Source: remote branch `chore/dx-qol-testing` — not merged into `main`, no open PR
- Evidence: `git branch -r --no-merged origin/main` lists it; absent from `gh pr list` heads

## Work to complete
- Decide: open a PR (`gh pr create -R seanchatmangpt/zoeapp --head chore/dx-qol-testing`) or delete (`git push origin --delete chore/dx-qol-testing`).
- If superseded, delete; otherwise land through review.

## Acceptance
- After `git fetch --prune`, `git branch -r --no-merged origin/main` no longer lists `chore/dx-qol-testing`.

## History
- 2026-09-19 | OPEN | survey found PR-less unmerged branch | chore/dx-qol-testing | decision pending
