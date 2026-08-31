# Security History Cleanup Plan

> Status: **PLAN ONLY — NO HISTORY REWRITE PERFORMED**
> Date: 2026-08-31
> Prepared by: P1 hardening pass

## Reason for cleanup

During the production audit and P0 remediation it was confirmed that **real production
credentials were committed to this repository**. The values have been removed from the
working tree / example files, but they still exist in Git history and must be treated as
**compromised**.

Exposed credential categories (values never printed here):

- Neon PostgreSQL password (inside `DATABASE_URL` / `DIRECT_URL`)
- Redis password (inside `REDIS_URL`)
- JWT access secret (`JWT_ACCESS_SECRET`)
- JWT refresh secret (`JWT_REFRESH_SECRET`)
- Admin password (`ADMIN_PASSWORD`)

## Affected files (in Git history)

| File | Contains | Notes |
|------|----------|-------|
| `.env.example` (repo root) | Neon DB password, Redis password, JWT secrets, admin password, default temp password | committed historically |
| `services/auth/.env.example` | same as above | committed historically |
| `packages/database/.env.example` | same as above | committed historically |
| `services/auth/.env.production.example` | weak default temp password (`Welcome@123`) | low severity |

These files were scrubbed in the working tree during P0. The committed blobs remain in history.

## Current repository state

- Branch: `main`
- Remote: `origin` → `https://github.com/abx15/trifusiondynamics.git` (shared, public)
- `git-filter-repo`: **NOT installed** in this environment → cannot safely rewrite history here.
- Protected branch / force-push policy: assumed protected. Any rewrite requires force-push.

## Recommended cleanup (deferred — requires maintainer action)

1. **Rotate every exposed credential first** (see `docs/SECRET_ROTATION_CHECKLIST.md`).
   Rotation MUST happen before OR immediately after the history rewrite so the new history
   never contains valid secrets.
2. Install `git-filter-repo` on a trusted machine with maintainer privileges.
3. Run from a clean clone of `main`:

   ```bash
   # Remove the committed secret example files from ALL history
   git filter-repo --invert-paths \
     --path .env.example \
     --path services/auth/.env.example \
     --path packages/database/.env.example

   # If secret strings also leaked into other paths, additionally use:
   # git filter-repo --replace-text secrets.txt
   # where secrets.txt maps each secret to ***REMOVED*** (do NOT put real values in this file)
   ```

4. **Force-push requirement:** YES — `git push --force --all` (and `--tags`) is required.
5. **Collaborator re-clone requirement:** EVERY contributor must delete their local clone
   and re-clone, or run `git fetch --all` + `git reset --hard origin/main`. Stale local
   clones will reintroduce the secret blobs on next push.
6. **Credential rotation requirement:** still required regardless of rewrite, because the
   values existed in history and may have been cloned/cached by third parties.

## Consequences

- Rewrites all commit SHAs from the first commit touching the affected files onward.
- Breaks all open PRs / forks based on old history.
- Must be coordinated with the team and announced.

## Decision in THIS phase

No destructive Git command was executed. No force-push was performed. The working-tree
changes (scrubbed examples, hardened code) are left uncommitted for review.
