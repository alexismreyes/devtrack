# Tasks: Projects

- **Feature ID:** 003-projects
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks, and only after an explicit request to implement. Checklist items are not started. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

Feature artifacts are Approved. Q-019, Q-020, and Q-021 are answered and recorded in `spec.md` and `plan.md`. Do not invent extra product fields, an `includeArchived` filter, membership roles, tasks, Kanban, dashboard, or `project-members`. Q-016, Q-015, Q-017, Q-006, Q-007, and Q-009 stay deferred.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect the current `system`, `auth`, and `users` modules, error envelope, Prisma schema/migrations, `app.ts` composition, session cookie + CORS credentials, frontend API client (GET/POST/PATCH, `credentials: 'include'`), and `App.tsx` view/state switching. Record what must be extended rather than replaced.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved. Reconfirm recorded answers: required `name` + optional `description`, names not unique including per owner (Q-019); nullable `archivedAt`, owner GET allowed, owner PATCH rejected, owner unarchive allowed, no hard delete (Q-020); default list excludes archived, no `includeArchived` filter (Q-021). Reconfirm owner = creating actor, owner-only authorization, additive migration, no database reset, no frontend router (Q-016), public `GET /health` and `GET /ready`, authenticated probes as in `002`, and no `tasks` / `project-members` modules. Stop if artifacts are not Approved.

### Phase 2 — Backend

- [x] T003 Implement `projects` domain objects and invariants (system-assigned id and created time, required `name` / optional `description`, names not unique, owner is the creating user and immutable, owner authorization: actor must match owner, `archivedAt` archive/unarchive, PATCH forbidden while archived). Domain tests without HTTP or Prisma.
- [x] T004 Implement the `projects` repository contract (`create`, `findById`, `listByOwnerId` of active projects only, `update`, `archive`, `unarchive`). Do not use a generic repository. Do not query Prisma from services. Do not add an include-archived parameter.
- [x] T005 Add Prisma `Project` (`id`, `ownerUserId` FK to `users.id` Restrict, `name` with no unique constraint, nullable `description`, `createdAt`, nullable `archivedAt`, index on `ownerUserId`). Versioned additive migration under `backend/prisma/`. Keep `SystemProbe` with no project/user ownership. `users` repository MUST NOT select `ownedProjects`. Document generate vs migrate vs deploy. Do not reset or delete volumes.
- [x] T006 Implement the Prisma adapter that maps Prisma rows to domain `Project`. Implement service use cases: create (owner = actor), list by owner (active only), get (including archived), update (`name`/`description`; owner unchanged; reject when archived), archive (set `archivedAt`), unarchive (clear `archivedAt`). Authorization in the `projects` service, not in auth middleware. Service tests with a fake repository.
- [x] T007 Implement DTOs, Zod validators (strict bodies; required non-empty `name` on create; optional `description`; PATCH requires at least one of `name`/`description`; reject `id` / `ownerUserId` / `createdAt` / `archivedAt` / unknown fields), and error mapping (`NOT_FOUND` `404`, project forbidden → `FORBIDDEN` `403`, archived PATCH → `CONFLICT` `409`) in the centralized handler. Do not map missing projects through `UserNotFoundError` → `401`.
- [x] T008 Implement `projects` controller and routes for `POST /api/projects`, `GET /api/projects`, `GET /api/projects/:id`, `PATCH /api/projects/:id`, `POST /api/projects/:id/archive`, and `POST /api/projects/:id/unarchive`. Apply `requireAuth`. Validate `:id` as UUID. Wire the router and repository in `app.ts` / `main.ts`. Leave health and ready public; leave auth, profile, and probe routes unchanged (probes remain authenticated).
- [x] T009 Add backend tests: Vitest domain/service (fake repository) and SuperTest for create 201 + owner = actor, duplicate `name` allowed, validation 400, 401 without cookie, owner GET 200 including archived, non-owner 403, missing 404, list owner-only active and empty 200, archived excluded from list, PATCH owner immutable, PATCH archived 409, archive/unarchive idempotent, no secrets in bodies, and existing auth/profile/health/probe cases still passing.

