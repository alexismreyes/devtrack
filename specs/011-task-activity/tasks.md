# Tasks: Task Activity

- **Feature ID:** 011-task-activity
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Not Started (Draft artifacts; not Approved)

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Draft**. Q-066–Q-079 in `spec.md` section 15 are **Decided**. Do not invent further product rules. This feature is **task activity only** (proposed ID **L**). Do not implement labels (**E**) or app-wide audit (**C**). Do not write `specs/005-audit/`. Do not change `constitution.md`. Keep Verified `010-task-comments` public HTTP contracts intact.

Recorded Decided constraints:

- Event kinds only: task created, task field changes, task soft-delete, comments added.
- Not a full app-wide audit table; C is a separate later feature (Q-066); no `specs/005-audit/`.
- Own under existing `tasks` domain (Q-067).
- List authz: `TaskAuthorizationPort.requireTaskRead` (Q-068).
- UI: read-only activity section in existing `TaskDetail` Dialog; no new route; no board-card strip (Q-069).
- One field-change event per successful PATCH; field names + old/new for changed fields only; no emit on no-op (Q-070–Q-072).
- Newest `createdAt` first; forward-only; no backfill (Q-073, Q-074).
- Comment-added payload: `commentId` + short body preview (Q-075).
- Resolve `actorDisplayName` at list time (Q-076).
- Same DB transaction; fail write if event insert fails (Q-077).
- Full list; no pagination (Q-078).
- `GET /api/tasks/:taskId/activity` → `{ activity: [...] }` (Q-079).
- Additive Prisma migration only; no migrate reset; no volume delete.
- Comments contracts intact; comment-added emission is an internal side effect.
- No workspace redesign. No new npm dependency expected.
- Q-006, Q-007, Q-009, Q-015, Q-017 stay deferred.

## Checklist

### Phase 1 — Preparation

