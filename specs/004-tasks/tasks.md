# Tasks: Tasks

- **Feature ID:** 004-tasks
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks, and only after an explicit request to implement. Checklist items are not started. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

Feature artifacts are Approved. Q-022, Q-023, Q-024, Q-025, Q-026, and Q-027 are answered and recorded in `spec.md` and `plan.md`. Do not invent extra product fields, assignees, comments, Kanban drag-and-drop, dashboard aggregates, membership, `project-members`, hard-delete of task rows, restore APIs, due-date list filters, `includeDeleted`, project moves, or `005-audit`. Q-016, Q-015, Q-017, Q-006, Q-007, and Q-009 stay deferred.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect the current `system`, `auth`, `users`, and `projects` modules, `UsersIdentityPort` pattern, error envelope, Prisma schema/migrations, `app.ts` composition, session cookie + CORS credentials, frontend API client (GET/POST/PATCH, `credentials: 'include'`, empty-body parse), `App.tsx` selected-project switching, and `ProjectDetail`. Record what must be extended rather than replaced.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved. Reconfirm recorded answers: Q-022 soft-delete via `deletedAt`, HTTP `DELETE /api/tasks/:id` sets `deletedAt` and does not remove the row, deleted tasks are `404`/hidden, no restore endpoint; Q-023 optional list filters `status` and/or `priority`; Q-024 archived parent GET/list allowed, create/update/soft-delete `409`; Q-025 required `title`, optional description/due date, create defaults `TODO`/`MEDIUM`; Q-026 `projectId` immutable, PATCH rejects it; Q-027 audit logging is later `005-audit`, not this feature. Reconfirm owner-only project authorization, additive migration, no database reset, no frontend router (Q-016), public `GET /health` and `GET /ready`, authenticated probes as in `002`, no `project-members` or Kanban modules, and no invented assignees/comments. Stop if artifacts are not Approved.

### Phase 2 — Backend

- [x] T003 Implement `tasks` domain objects and invariants (system-assigned id and created time, required `title` / optional `description`, titles not unique, `projectId` association and immutability, `status` `TODO` | `IN_PROGRESS` | `DONE`, `priority` `LOW` | `MEDIUM` | `HIGH`, create defaults `TODO`/`MEDIUM`, optional calendar due date, no status workflow, nullable `deletedAt` soft-delete with no restore). Domain tests without HTTP or Prisma.
- [x] T004 Implement the `tasks` repository contract (`create`, `findById` including deleted rows, `listByProjectId` of non-deleted rows with optional `status` and/or `priority` filters, `update` of live fields, `softDelete` setting `deletedAt`). Do not use a generic repository. Do not query Prisma from services. Do not add a restore method or Prisma `delete`.
- [x] T005 Add Prisma `TaskStatus` and `TaskPriority` enums and `Task` (`id`, `projectId` FK to `projects.id` Restrict, `title` with no unique constraint, nullable `description`, `status` default `TODO`, `priority` default `MEDIUM`, nullable `dueDate` `@db.Date`, `createdAt`, nullable `deletedAt`, index on `projectId`). Versioned additive migration under `backend/prisma/`. Keep `SystemProbe` with no task/user ownership. `projects` repository MUST NOT select `tasks`. Document generate vs migrate vs deploy. Do not reset or delete volumes. Do not add audit tables.
- [x] T006 Implement `ProjectAccessPort` and adapter in `projects` (owned-project snapshot including `archivedAt`; reuse existing not-found/forbidden errors; do not throw merely because the project is archived). Implement the `tasks` Prisma adapter that maps Prisma rows to domain `Task`. Implement service use cases: create (`projectId` from path after port check; apply defaults; `409` if parent archived), list by project with optional filters (allowed when archived), get (deleted → not found; archived parent still `200`), update (`title`/`description`/`status`/`priority`/due date; id/createdAt/`projectId`/`deletedAt` unchanged; deleted → not found; archived parent → `409`), soft-delete (`deletedAt` set; already deleted → not found; archived parent → `409`). Authorization in the `tasks` service via the port, not in auth middleware. Service tests with a fake task repository and fake port.
- [x] T007 Implement DTOs, Zod validators (strict bodies; required non-empty `title` on create; optional `description`; optional calendar `dueDate`; optional create `status`/`priority`; PATCH requires at least one allowed field; reject `id` / `createdAt` / `deletedAt` / `projectId` / unknown fields; strict list query allowing only `status` and/or `priority`), and error mapping (`TaskNotFoundError` → `NOT_FOUND` `404`, non-owner → `FORBIDDEN` `403`, parent-archived writes → `CONFLICT` `409`) in the centralized handler. Do not map missing tasks through `UserNotFoundError` → `401`. Do not import `ProjectArchivedError` into `tasks`.
- [x] T008 Implement `tasks` controller and routes for `POST /api/projects/:projectId/tasks`, `GET /api/projects/:projectId/tasks`, `GET /api/tasks/:id`, `PATCH /api/tasks/:id`, and `DELETE /api/tasks/:id` (soft-delete, `204` empty body). Apply `requireAuth`. Validate `:projectId` and `:id` as UUID. Wire the router, repository, and access port in `app.ts` / `main.ts`. Leave health and ready public; leave auth, profile, project, and probe routes unchanged (probes remain authenticated). Do not add a restore route.
- [x] T009 Add backend tests: Vitest domain/service (fake repository + fake port) and SuperTest for create 201 + `projectId` association + defaults, duplicate `title` allowed, validation 400, 401 without cookie, owner GET 200, non-owner 403, missing project/task 404, deleted GET/PATCH/DELETE 404, list project-only non-deleted and empty 200, status/priority filters, PATCH identity and `projectId` immutable, enumerations, optional due date, DELETE sets `deletedAt` and returns 204, archived parent GET/list 200 and writes 409, no secrets in bodies, and existing auth/profile/project/health/probe cases still passing.

### Phase 3 — Frontend

- [x] T010 Extend the typed API client for task create, list with optional query filters, get, patch, and DELETE. Keep `VITE_API_URL` and `credentials: 'include'` on every `fetch`. Handle `204` empty body. Do not add database credentials. Do not store a bearer token or session id in JS.
- [x] T011 Implement task list, optional status/priority filters, create, detail, update, and soft-delete UI on the selected project with loading, empty, success, error, unauthenticated, forbidden, and archived-parent conflict states. Use view/state switching; do not add a routing library (Q-016). Keep profile, logout, project archive/unarchive, and probe UI. Do not add Kanban drag-and-drop or restore UI.
- [x] T012 Add frontend tests with Vitest and Testing Library for those flows and states, including `credentials: 'include'` and no token storage.

### Phase 4 — Verification

- [x] T013 Run documented type checking and the targeted Vitest, Testing Library, and SuperTest suites. Record actual commands and results.
- [x] T014 Run type checking and relevant quality checks if not already covered by T013. Record actual commands and results.
- [x] T015 Verify AC-001 through AC-021 on the running stack without unauthorized volume deletes or database resets. Use the Q-022–Q-027 answers recorded in `spec.md`.
- [x] T016 Obtain independent review and resolve blocking findings with a new implementation pass if needed.
- [x] T017 Update `memory.md` (and only docs that changed) from verified state. Keep unimplemented product work (Kanban, dashboard, collaboration, `005-audit`) marked unimplemented. Do not mark Q-006, Q-007, Q-009, Q-015, Q-016, or Q-017 as done. Do not write `005-audit` artifacts.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes match the repo |
| T002 | T001 | Artifacts Approved; Q-022–Q-027 remain recorded as answered |
| T003 | T002 | Domain tests without HTTP/Prisma |
| T004 | T003 | Contract matches plan; no generic repository; no Prisma `delete` |
| T005 | T002, T004 | Schema + migration under `backend/prisma/`; existing models kept |
| T006 | T004, T005 | Port + adapter map Prisma → domain; service authz/archive/soft-delete tests |
| T007 | T006 | Validators and envelope codes including task `NOT_FOUND` and archived `CONFLICT` |
| T008 | T007 | Routes return specified statuses including DELETE `204`; health public; probes authenticated; middleware ≠ authorization |
| T009 | T008 | Executed Vitest/SuperTest results |
| T010 | T008 | Client calls `VITE_API_URL` with `credentials: 'include'`; DELETE handles `204` |
| T011 | T010 | UI states observable; profile, project, and probe UI remain |
| T012 | T011 | Executed Vitest + Testing Library results |
| T013 | T009, T012 | Executed typecheck and tests |
| T014 | T013 | Executed typecheck/quality results |
| T015 | T014 | Each in-scope AC has evidence |
| T016 | T015 | Reviewer verdict |
| T017 | T016 | `memory.md` matches verified repo |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T003, T006, T008, T009, T015 | Create persists `projectId`; defaults `TODO`/`MEDIUM`; `201`; no secrets |
| AC-002 | T008, T009, T015 | Unauthenticated create `401` |
| AC-003 | T007, T009, T015 | Invalid/unknown/server-owned fields or empty `title` `400` |
| AC-004 | T006, T008, T009, T015 | Owner GET `200`; DTO omits `deletedAt` |
| AC-005 | T008, T009, T015 | Protected task routes `401` without valid session |
| AC-006 | T003, T006, T009, T015 | Non-owner `403`; no change |
| AC-007 | T007, T008, T009, T015 | Missing project/task `404` `NOT_FOUND` |
| AC-008 | T006, T007, T009, T015 | PATCH allowed fields; identity and `projectId` immutable |
| AC-009 | T006, T008, T009, T015 | List project-only non-deleted; empty `200` |
| AC-010 | T008, T009, T015 | Unauthenticated list `401` |
| AC-011 | T003, T007, T009, T015 | Status/priority enumerations; invalid `400` |
| AC-012 | T007, T009, T015 | Bodies have no hashes/secrets/stack traces/tokens |
| AC-013 | T003–T008, T015, T016 | Layout, mapping, port, authn ≠ authz |
| AC-014 | T010, T011, T012, T015 | UI flows via `VITE_API_URL` + credentials include; no router; no Kanban DnD |
| AC-015 | T003, T009, T012, T013, T014 | Executed checks |
| AC-016 | T008, T009, T015 | Auth/profile/project/health/probes unchanged |
| AC-017 | T003, T005, T009, T015 | Duplicate `title` create succeeds |
| AC-018 | T003, T006, T007, T009, T015 | Optional calendar due date; past allowed |
| AC-019 | T003, T004, T006, T008, T009, T011, T015 | Soft-delete sets `deletedAt`; GET/list hide it; `204`; no restore |
| AC-020 | T004, T007, T008, T009, T011, T015 | Optional `status` and/or `priority` list filters |
| AC-021 | T006, T008, T009, T011, T015 | Archived parent GET/list `200`; create/update/soft-delete `409` |

