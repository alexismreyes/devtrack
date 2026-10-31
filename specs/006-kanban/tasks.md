# Tasks: Kanban Board

- **Feature ID:** 006-kanban
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks, and only after an explicit request to implement. Checklist items are not started. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

Feature artifacts are **Verified**. Q-033, Q-034, and Q-035 are **decided**. This ID is **006-kanban**, not audit. Do not invent assignees, comments, dashboard aggregates, `project-members`, Trello branding, a move-specific HTTP endpoint, or a `position`/`rank` field. Q-006, Q-007, Q-009, Q-015, and Q-017 stay deferred. Later audit MUST NOT use ID `005` and MUST NOT be written as `specs/005-audit/`. Dashboard, collaboration, and audit remain unimplemented.

Backend phase is confirmation-only (existing PATCH). Do not scaffold empty domain layers. No API or schema change.

Recorded decisions to implement after approval:

- **Q-033:** Replace the ungrouped task list on project detail with the Kanban board. No list/board toggle. Keep create, optional filters, and nested `TaskDetail`.
- **Q-034:** Status-only. Drag between columns PATCHes existing task `status`. No `position`/`rank` field, no rank migration, no move endpoint. Same-column drop is a no-op. Within-column visual order stays existing list order (newest `createdAt` first per column).
- **Q-035:** `@dnd-kit/core` as an explicit documented dependency, added only after the column board works. Do not add `@dnd-kit/sortable`. Do not add a second DnD library.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect the current implementation: `TasksPanel` ungrouped list, `TaskDetail` status PATCH via `updateTask`, `ProjectDetail` / `ProjectDetailPage` on `/projects/:projectId`, `AuthenticatedLayout` chrome/sidebar, `frontend/src/api/client.ts` (`credentials: 'include'`), Prisma `Task` (no rank), `PATCH /api/tasks/:id` validators/service/authz/archived `409`, and tests that currently forbid `columnheader` / `draggable` / Kanban text (`App.test.tsx`) and common DnD packages (`frontend-deps.test.ts`). Record what to extend rather than replace. Do not change code in this task.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved. Reconfirm: board on existing project-detail URL; chrome/sidebar kept; guest/login/register unchanged; existing `PATCH /api/tasks/:id` `{ status }`; no new domain; no generic repository; no microservices; HTTP-only `devtrack_session` unchanged; `credentials: 'include'`; frontend is not the only access check; columns first then DnD in this feature. Reconfirm decided answers: Q-033 replace ungrouped list / no toggle / keep create, filters, nested detail; Q-034 status-only / no rank / no move endpoint / same-column no-op / newest `createdAt` first per column; Q-035 `@dnd-kit/core` after columns / no `@dnd-kit/sortable` / no second DnD library. Reconfirm Q-006, Q-007, Q-009, Q-015, Q-017 deferred. Reconfirm later audit MUST NOT use ID `005`. Stop if artifacts are Draft.

### Phase 2 — Backend (confirm existing contract)

- [x] T003 Confirm existing `PATCH /api/tasks/:id` covers authorized status changes (`TODO` | `IN_PROGRESS` | `DONE`, no workflow), owner-only `403`, unauthenticated `401`, deleted/missing `404`, archived parent `409`, and strict body (no `projectId` / `deletedAt` / rank). Add or extend SuperTest only if a real gap exists. Do not add a move endpoint, a `kanban` module, a generic repository, or a Prisma `position`/`rank` field. Do not create a migration. Do not `migrate reset` or delete volumes.

### Phase 3 — Frontend: columns first

- [x] T004 Implement the column board on the existing project-detail destination: three columns `TODO`, `IN_PROGRESS`, `DONE` grouping listed non-deleted tasks by persisted `status`; all three columns render when empty; **replace** the ungrouped task list (Q-033); no list/board toggle; keep authenticated top bar + left sidebar; keep create, optional status/priority filters, nested `TaskDetail` (status select remains a non-drag path), and soft-delete; keep guest login/register without a board. Do not add DnD yet. Do not add `@dnd-kit/core` or any other DnD package. Do not copy Trello assets or invent assignees/comments. Do not add a new route.
- [x] T005 Add/update frontend tests for columns, ungrouped list gone, no list/board toggle, card-to-status mapping, empty columns, status change via nested detail + existing PATCH + `credentials: 'include'`, filters/create/soft-delete/archived view, chrome/sidebar, guest screens unchanged, no Trello branding. Rewrite `App.test.tsx` (and any 005 test) that currently requires no `columnheader` / no Kanban on project-detail so they no longer lock the ungrouped-list-only UX. Do not add DnD tests yet. Do not claim tests passed without running them.

### Phase 4 — Frontend: drag-and-drop after columns

