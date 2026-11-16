# Tasks: Password Change

- **Feature ID:** 027-password-change
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Authenticated current+new password; Argon2id; no SMTP. **Locked:** Q-187 revoke others/keep current; Q-188 min 8 ≠ current, FE confirm only; Q-189 `POST /api/auth/password` → `204`. No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect auth service/repo/hasher/session revoke patterns and ProfilePage. Do not change product code.
- [x] T002 Confirm artifacts **Approved** (Q-187–Q-189 already Decided). **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Add repository support to revoke other sessions for a user (keep current) as needed (AC-005).
- [x] T004 Implement `changePassword` domain/service use-case: verify current, validate new, Argon2id hash replace (AC-001–AC-003).
- [x] T005 Implement DTO/Zod validator, controller, and `POST /api/auth/password` → `204` route (Q-189; AC-004).
- [x] T006 Add unit/service/API tests for AC-001–AC-005; assert no secrets in responses.

### Phase 3 — Frontend

- [x] T007 Add API client helper + types for change password.
- [x] T008 Implement profile change-password UI (FE confirm-new only; Q-188) with loading/success/error (AC-006).
- [x] T009 Add frontend tests for form validation and success/error paths as practical.

### Phase 4 — Verification

- [x] T010 Run targeted backend + frontend tests; record results.
- [x] T011 Run typecheck and relevant suites on Node 22; record results.
- [x] T012 Verify AC-001–AC-007; confirm no SMTP; constitution untouched.
- [x] T013 Obtain independent review and resolve blocking findings.
- [x] T014 Update `memory.md`. Propose catalog patch; **wait for user confirmation** before editing `implemented-features.md`.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved |
| T003 | T002 | Repo method |
| T004 | T003 | Service |
| T005 | T004 | Route |
| T006 | T005 | Backend test log |
| T007 | T005 | Client |
| T008 | T007 | Profile UI |
| T009 | T008 | Frontend test log |
| T010 | T006, T009 | Command log |
| T011 | T010 | Command log |
| T012 | T011 | AC checklist |
| T013 | T012 | Reviewer verdict |
| T014 | T013 | Memory; catalog after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004–T006, T012 | Success |
| AC-002 | T004–T006, T012 | Wrong current |
| AC-003 | T004–T006, T012 | Validation |
| AC-004 | T005–T006, T012 | Unauthenticated |
| AC-005 | T003–T006, T012 | Sessions |
| AC-006 | T008–T009, T012 | UI |
| AC-007 | T012–T013 | Non-goals |

## Completion report

- Completed tasks: T001–T014
- Tests executed:
  - Backend (Node 22.22.3): `tsc --noEmit`; vitest auth-service, auth-api, prisma-auth-repository → 3 files, 33 passed (post Low fix; +1 UoW rollback case)
  - Frontend (Node 22.22.3): prior T010/T011 — `tsc --noEmit`; vitest ProfilePage.test.tsx, client.test.ts → 2 files, 87 passed
- Actual results: listed checks exit 0; wrong current → `400 INVALID_CREDENTIALS`; success → `204`; hash+revoke-others in one `UnitOfWork`; no SMTP; `constitution.md` untouched
- Known issues: none blocking. Low finding resolved: `changePassword` wraps `savePasswordHash` + `revokeSessionsForUserExcept` in `UnitOfWork`; `PrismaAuthRepository` uses `currentPrisma` so Prisma txn binds. In-memory happy path still uses `ImmediateUnitOfWork` (same pattern as other domains); fail-path covered by `SnapshotAuthUnitOfWork` service test.
- Reviewer findings: prior independent review PASS WITH NON-BLOCKING (Low: non-atomic hash then revoke). Addressed; T013 closed Pass with notes. Blocking: no. Failed ACs: none.
- Memory updated: yes (T014); catalog propose only — **do not** edit `implemented-features.md` until user confirms
- Remaining work: user confirm catalog patch for 027 (and any pending 019–026 if not yet applied)
