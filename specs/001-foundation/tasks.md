# Tasks: Foundation

- **Feature ID:** 001-foundation
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks, and only after an explicit request to implement. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

Remove tasks that do not apply. Do not create empty components to satisfy this template.

Blocking questions Q-001, Q-002, Q-003, Q-004, Q-005, and Q-008 are resolved in `spec.md` and `plan.md`. Do not reopen them during implementation. Q-006, Q-007, and Q-009 stay deferred and MUST NOT be implemented as if they were in scope.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect the repository and confirm `frontend/`, `backend/`, Compose, and Prisma still need to be created rather than extended.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved. Reconfirm resolved constraints: published backend port + `VITE_API_URL` + CORS; Zod; Vitest + Testing Library + SuperTest; error envelope `{ error: { code, message } }`; npm + Node.js 22 LTS + PostgreSQL 16; `GET /health` and `GET /ready`.

### Phase 2 — Workspace and database service

- [x] T003 Add root `.gitignore` and `.env.example` with placeholders only (`DATABASE_URL`, `CORS_ORIGIN`, `VITE_API_URL`, Postgres user/password/db). No real secrets.
- [x] T004 Add Compose service `db` (PostgreSQL 16), a named volume, env-based credentials, a healthcheck, and hostname `db` on the Compose network.

### Phase 3 — Backend

- [x] T005 Scaffold `backend/` with npm, Node.js 22 LTS, Express, and TypeScript with strict checking. Load config from env. Enable CORS for `CORS_ORIGIN` only. Map failures through a centralized handler to `{ error: { code, message } }`. No product domains.
- [x] T006 Add `backend/prisma/schema.prisma` with `SystemProbe` (`id`, `recordedAt`) and the first versioned migration. Document Client generation vs migrate vs deploy. Prisma stays a backend dependency.
- [x] T007 Implement `system` domain objects and invariants for a probe (system-assigned id and recorded time; append-only; not a product entity).
- [x] T008 Implement the `system` repository contract and Prisma adapter (`createProbe`, `listProbes`, `isDatabaseReachable`). Map Prisma records to domain objects inside the adapter.
- [x] T009 Implement `system` DTOs, Zod validators, service use cases, controller, and routes for `POST /api/system/probes`, `GET /api/system/probes`, `GET /health`, and `GET /ready`. Use the plan's success DTOs and error codes (`VALIDATION_ERROR`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`).
- [x] T010 Add backend tests with Vitest (domain tests without HTTP/Prisma; service tests with a fake repository) and SuperTest (persistence, liveness, readiness, empty list, 400, 503, error envelope).

### Phase 4 — Frontend

- [x] T011 Scaffold `frontend/` React + TypeScript + Vite using npm and Node.js 22 LTS. Set `VITE_API_URL` to the browser-reachable published backend origin. Do not include database credentials or Compose-internal hostnames.
- [x] T012 Implement the typed API client and foundation UI to record and list probes, with loading, empty, success, and error states.
- [x] T013 Add frontend tests with Vitest and Testing Library for those UI states and the probe flow.

### Phase 5 — Compose application services

- [x] T014 Add Compose services `frontend` and `backend` with published HTTP ports. Backend uses hostname `db`, waits on `db` health, and owns Prisma Client/migration tooling. Frontend is reached by the browser; the browser calls the backend via `VITE_API_URL`. Three primary services total.

### Phase 6 — Verification

- [x] T015 Run documented type checking and the targeted Vitest, Testing Library, and SuperTest suites. Record actual commands and results.
- [x] T016 Verify AC-001 through AC-011 on the running stack, including a database-unreachable case, without unauthorized volume deletes or database resets.
- [x] T017 Obtain independent review and resolve blocking findings with a new implementation pass if needed.
- [x] T018 Update `memory.md` (and only docs that changed) from verified state. Keep unimplemented product work marked unimplemented. Do not mark Q-006, Q-007, or Q-009 as done.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes match the repo |
| T002 | T001 | Artifacts Approved; resolved constraints still recorded |
| T003 | T002 | Files exist; no committed secrets |
| T004 | T003 | Compose `db` PostgreSQL 16 + named volume + healthcheck |
| T005 | T002 | Backend compiles; CORS and error envelope wired; listens using env config |
| T006 | T005, T004 | Schema + migration files under `backend/prisma/` |
| T007 | T006 | Domain tests (after T010) / typecheck |
| T008 | T007 | Adapter maps Prisma → domain; no Prisma types leak |
| T009 | T008 | Routes return specified statuses and envelopes |
| T010 | T009 | Executed Vitest/SuperTest results |
| T011 | T002, T009 | Frontend builds; `VITE_API_URL` is browser-reachable |
| T012 | T011 | UI states observable |
| T013 | T012 | Executed Vitest + Testing Library results |
| T014 | T004, T009, T012 | `docker compose` starts three services with published ports |
| T015 | T010, T013, T014 | Executed typecheck and tests |
| T016 | T014, T015 | Each AC has evidence |
| T017 | T016 | Reviewer verdict |
| T018 | T017 | `memory.md` matches verified repo |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T014, T016 | Compose start output; service names; PostgreSQL 16; named volume |
| AC-002 | T009, T010, T016 | `GET /health` result |
| AC-003 | T008, T009, T016 | `GET /ready` success with DB up |
| AC-004 | T009, T010, T016 | `GET /ready` failure with error envelope, no DB leak |
| AC-005 | T009, T012, T016 | UI create + persisted row + list via `VITE_API_URL` |
| AC-006 | T009, T012, T013, T016 | Empty list API + empty UI |
| AC-007 | T012, T016 | UI error when DB down |
| AC-008 | T009, T010, T016 | Invalid `POST` rejected with `VALIDATION_ERROR` |
| AC-009 | T007, T008, T009, T016, T017 | Layout and mapping review |
| AC-010 | T003, T016 | Repo inspection |
| AC-011 | T010, T013, T015 | Executed Vitest / Testing Library / SuperTest / typecheck |

## Completion report

- Completed tasks: T001–T018
- Tests executed: Implementer T015/T016 on the Compose stack; coordinator re-ran typecheck and tests on Node.js 22.22.3 after independent review.
- Actual results: Coordinator `backend` `npm run typecheck` exit 0; `backend` `npm test` 3 files / 21 tests passed. Coordinator `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 2 files / 10 tests passed. Earlier Compose AC-001–AC-011 evidence remains: services `frontend` (5173), `backend` (3000), `db` (PostgreSQL 16.15, volume `devtrack_pgdata`); `/health` 200 with db down; `/ready` 200/503 as specified; invalid POST 400 `VALIDATION_ERROR`; empty list and UI empty state; browser create/list via `VITE_API_URL=http://localhost:3000`; UI error when db stopped. Volume was not deleted.
- Known issues: Q-006, Q-007, and Q-009 remain deferred. Local Compose images are Node 22 + Vite/tsx dev servers, not production-hardened. Prisma CLI high advisories in `deepmerge-ts`/`effect` left unfixed to stay on Prisma 6. Default agent PATH may be Node 24 without `docker`; use nvm 22.22.3 and Docker Desktop CLI. Reviewer Low: backend typecheck excludes test files; SuperTest persistence/`GET /ready` cases `skipIf` when `DATABASE_URL` is missing. Informational: `/ready` maps any probe failure to unreachable; create/list map only known connection codes to 503.
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; blocking no. No new implementation pass.
- Memory updated: yes (T018)
- Remaining work: none for `001-foundation`. Next product feature is not specified.
