# Tasks: Within-Column Rank

- **Feature ID:** 031-within-column-rank
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Spec **Q-197–Q-200** Decided (recommended defaults locked). Owns proposed **H**. `tasks` domain + migration + dedicated reorder API + card sortable. No notes/**C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until later user confirm.

Locked: dense int position; `PUT .../tasks/reorder` `{ status, taskIds }`; `requireTaskWrite`; no position activity; cross-column append end; same-column DnD persists; backfill preserves `createdAt` desc visual order.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect Task Prisma model, tasks repository/service/routes/DTOs/activity emit paths, KanbanBoard DnD (post-028 if present), and statuses reorder atomicity tests for patterns. Record files, unique-constraint strategy for soft-delete, and migration name. Do not change product code in this task.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-197–Q-200. Confirm 028 handoff (sortable package). **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Add domain support for `position` (invariants: non-negative int; append helpers as needed) with unit tests.
- [x] T004 Extend tasks repository contract: list by position; create with position; reorderInStatus; status-move densify/append; soft-delete densify as planned.
- [x] T005 Implement Prisma schema `position`, indexes/constraints, and additive migration with backfill (createdAt desc → dense 0..n-1 per project+status). No DB reset.
- [x] T006 Implement service use cases: reorder (no activity), create append, status change append + source densify; wire authz `requireTaskWrite`.
- [x] T007 Implement DTOs (`PublicTaskDto.position`), Zod validators for reorder body, controller + `PUT /api/projects/:projectId/tasks/reorder` route.
- [x] T008 Add backend unit/integration tests for AC-001/003–008 paths (reorder, authz, append, list order, no activity, txn failure closed).

### Phase 3 — Frontend

- [x] T009 Add API client `reorderTasks` + types including `position`; ensure list rendering sorts by position.
- [x] T010 Implement within-column `@dnd-kit/sortable` for cards; same-column drop calls reorder; cross-column keeps status PATCH with end-of-column UX; keep 028 column vs card disambiguation (AC-001, AC-002, AC-003, AC-009).
- [x] T011 Gate card reorder on `canWrite`; add/update frontend tests for reorder call, write-gate, and cross-column regression.

### Phase 4 — Verification

- [x] T012 Run targeted backend tests; record commands and actual results. Apply migration via authorized `prisma migrate deploy` only (no reset).
- [x] T013 Run targeted frontend tests + both `npm run typecheck` on Node 22; record results.
- [x] T014 Verify AC-001–AC-010 against the spec. Confirm non-goals held.
- [x] T015 Obtain independent review and resolve blocking findings.
- [x] T016 Update `memory.md` from verified state (Kanban now has task position; same-column no longer no-op; Q-197–Q-200). Propose `implemented-features.md` / proposed-features **H** status patch and **wait for explicit user confirmation** before editing catalog files.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes + constraint strategy |
| T002 | T001 | Artifacts Approved; Q-197–Q-200 Decided |
| T003 | T002 | Domain tests |
| T004 | T003 | Repository contract |
| T005 | T004 | Migration + schema |
| T006 | T005 | Service behavior |
| T007 | T006 | Route/DTO/validator |
| T008 | T007 | Backend test results |
| T009 | T007 | Client types |
| T010 | T009 | Card sortable + API |
| T011 | T010 | FE tests |
| T012 | T008 | Command log + migrate deploy |
| T013 | T011, T012 | Command log |
| T014 | T013 | AC checklist |
| T015 | T014 | Reviewer verdict |
| T016 | T015 | Memory updated; catalog only after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T006–T011, T014 | Reorder API + UI |
| AC-002 | T010, T011, T014 | Same-column persists |
| AC-003 | T006, T008, T010, T014 | Append on status |
| AC-004 | T006, T008, T014 | Create append |
| AC-005 | T006, T008, T011, T014 | Write-gate |
| AC-006 | T006, T008, T014 | No position activity |
| AC-007 | T007, T008, T009, T014 | DTO + list order |
| AC-008 | T005, T008, T014 | Backfill |
| AC-009 | T010, T011, T014 | Column/card coexistence |
| AC-010 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T016. Soft-delete strategy: partial unique index `tasks_projectId_status_position_live_uidx` WHERE `deletedAt IS NULL`; densify remaining live on soft-delete. Migration: `20261110180000_task_within_column_rank`.
- Tests executed (Node `v22.22.3`):
  - Backend (prior T012): `npm run typecheck` (exit 0); `npx vitest run src/modules/tasks` → 36 files / 250 passed; `npm run prisma:deploy` → no pending migrations.
  - Frontend (prior T013): `npm run typecheck` (exit 0); targeted client+Kanban+TasksPanel → 3 files / 140 passed.
  - Medium filter-reorder fix re-run: `npm run typecheck` (exit 0); `npx vitest run src/api/client.test.ts src/tasks/KanbanBoard.test.tsx src/tasks/TasksPanel.test.tsx` → 3 files / **141** passed (+1 subset-filter gate).
- AC-001–AC-010 (T014):
  - AC-001/002: within-column sortable → `PUT .../tasks/reorder`; FE + BE tests.
  - AC-003: cross-column status PATCH + append-end optimistic UX; regression tests.
  - AC-004: create append covered by backend suite.
  - AC-005: `canWriteTasks` / VIEWER gate (no card sortable); backend 403.
  - AC-006: reorder silent on activity (backend).
  - AC-007: `PublicTaskDto.position` + client map + board `sortTasksByPosition`.
  - AC-008: migration backfill already applied; densify/order tests.
  - AC-009: typed drag data; column vs card keyboard/pointer disambiguation tests.
  - AC-010: artifacts Approved → Verified after T015/T016.
- Non-goals held: no notes/C; no constitution edit; no `implemented-features.md`; 028 column API unchanged.
- Known issues: Low residual — no automated migration backfill test (AC-008 by SQL review). Medium filter-reorder UX resolved (omit `onReorderTasks` under priority/label filters).
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS. Medium (priority/label subset → reorder 400) **resolved** in `TasksPanel` + FE test. Low: no automated backfill test (residual). Informational: reviewer suites not re-run (ask/readonly); close-out re-ran FE targeted + typecheck after fix.
- Memory updated: yes (T016). Catalog propose only — wait for user confirm before `implemented-features.md` / proposed **H** row.
- Remaining work: none for 031; next Approved delivery `029-auth-ux`.