- [ ] T001 Inspect existing implementation and conventions: `TasksService`, `CommentsService`, `TaskAuthorizationPort`, task/comment routes, Prisma `Task`/`TaskComment`/`User`, `UsersIdentityPort`, frontend `TaskDetail` / API client, soft-delete and archived authz tests, existing transaction patterns. Record files to extend and where to hook emission (create/update/softDelete/comment create) without changing public comment contracts. Do not change code in this task. Do not specify labels or app-wide audit beyond deferred notes already in the spec.
- [ ] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-066–Q-079 remain **Decided** as recorded. Confirm no **E**/**C** implementation; no audit ID `005`; additive migration only; comments contracts intact; L-scope kinds only. **Stop if artifacts are Draft or not Approved.**

### Phase 2 — Backend

- [ ] T003 Implement domain activity kinds/entity (or equivalent) for the four Decided kinds, actor/task binding invariants, and pure helpers for field-change diff / payload building (one event per PATCH; old/new for changed fields only; no-op detection) and comment-added `{ commentId, bodyPreview }` truncation helper. No Prisma and no HTTP in this task.
- [ ] T004 Implement the activity repository contract and an in-memory fake: create; listByTaskId newest `createdAt` first (Q-073). No Prisma in this task.
- [ ] T005 Add Prisma activity model (task-scoped events table: id, taskId, actorUserId, kind, payload, createdAt; FKs Restrict; indexes as planned) and a **versioned additive** migration under `backend/prisma/`. Do not drop columns. Do not add label/audit-app-wide tables. `prisma migrate deploy` only. Do not `migrate reset` or delete volumes. Implement the Prisma repository adapter.
- [ ] T006 Extend `TasksService` create/update/softDelete to emit activity in the same DB transaction as the write; fail the write if event insert fails (Q-077). Emit one field-change event with all changed fields; do not emit on no-op PATCH. Extend `CommentsService.create` only to emit comment-added with `commentId` + short body preview; do not emit on comment PATCH/soft-delete. Do not change public comment request/response DTOs or status codes.
- [ ] T007 Implement activity list use case: resolve live task; `TaskAuthorizationPort.requireTaskRead`; map actor display names via `UsersIdentityPort` at list time; return full list newest-first as `{ activity: [...] }` shape for the controller; no pagination; no backfill.
- [ ] T008 Implement activity DTOs, runtime validators (path only), controller, and `GET /api/tasks/:taskId/activity` returning `{ activity: [...] }`. Wire in `app.ts` / composition root. No public activity write routes.
- [ ] T009 Add backend tests for AC-001–AC-008, AC-011, AC-013–AC-016: emit on create/update/soft-delete/comment-create; field-change one-event + old/new; no emit on comment edit/delete; no-op PATCH no emit; transactional fail path; list 200/empty/newest-first/full list; 401; VIEWER list 200; non-member 403; missing/deleted task 404; soft-delete then list 404; comments create response regression; actorDisplayName present; no secrets. Reuse Vitest/SuperTest.

### Phase 3 — Frontend

- [ ] T010 Implement API client list-activity helper for `GET /api/tasks/:taskId/activity` with `credentials: 'include'`. Do not store bearer tokens. Do not add comment contract breaking changes.
- [ ] T011 Implement UI in existing `TaskDetail` Dialog: read-only activity section (newest first; field-change and comment-preview rendering); loading/empty/success/error/401/403/404 states as applicable. No new route; no board-card strip. Do not redesign board, Members Dialog, Kanban, dashboard, or comments controls beyond adding the section. Do not implement labels.
- [ ] T012 Add frontend tests for AC-010 (and related): credentials, TaskDetail activity section, empty/error paths, existing Dialog/comments still present, no Trello branding, no labels/audit UI from this feature.

### Phase 4 — Verification

- [ ] T013 Run `backend` `npm run typecheck` and `npm test`, and `frontend` `npm run typecheck` and `npm test`. Report actual results. Do not run `prisma migrate reset` or delete Docker volumes. Do not claim checks passed without running them.
- [ ] T014 Verify acceptance criteria AC-001–AC-016 against the spec, using Decided Q-066–Q-079. Record any unmet criterion. Confirm no **E**/**C** implementation, no `specs/005-audit/`, comments contracts intact, Decided kinds only, forward-only, no pagination.
- [ ] T015 Obtain independent review and resolve blocking findings. Do not mark Verified while blockers remain.
- [ ] T016 Update `memory.md` (and only docs that changed) from verified state. Record answered open questions Q-066–Q-079. Keep deferred **E** and later **C** visible. Keep Q-006/007/009/015/017 deferred. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file. Do not mark tasks complete without evidence.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes only |
| T002 | T001 | Approval + Decided Qs gate |
| T003 | T002 | Domain unit tests |
| T004 | T003 | In-memory repo tests |
| T005 | T004 | Migration present; adapter tests |
| T006 | T005 | Service emit + tx tests |
| T007 | T005 | Service list tests |
| T008 | T006, T007 | Routes wired; SuperTest smoke |
| T009 | T008 | Backend AC coverage |
| T010 | T008 | Client helper tests |
| T011 | T010 | TaskDetail activity UI |
| T012 | T011 | Frontend tests for applicable ACs |
| T013 | T009, T012 | Actual typecheck/test results |
| T014 | T013 | AC checklist |
| T015 | T014 | Reviewer verdict |
| T016 | T015 | Memory updated; catalog ask-first |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T006, T009 | Task create emit |
| AC-002 | T006, T009 | Field-change emit (one event, old/new) |
| AC-003 | T006, T009 | Soft-delete emit + list 404 |
| AC-004 | T006, T009 | Comment-added emit (id + preview); no edit/delete emit; contract intact |
| AC-005 | T007–T009 | Authz + empty `{ activity: [] }` |
| AC-006 | T007–T009 | Missing/deleted task 404 |
| AC-007 | T008, T009 | No write routes |
| AC-008 | T007–T009 | Actor attribution at list time; no secrets |
| AC-009 | T014, T015 | Scope / regression |
| AC-010 | T011, T012 | TaskDetail activity UI |
| AC-011 | T005, T014 | Additive migration |
| AC-012 | T002 | Approval gate |
| AC-013 | T007, T009, T015 | Ports / tasks ownership / boundaries |
| AC-014 | T003, T006, T009 | No-op PATCH no emit |
| AC-015 | T006, T009 | Same-tx fail write |
| AC-016 | T004, T007–T009 | Newest first; full list |

## Completion report

- Completed tasks:
- Tests executed:
- Actual results:
- Known issues:
- Reviewer findings:
- Memory updated:
- Remaining work:
