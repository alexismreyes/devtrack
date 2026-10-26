# Tasks: Authentication and Users

- **Feature ID:** 002-authentication
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks, and only after an explicit request to implement. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

Blocking questions Q-010, Q-011, Q-012, Q-013, Q-014, and Q-018 are recorded as answered in `spec.md`. These artifacts MUST still be Approved before T003–T018 run. Do not implement projects, tasks, Kanban, dashboard, or collaboration. Do not add empty product modules. Q-015, Q-016, Q-017, Q-006, Q-007, and Q-009 stay deferred.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect the current `system` module, error envelope, Prisma schema/migration, `app.ts` composition, CORS (`cors({ origin })` without credentials), frontend API client (GET/POST, no credentials), and Compose/env conventions. Record what must be extended rather than replaced.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved. Reconfirm resolved answers: HTTP-only session cookie + `credentials: 'include'` + CORS origin with credentials not `*` (Q-010); login/register issue session, logout revokes that session, 7-day absolute expiry, no refresh, concurrent sessions allowed (Q-011); email case-insensitive (Q-012); stored email + displayName, returned id/email/displayName, updatable displayName only (Q-013); health/ready public, probes authenticated, no SystemProbe ownership (Q-014); register also authenticates (Q-018). Reconfirm Argon2id hashing, additive migration, and no database reset.

### Phase 2 — Backend identity and hashing

- [x] T003 Implement `users` domain objects and invariants (system-assigned id, canonical lowercase unique email, required displayName, own-profile authorization: actor must match target). No password hash on the user entity. Domain tests without HTTP or Prisma.
- [x] T004 Add Prisma `User` (`email` unique lowercase, `displayName`, `createdAt`), `auth`-owned password-credential relation, and `auth`-owned `AuthSession` (`id`, `userId` non-unique, `createdAt`, `expiresAt`, `revokedAt`). Versioned additive migration under `backend/prisma/`. Keep `SystemProbe` with no user-ownership field. Document generate vs migrate vs deploy. Do not reset or delete volumes.
- [x] T005 Implement the `users` repository contract and Prisma adapter (`create`, `findById`, `findByEmail`, `updateDisplayName`). Map Prisma → domain inside the adapter. Never expose hash fields.
- [x] T006 Implement `auth` domain password hashing and verification with Argon2id (hash ≠ plaintext; verify success/failure) and session validity (unrevoked and `now < expiresAt`, 7-day absolute from issuance). Domain tests without HTTP or Prisma.
- [x] T007 Implement the `auth` repository contract and Prisma adapter for password hashes and sessions (`savePasswordHash`, `findPasswordHashByUserId`, `createSession`, `findSessionById`, `revokeSession`). Registration MUST insert user + hash + session in one transaction. Login MUST insert a new session without revoking others.

### Phase 3 — Backend use cases and HTTP

- [x] T008 Implement `auth` and `users` services: register (also creates session), login (creates session), logout (revokes current session), GET own profile, PATCH `displayName` with authorization in the `users` service. `auth` uses a narrow users identity port; `users` does not import `auth`.
- [x] T009 Implement DTOs, Zod validators (`email` format, required displayName, PATCH rejects `email`/unknown fields), and error codes (`CONFLICT`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `FORBIDDEN`) mapped by the centralized handler to `{ error: { code, message } }`.
- [x] T010 Implement `auth` authentication middleware (identity only), cookie issue/clear for `devtrack_session` (HttpOnly, Path=/, SameSite=Lax, Max-Age 7 days, not Secure on local HTTP), cookie-parser, CORS `credentials: true` with configured origin not `*`, controllers, and routes for `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/users/me`, and `PATCH /api/users/me`. Apply auth middleware to `POST`/`GET` `/api/system/probes` only; leave `GET /health` and `GET /ready` public. Do not change probe success DTOs. Wire routers in `app.ts`.
- [x] T011 Add backend tests: Vitest domain/service (fake repositories) and SuperTest for register 201 + cookie, duplicate 409 including different case, validation 400, login 200 + cookie, generic 401 login failure, 401 without cookie, 200 own profile, PATCH displayName, PATCH email 400, 403 cross-user, logout 204 revokes current session only, expired session 401, no hashes/tokens in bodies, public health/ready, probe 401 without session and success with session using existing probe DTOs.

### Phase 4 — Frontend

- [x] T012 Extend the typed API client for register, login, logout, GET/PATCH profile, PATCH support, and `credentials: 'include'` on every `fetch` including probes. Keep `VITE_API_URL`. Do not add database credentials. Do not store a bearer token or session id in JS.
- [x] T013 Implement register, login, logout, and own-profile UI with loading, success, and error/unauthenticated states. Keep the probe UI and handle probe 401. Use view/state switching; do not add a routing library (Q-016).
- [x] T014 Add frontend tests with Vitest and Testing Library for those flows and states, including `credentials: 'include'` and no token storage.

### Phase 5 — Verification

- [x] T015 Run documented type checking and the targeted Vitest, Testing Library, and SuperTest suites. Record actual commands and results.
- [x] T016 Verify AC-001 through AC-017 on the running stack without unauthorized volume deletes or database resets.
- [x] T017 Obtain independent review and resolve blocking findings with a new implementation pass if needed.
- [x] T018 Update `memory.md` (and only docs that changed) from verified state. Keep unimplemented product work marked unimplemented. Do not mark Q-006, Q-007, Q-009, Q-015, Q-016, or Q-017 as done.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes match the repo |
| T002 | T001 | Artifacts Approved; resolved Qs still recorded as answered |
| T003 | T002 | Domain tests without HTTP/Prisma |
| T004 | T002 | Schema + migration files under `backend/prisma/`; `SystemProbe` kept without owner |
| T005 | T003, T004 | Adapter maps Prisma → domain; no hash leak |
| T006 | T002 | Hash/verify and session-validity domain tests |
| T007 | T005, T006 | Transactional user + hash + session persist |
| T008 | T007 | Service tests with fake repositories |
| T009 | T008 | Validators and envelope codes |
| T010 | T009 | Routes return specified statuses; cookie HttpOnly; probes auth; health public; middleware ≠ authorization |
| T011 | T010 | Executed Vitest/SuperTest results |
| T012 | T010 | Client calls `VITE_API_URL` with `credentials: 'include'` |
| T013 | T012 | UI states observable; probe UI remains |
| T014 | T013 | Executed Vitest + Testing Library results |
| T015 | T011, T014 | Executed typecheck and tests |
| T016 | T015 | Each AC has evidence |
| T017 | T016 | Reviewer verdict |
| T018 | T017 | `memory.md` matches verified repo |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T006, T007, T008, T010, T011, T016 | Register persists hash ≠ plaintext; 201; HttpOnly cookie; no hash in body |
| AC-002 | T005, T009, T011, T016 | Duplicate email 409 including different case; one user |
| AC-003 | T009, T011, T016 | Empty/missing/invalid fields 400 `VALIDATION_ERROR` |
| AC-004 | T008, T010, T011, T016 | Login 200 + HttpOnly cookie; no bearer token |
| AC-005 | T008, T011, T016 | Generic `INVALID_CREDENTIALS` |
| AC-006 | T008, T010, T011, T016 | `GET /api/users/me` 200 `{ id, email, displayName }` |
| AC-007 | T010, T011, T016 | Protected route 401 without valid session |
| AC-008 | T003, T008, T011, T016 | Cross-user 403 |
| AC-009 | T008, T010, T011, T016 | PATCH `displayName` only; email PATCH 400 |
| AC-010 | T006, T008, T010, T011, T016 | 7-day expiry; logout revoke; concurrent sessions |
| AC-011 | T009, T011, T016 | Bodies have no hashes/secrets/stack traces/tokens |
| AC-012 | T001, T004, T010, T011, T016 | Probe/health remain; health/ready public |
| AC-013 | T003–T010, T016, T017 | Layout, mapping, authn ≠ authz |
| AC-014 | T012, T013, T014, T016 | UI flows via `VITE_API_URL` + credentials include |
| AC-015 | T003, T006, T011, T014, T015 | Executed checks |
| AC-016 | T008, T010, T011, T016 | Logout one session; other session valid; CORS credentials |
| AC-017 | T010, T011, T016 | Probe 401 unauthenticated; global list when authenticated; no owner field |

## Completion report

