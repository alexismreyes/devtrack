# Tasks: Custom Task Statuses

- **Feature ID:** 018-custom-task-statuses
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Approved**. Spec **Q-141–Q-150** are **Decided** and plan/tasks are aligned. Do not implement rank (**H**), reopen attachments, or app-wide audit (**C**). Do not write `specs/005-audit/`. Do not change `constitution.md`. Additive / non-destructive migrations only.

**Decided constraints (locked):** per-project catalog; **seed** TODO / IN_PROGRESS / DONE (not immutable privileges); name/color/`isCompleted` editable on **all** rows including seeded; keys immutable after create; **allow full-list catalog reorder** (seeded + custom) via persisted `ProjectStatus` `position`/`rank` (status-catalog order — **not** within-column task rank **H**); Kanban column order follows catalog order; block delete in use (**A**); seeded deletable when unused; cannot delete last status; must keep ≥1 non-completed; create default `TODO` else first non-completed; dynamic Kanban columns; `isCompleted` for dashboard (live flags); OWNER+EDITOR catalog CRUD + reorder; `Task.status` = stable string key (not enum, not FK) + `ProjectStatus` catalog table for name/color/`isCompleted`/seed-marker/order; task status activity keys only; TaskDetail+filter+Kanban+column prefill, header create default-only; colors from fixed tokens (no icons/WIP); exclude **H** / attachments reopen / **C**.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect existing implementation and conventions: Prisma `TaskStatus` / `Task.status`, `TasksService` create/update/list filter, `dashboard-summary.ts`, activity status payloads, `KanbanBoard.tsx` / `statusDisplay.ts` / TaskDetail status select / board filters, labels catalog pattern (`ProjectLabel`, color tokens, labels routes), project-create membership seed transaction, related tests. Record files to extend. Do not change product code in this task.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-141–Q-150 Decided answers match the locked constraints above (especially Q-142 amended: seeded editable/deletable-when-unused + reorder vs **H** + last-status/≥1 non-completed guardrails; Q-146 string key + catalog table; Q-149 colors). Confirm non-goals (**H** task rank, attachments reopen, **C**), additive migration only, `tasks` ownership, no constitution edit. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Implement domain behavior for project statuses and task status **key** assignment (identity; immutable `key` after create; name 1–40 + `nameKey`; color token set; name/color/`isCompleted` editable on all rows including seeded; `isSystem` seed marker only; catalog `position`/`rank` reorder of full list; delete-in-use; last-status and ≥1 non-completed guardrails; create-default `TODO` else first non-completed; same-project key validation). Unit-test without HTTP/Prisma. Do **not** model within-column task rank (**H**).
- [x] T004 Implement domain-specific repository contracts + in-memory fakes for status catalog and task status key resolution (counts-in-use, count non-completed, seed helpers with default positions, list by position asc, **reorder**, batch resolve by keys for dashboard/list).
- [x] T005 Add Prisma `ProjectStatus` catalog model (include `position`/`rank` for **status-catalog** order — not task card order; `isSystem` seed marker) and change `Task.status` from enum to **String** (stable key; **no** FK; **no** task `position`). Versioned additive / expand–backfill–constrain migration under `backend/prisma/`: seed defaults per project at positions 0/1/2; preserve existing `TODO`/`IN_PROGRESS`/`DONE` values; drop enum type when safe. Do not drop unrelated columns. `prisma migrate deploy` only. Do not `migrate reset` or delete volumes. Implement Prisma repository adapters; update list filter for status **key** query values.
- [x] T006 Implement service use cases: catalog create/list/update/delete/**reorder** (update name/color/`isCompleted` on all rows; delete seeded when unused subject to guardrails); task create default `TODO` with plan-locked fallback; task update status key validation; dashboard classification via catalog `isCompleted` (live flags); project-create seed of default statuses in the same transaction pattern as OWNER membership. Authz `requireTaskWrite` for catalog including reorder. Activity: `TASK_FIELDS_CHANGED` status keys only; no catalog CRUD/reorder events.
- [x] T007 Implement DTOs and Zod validators for catalog bodies/params (`name`, `color`, optional `isCompleted` on create/update for all rows; reject client `key`/`id`/`isSystem`), reorder body (ordered full set of status ids), task `status` as string key, and list-tasks `?status=` key. Reject unknown fields / invalid color tokens / incomplete reorder sets.
- [x] T008 Implement controller and routes for catalog under `/api/projects/:projectId/statuses` including reorder endpoint; wire composition root; update task/dashboard routes as needed. Do not change comments/labels/checklists/attachments route contracts except task `status` meaning (string key vs enum).
- [x] T009 Add unit/service/API SuperTest coverage for AC-001–AC-004, AC-006–AC-007, AC-009–AC-010, AC-012–AC-014. Include authz, validation, migration-compatible seeds, dashboard `isCompleted` (including flipped Done), activity status **key** payloads, delete-in-use, seeded editable/deletable-when-unused, last-status / ≥1 non-completed guardrails, catalog reorder persistence, archived/soft-delete cases.

### Phase 3 — Frontend

- [x] T010 Implement API client helpers (catalog CRUD + reorder, task status string key, list filter by key) with `credentials: 'include'`. Extend shared types (`PublicProjectStatusDto` with `key`/`color`/`isCompleted`/`isSystem`/`position`).
- [x] T011 Implement UI: dynamic Kanban columns in catalog order; task DnD by key (same-column no-op); catalog/column **reorder** UI for full list (seeded + custom); TaskDetail status select from catalog; board status filter; column `+` prefill; header create default-only; Statuses Dialog for catalog CRUD + reorder with labels-like color swatches and `isCompleted` editable on **all** rows including seeded; seeded rows deletable when unused (surface conflict errors for in-use / last-status / last-non-completed). Cover loading/empty/success/error/401/403/404/409 as applicable. No within-column **task** rank UI, icons, or WIP. Do not reopen attachments UI beyond status display needs.
- [x] T012 Add frontend tests for AC-005 / AC-008 / AC-011 / AC-014 (and related): credentials, columns/DnD keys, catalog order + reorder UI, selectors/filters, catalog Dialog + colors, non-goals (**H** vs catalog position).

### Phase 4 — Verification

- [x] T013 Run targeted backend and frontend tests; record commands and actual results.
  - Evidence (Node **v22.22.3**): `backend` `npm test` → **56 files / 398 passed**; targeted status suite `statuses-api|statuses-service|project-status.domain|in-memory-statuses-repository` → **4 files / 31 passed**; `frontend` `npm test` → **27 files / 261 passed**.
- [x] T014 Run type checking and relevant quality checks; record commands and actual results.
  - Evidence (Node **v22.22.3**): `backend` `npm run typecheck` clean; `backend` `npm run build` clean; `frontend` `npm run typecheck` clean; `frontend` `npm run build` clean (vite production build succeeded; chunk-size warning only).
- [x] T015 Verify acceptance criteria against the spec using Decided Q-141–Q-150. Record any unmet criterion. Confirm non-goals and no `specs/005-audit/`.
  - AC checklist: **AC-001–AC-014 all pass** vs Decided Q-141–Q-150 (tests + schema/migration/`tasks` module layout). Non-goals held: no Task `position`/`rank` (**H**); catalog `ProjectStatus.position` only; no `specs/005-audit/`; no peer `statuses` domain; attachments not reopened beyond status display; no WIP/icons; `constitution.md` not edited in this verification. Unmet: **none**.
- [x] T016 Obtain independent review and resolve blocking findings.
  - First review: FAIL — non-transactional two-phase reorder. Fix: `PrismaStatusesRepository.reorder` wraps offset + final position writes in one `prisma.$transaction`; added `prisma-statuses-repository.reorder.test.ts`. Evidence (Node **v22.22.3**): status suite → **5 files / 33 passed**; `npm run typecheck` clean.
  - Re-review: **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. Prior blocker verified resolved (Art. V / AC-014). Informational: `listByProjectId` still outside txn (concurrent reorder race → unique constraint rollback, fail-closed); reviewer shell could not re-run Vitest (runtime green remains implementer-claimed).
- [x] T017 Update `memory.md` from verified state. Record answered Q-141–Q-150. Keep deferred **H** and later **C** visible. Propose `implemented-features.md` and any `prompt.md` status-capability wording patch; **wait for explicit user confirmation** before editing those catalog/direction files.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Qs Decided |
| T003 | T002 | Domain unit tests |
| T004 | T003 | In-memory repo tests |
| T005 | T004 | Migration apply + adapter tests |
| T006 | T005 | Service tests |
| T007 | T006 | Validator tests |
| T008 | T007 | Routes wired |
| T009 | T008 | SuperTest / service results |
| T010 | T009 | Client tests |
| T011 | T010 | UI tests / manual |
| T012 | T011 | Frontend test results |
| T013 | T012 | Command log |
| T014 | T013 | Command log |
| T015 | T014 | AC checklist |
| T016 | T015 | Reviewer verdict |
| T017 | T016 | Memory updated; catalog/prompt patches only after user confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T003, T006, T009 | Catalog create/list |
| AC-002 | T003, T006, T009 | Task status key assign |
| AC-003 | T003, T006, T009 | Cross-scope / unknown key reject |
| AC-004 | T005, T006, T009 | Seed + enum→string |
| AC-005 | T011, T012, T015 | Kanban columns/DnD + catalog order |
| AC-006 | T006, T009, T015 | Dashboard `isCompleted` |
| AC-007 | T006, T009 | Authz matrix |
| AC-008 | T010–T012, T015 | Filters/selectors/prefill |
| AC-009 | T006, T009 | Activity key payloads |
| AC-010 | T003, T006, T009 | Rename/delete/edit + guardrails |
| AC-011 | T011, T015, T016 | Non-goals + colors-only (no **H**) |
| AC-012 | T005, T015 | migrate deploy |
| AC-013 | T003–T008, T016 | `tasks` ownership |
| AC-014 | T003–T012, T015 | Catalog reorder API + UI |

## Completion report

- Completed tasks: T001–T017
- Tests executed (Node **v22.22.3**): backend `npm test` → 56/398 passed; frontend `npm test` → 27/261 passed; backend+frontend `typecheck`/`build` clean; post-fix status suite → 5/33 passed
- Actual results: AC-001–AC-014 pass against Q-141–Q-150; non-goals confirmed (no **H** task rank, no `specs/005-audit/`, no constitution change)
- Known issues: concurrent reorder may race on list-then-txn (unique constraint fail-closed); board may briefly show empty columns if statuses catalog fetch fails (soft catch)
- Reviewer findings: first FAIL (reorder txn) → fixed → re-review PASS WITH NON-BLOCKING FINDINGS; Blocking: no
- Memory updated: yes (`memory.md`); catalog/prompt patches proposed — awaiting user confirm
- Remaining work: none in this folder (catalog/prompt edits gated on user confirm)