### Phase 3 — Frontend

- [x] T010 Extend the typed API client for project create, list, get, patch, archive, and unarchive. Keep `VITE_API_URL` and `credentials: 'include'` on every `fetch`. Do not add database credentials. Do not store a bearer token or session id in JS. Do not add DELETE.
- [x] T011 Implement project list, create, detail, update, archive, and unarchive UI with loading, empty, success, error, unauthenticated, and forbidden states. After archive, keep the detail view so the owner can unarchive. Default list does not show archived projects. Use view/state switching in `App.tsx`; do not add a routing library (Q-016). Keep profile, logout, and probe UI.
- [x] T012 Add frontend tests with Vitest and Testing Library for those flows and states, including `credentials: 'include'` and no token storage.

### Phase 4 — Verification

- [x] T013 Run documented type checking and the targeted Vitest, Testing Library, and SuperTest suites. Record actual commands and results.
- [x] T014 Run type checking and relevant quality checks if not already covered by T013. Record actual commands and results.
- [x] T015 Verify AC-001 through AC-018 on the running stack without unauthorized volume deletes or database resets. Use the Q-019, Q-020, and Q-021 answers recorded in `spec.md`.
- [x] T016 Obtain independent review and resolve blocking findings with a new implementation pass if needed.
- [x] T017 Update `memory.md` (and only docs that changed) from verified state. Keep unimplemented product work (tasks, Kanban, dashboard, collaboration) marked unimplemented. Do not mark Q-006, Q-007, Q-009, Q-015, Q-016, or Q-017 as done.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes match the repo |
| T002 | T001 | Artifacts Approved; Q-019, Q-020, Q-021 remain recorded as answered |
| T003 | T002 | Domain tests without HTTP/Prisma |
| T004 | T003 | Contract matches plan; no generic repository |
| T005 | T002, T004 | Schema + migration under `backend/prisma/`; existing models kept |
| T006 | T004, T005 | Adapter maps Prisma → domain; service authz and archive tests |
| T007 | T006 | Validators and envelope codes including `NOT_FOUND` and archived `CONFLICT` |
| T008 | T007 | Routes return specified statuses; health public; probes authenticated; middleware ≠ authorization |
| T009 | T008 | Executed Vitest/SuperTest results |
| T010 | T008 | Client calls `VITE_API_URL` with `credentials: 'include'` |
| T011 | T010 | UI states observable; profile and probe UI remain |
| T012 | T011 | Executed Vitest + Testing Library results |
| T013 | T009, T012 | Executed typecheck and tests |
| T014 | T013 | Executed typecheck/quality results |
| T015 | T014 | Each AC has evidence |
| T016 | T015 | Reviewer verdict |
| T017 | T016 | `memory.md` matches verified repo |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T003, T006, T008, T009, T015 | Create persists owner = actor; `201`; no secrets |
| AC-002 | T008, T009, T015 | Unauthenticated create `401` |
| AC-003 | T007, T009, T015 | Invalid/unknown/server-owned fields or empty `name` `400` |
| AC-004 | T006, T008, T009, T015 | Owner GET `200` |
| AC-005 | T008, T009, T015 | Protected project routes `401` without valid session |
| AC-006 | T003, T006, T009, T015 | Non-owner `403`; no change |
| AC-007 | T007, T008, T009, T015 | Missing id `404` `NOT_FOUND` |
| AC-008 | T006, T007, T009, T015 | PATCH `name`/`description`; owner immutable |
| AC-009 | T006, T008, T009, T015 | List owner-only active; empty `200` |
| AC-010 | T008, T009, T015 | Unauthenticated list `401` |
| AC-011 | T003, T006, T008, T009, T015 | Archive sets `archivedAt`; GET still 200; PATCH `409`; list excludes |
| AC-012 | T007, T009, T015 | Bodies have no hashes/secrets/stack traces/tokens |
| AC-013 | T003–T008, T015, T016 | Layout, mapping, authn ≠ authz |
| AC-014 | T010, T011, T012, T015 | UI flows via `VITE_API_URL` + credentials include; no router |
| AC-015 | T003, T009, T012, T013, T014 | Executed checks |
| AC-016 | T008, T009, T015 | Auth/profile/health/probes unchanged |
| AC-017 | T003, T006, T008, T009, T015 | Unarchive clears `archivedAt`; list and PATCH resume |
| AC-018 | T003, T005, T009, T015 | Duplicate `name` create succeeds |

## Completion report

- Completed tasks: T001–T017
- T001 inspection (extend, do not replace): `system` / `auth` / `users` stay; add `NOT_FOUND` and reuse `FORBIDDEN` / `CONFLICT`; additive Prisma `Project` + `User.ownedProjects` reverse relation; `users` repo `USER_SELECT` must not include `ownedProjects`; `createApp` gains `projects` router/repo; session cookie + CORS credentials unchanged; frontend client already has GET/POST/PATCH with `credentials: 'include'` (T010); `App.tsx` view switching is enough (T011); `GET /health` and `GET /ready` stay public; probes stay authenticated.
- T002: artifacts Approved; Q-019, Q-020, Q-021 remain recorded as answered.
- T010–T012 (frontend batch): typed client create/list/get/patch/archive/unarchive; `VITE_API_URL` + `credentials: 'include'`; no DELETE; no bearer/session storage; list/create/detail UI via `App.tsx` selected-id switching; profile, logout, and probe UI kept; after archive remain on detail; default list hides archived.
- T013 (this batch, Node 22.22.3; default PATH Node was 24): `backend` `npm run typecheck` exit 0; `backend` `npm test` 16 files / 113 tests passed; `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 9 files / 60 tests passed.
- T014 (this batch): same typecheck commands as T013, both exit 0. No lint/format scripts in `backend` or `frontend` `package.json`.
- T015 (this batch): Compose `frontend`/`backend`/`db` up; `GET /health` 200 `{status:ok}`; `GET /ready` 200 `{status:ready}`. `npm run prisma:deploy` — 3 migrations found, no pending. Named volume kept; no reset. Live HTTP AC-001–AC-013, AC-016–AC-018 passed (create 201 owner=actor, 401 unauthenticated, 400 validation, owner GET 200, 403 non-owner, 404 NOT_FOUND, PATCH owner immutable, list owner-only active / empty 200, archive `archivedAt` + GET 200 + PATCH 409 + list exclude, unarchive clears `archivedAt` + list/PATCH resume, duplicate `name` 201, no secrets in bodies, auth/profile/health/probes unchanged). Browser AC-014: empty list, create/list/detail/update/archive (remain on detail, unarchive action)/unarchive, archived excluded from default list, empty-name error, logout guest hides projects, URL stays `/`, fetch to `http://localhost:3000` with `devtrack_session` cookie, CORS credentials, no JS token storage. Loading and forbidden UI states covered by T012 tests (live loading too fast; no id-entry path to another user’s project). Q-019/Q-020/Q-021 used as recorded.
- Migrations: `backend/prisma/migrations/20261027120000_projects/` already applied; this batch re-ran deploy, no pending, no new migration.
- Known issues: Q-016, Q-015, Q-017, Q-006, Q-007, Q-009 remain deferred. Live UI did not click a forbidden detail (owner-only list has no foreign id entry).
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; blocking no. Low: project-route SuperTest does not re-assert malformed/expired cookies (shared requireAuth). Informational: persistence tests skip without DATABASE_URL. No new implementation pass.
- Coordinator AC-015: Node.js 22.22.3; `backend` `npm run typecheck` exit 0; `backend` `npm test` 16 files / 113 tests passed; `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 9 files / 60 tests passed.
- Memory updated: yes (T017)
- Remaining work: none for `003-projects`. Next product feature (tasks) is not specified.