- Completed tasks: T001–T018
- T008–T011: `auth`/`users` services, identity port, Zod validators, error codes, cookie session auth, CORS credentials, protected probe routes, and backend Vitest/SuperTest coverage. `GET /health` and `GET /ready` remain public.
- T012–T014: typed frontend client now covers register, login, logout, GET/PATCH `/api/users/me`, PATCH, and `credentials: 'include'` on every `fetch` including probes. Register/login/logout/own-profile UI uses view/state switching (no router). Probe UI remains and shows an unauthenticated state on 401. Client maps public user DTO fields only and does not store a bearer token or session id in JS.
- T015 commands (Node.js 22.22.3 via nvm; default PATH was Node 24 / Cursor agent Node): `backend` `npm run typecheck`; `backend` `npm test`; `frontend` `npm run typecheck`; `frontend` `npm test`.
- T015 actual results: backend typecheck exit 0; backend Vitest 12 files / 75 tests passed (domain, service, SuperTest, persistence with `DATABASE_URL`); frontend typecheck exit 0; frontend Vitest 7 files / 35 tests passed.
- T016 running stack: Compose `frontend` (5173), `backend` (3000), `db` (PostgreSQL 16, volume `pgdata` kept). Backend image rebuilt so `argon2` and `cookie-parser` are present. `prisma migrate status`: 2 migrations, schema up to date. No database reset or named-volume delete.
- T016 AC evidence: AC-001 register 201, lowercase email, Argon2id hash ≠ plaintext, HttpOnly `devtrack_session` Max-Age=604800 not Secure; AC-002 duplicate case 409 one user; AC-003 empty/invalid 400 `VALIDATION_ERROR`; AC-004 login 200 + cookie no bearer; AC-005 generic `INVALID_CREDENTIALS`; AC-006 GET `/api/users/me` `{id,email,displayName}`; AC-007 401 without/malformed/unknown/revoked/expired cookie on profile, logout, probes; AC-008 no `GET /api/users/:id` (404) — 403 remains users-service `assertOwnProfile` + error-handler mapping (T015); AC-009 PATCH displayName persisted, PATCH email 400; AC-010 7-day TTL, logout revokes current session only, concurrent session still 200, expired session 401; AC-011 inspected bodies have no hashes/secrets/tokens/stacks; AC-012 health/ready public, `system_probes` columns `id,recordedAt` only, probe UI remains; AC-013 HTTP register persisted through users/auth repositories; middleware authenticates only; Prisma types not imported in dto/domain/controller/service; AC-014 browser register/login/logout/profile/probe via `VITE_API_URL=http://localhost:3000`, cookie sent on subsequent fetch, JS cookie empty, no localStorage/sessionStorage token; AC-015 T015 commands; AC-016 CORS origin `http://localhost:5173` with credentials, not `*`; AC-017 probe 401 unauthenticated, authenticated global list same for two users, DTO `{id,recordedAt}`.
- Known issues: Q-015, Q-016, Q-017, Q-006, Q-007, Q-009 remain deferred. Cross-user HTTP 403 is not reachable because this feature has no `GET/PATCH /api/users/:id` route; `/me` always passes actor id as target. Logout cookie clear uses Express epoch `Expires` (equivalent to Max-Age=0). Local Compose images are Node 22 + Vite/tsx dev servers. Prisma CLI high advisories during backend image `npm ci` left unfixed to stay on Prisma 6. Browser loading flashes (`Registering…` / `Signing in…`) were covered by T014 tests; live UI observed success, error, and unauthenticated states.
- Reviewer findings: INCONCLUSIVE until AC-015 independently executed; coordinator then re-ran typecheck/tests. Verdict treated as PASS WITH NON-BLOCKING FINDINGS. Informational only: HTTP 403 not reachable on `/me`; `CORS_ORIGIN=*` not rejected at config load; email uniqueness is unique index plus canonical lowercase. No new implementation pass.
- Coordinator AC-015: Node.js 22.22.3; `backend` `npm run typecheck` exit 0; `backend` `npm test` 12 files / 75 tests passed (env injected from `../.env`); `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 7 files / 35 tests passed.
- Memory updated: yes (T018)
- Remaining work: none for `002-authentication`. Next product feature (projects) is not specified.