## Completion report

- Completed tasks: T001–T017
- Tests executed (T013/T014, Node.js v22.22.3 via `C:\Users\MAManzano\AppData\Local\nvm\v22.22.3`; Docker CLI on PATH): backend `npm run typecheck` exit 0; backend `npm test` 20 files / 158 tests passed; frontend `npm run typecheck` exit 0; frontend `npm test` 11 files / 87 tests passed. No separate lint script exists; typecheck is the documented quality check.
- T015 running stack: Compose `frontend`/`backend`/`db` already up. Backend and frontend restarted (no volume delete, no database reset) so Prisma Client/task routes and Vite picked up 004 source. Host `npm run prisma:deploy` — 4 migrations found, no pending. `GET /health` 200 `{status:ok}`; `GET /ready` 200 `{status:ready}`.
- T015 HTTP AC-001–AC-013, AC-016–AC-021: live API passed (create 201 defaults `TODO`/`MEDIUM` and supplied enumerations; unauth create/list/get/patch/delete 401; validation 400; owner GET 200 DTO omits `deletedAt`; non-owner 403; missing 404; PATCH allowed fields, identity/`projectId` immutable, body `projectId` 400; list project-only non-deleted and empty 200; duplicate title 201; optional/past/cleared due date; list filters `status`/`priority`, invalid/unknown query 400; DELETE 204 empty body, later GET/PATCH/second DELETE 404, non-owner deleted GET 404 not 403, no restore route; archived parent GET/list 200 and writes 409; health/ready/register/profile/probes/projects remain; bodies have no secrets). Soft-delete DB check: row remained with `deletedAt` set (`remaining_rows=1`, `rows_with_deleted_at=1`). Soft-delete uses Prisma `update` of `deletedAt`, not `delete`.
- T015 browser AC-014: URL stayed `/` (no router). Empty task list, create (defaults TODO/MEDIUM), list, status filter, detail, update, soft-delete (removed from list, no restore), archived parent still lists and disables writes with conflict copy. Fetch to `http://localhost:3000` with `devtrack_session` cookie, CORS credentials, no Authorization bearer, empty local/session storage. Profile, logout, and probe UI remain. Loading and forbidden UI states covered by T012 tests (live loading is transient; live forbidden not re-driven with a second browser user).
- Known issues: Q-016, Q-015, Q-017, Q-006, Q-007, Q-009 remain deferred; `005-audit` not specified; Vite/tsx containers needed a restart to serve 004 routes/UI.
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; blocking no. Low: task SuperTest missing-cookie only for AC-005. Informational: unused `withDetails` result in update; AC-015 not re-run by reviewer. No new implementation pass.
- Coordinator AC-015: Node.js 22.22.3; `backend` `npm run typecheck` exit 0; `backend` `npm test` 20 files / 158 tests passed; `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 11 files / 87 tests passed.
- Memory updated: yes (T017)
- Remaining work: none for `004-tasks`. Next product work is not specified (proposed: Kanban, dashboard, collaboration, or `005-audit`).