- [x] T006 After T004–T005, implement cross-column drag-and-drop using **only** `@dnd-kit/core` (Q-035). Do not add `@dnd-kit/sortable`. Do not add a second DnD library. Persist drops onto a different column with existing `updateTask` / `PATCH /api/tasks/:id` `{ status }` and `credentials: 'include'`. Same-column drop is a no-op (Q-034): no PATCH, no rank. Disable or fail durable moves when archived (`409`); revert or do not keep a false column on failure; keep `TaskDetail` status select. Do not add a new HTTP move endpoint or undeclared packages.
- [x] T007 Add frontend tests for cross-column drop persistence, same-column no-op (no PATCH / no rank), failed drop / archived `409`, `credentials: 'include'`, and no token storage. Update `frontend-deps.test.ts` so it allows only `@dnd-kit/core` and still forbids `@dnd-kit/sortable`, extra DnD libraries, and Trello/CSS-framework drift. Allow dragging on the board in `App.test.tsx` without dropping Trello-absence or chrome asserts.

### Phase 5 — Verification

- [x] T008 Run `frontend` `npm run typecheck` and `npm test`. If T003 changed backend tests, run `backend` `npm run typecheck` and `npm test` as well. Report actual results. Do not run `prisma migrate reset` or delete Docker volumes. Do not claim checks passed without running them.
- [x] T009 Verify acceptance criteria AC-001–AC-020 against the spec (columns replace the list, persistence, DnD via `@dnd-kit/core`, authz, archived, filters/create/detail, chrome, no Trello, no new domain/rank/move endpoint, no `@dnd-kit/sortable`). Record any unmet criterion.
- [x] T010 Obtain independent review and resolve blocking findings with a new implementation pass if needed. Do not treat implementer claims as proof.
- [x] T011 Update `memory.md` (and only docs that changed) from verified state. Record Q-033–Q-035 as decided. Keep Q-006, Q-007, Q-009, Q-015, and Q-017 deferred. Keep dashboard, collaboration, and audit marked unimplemented. Do not write `005-audit` artifacts. Do not mark tasks complete without evidence.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes in the completion report |
| T002 | T001 | Artifacts Approved; Q-033–Q-035 remain the recorded decisions |
| T003 | T002 | PATCH coverage confirmed; no new endpoint/schema |
| T004 | T002, T003 | Three columns replace the list on project-detail; no DnD package |
| T005 | T004 | Column tests; 005 anti-column asserts rewritten |
| T006 | T005 | `@dnd-kit/core` only; PATCH `{ status }`; no sortable |
| T007 | T006 | DnD tests; deps test allows only `@dnd-kit/core` |
| T008 | T005, T007 | Executed typecheck and test commands |
| T009 | T008 | AC-001–AC-020 evidence |
| T010 | T009 | Reviewer verdict |
| T011 | T010 | `memory.md` matches verified repo |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001, AC-002, AC-003 | T004, T005 | Frontend column tests; ungrouped list gone |
| AC-004 | T003, T004, T005 | Detail PATCH + board refresh |
| AC-005, AC-006 | T006, T007 | DnD tests; same-column no-op |
| AC-007, AC-010 | T004, T006, T007 | Archived/failure tests; API `409` |
| AC-008, AC-009 | T003 | Existing/extended SuperTest 401/403 |
| AC-011, AC-012, AC-013, AC-014 | T004, T005 | Updated panel/chrome/guest tests |
| AC-015 | T004, T005, T007 | Identity / no Trello asserts |
| AC-016 | T001, T003, T009 | Inspect modules/Prisma/routes |
| AC-017 | T005, T007 | Credentials + no token storage |
| AC-018 | T008 | Executed typecheck and tests |
| AC-019 | T002, T006, T007 | package.json `@dnd-kit/core` only |
| AC-020 | T003, T009 | Existing slices remain; no `005-audit` |

## Completion report

- Completed tasks: T001–T011
- Tests executed (implementer T008, Node 22.13.0): `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 12 files / 107 tests passed. T003 added no SuperTest; backend unchanged, so backend checks were not re-run. Coordinator independently re-ran (Node 22.13.0): `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 12 files / 107 tests passed. No `prisma migrate reset`. No volume delete. No migrations.
- AC-001–AC-020: all met from frontend tests, inspection, independent review, and coordinator live browser pass. No unmet criterion. AC-007 dedicated drop tests cover 403 and archived 409 only; 400/401/404/network share the same revert path (non-blocking; not a failed AC).
- Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): login → project detail shows TODO/IN_PROGRESS/DONE columns; create task appears in TODO; keyboard DnD Space+ArrowRight+Space moved card to IN_PROGRESS; sidebar/chrome kept.
- Known issues: dedicated drop tests cover 403 and archived 409 only; 400/401/404/network share the same revert path (non-blocking). Sidebar list refetch is pathname-keyed (`AuthenticatedLayout.tsx` `reloadKey={location.pathname}`), so an archived project can remain in the sidebar until navigation (005 independent review, non-blocking). Q-006, Q-007, Q-009, Q-015, Q-017 remain deferred. Dashboard, collaboration, and audit remain unimplemented. Later audit MUST NOT use ID `005`. `specs/005-audit/` was not created. No `position`/`rank` field. `@dnd-kit/sortable` not added.
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Non-blocking: dedicated drop tests cover 403 and archived 409 only; 400/401/404/network share the same revert path.
- Memory updated: yes (T011)
- Remaining work: none for `006-kanban`. Next product work is not specified (proposed: dashboard, collaboration, audit with a later feature ID, not `005`; do not write `specs/005-audit/`).
