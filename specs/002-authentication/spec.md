# Feature Specification: Authentication and Users

- **ID:** 002-authentication
- **Status:** Approved
- **Created:** 2026-10-26
- **Related features:** 001-foundation (Verified)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

## 1. Problem

DevTrack’s foundation is verified, but every product operation is still unauthenticated. Users cannot register, prove identity, or manage a profile. Later project, task, and collaboration work cannot enforce resource-level access until identity and authentication exist.

The constitution already requires hashed passwords, a distinction between authentication and authorization, and that secrets, hashes, and stack traces never appear in API responses. Those rules are not implemented yet.

## 2. Goals

- Let a person register a user account with a unique email and a secret password that is stored only as a hash.
- Let a registered user log in and receive an HTTP-only server-side session cookie with a defined lifecycle.
- Let successful registration also authenticate the user with the same session cookie as login.
- Let the backend distinguish unauthenticated, authenticated, and unauthorized requests.
- Let an authenticated user read their own profile (`id`, `email`, `displayName`) and update `displayName` only, through the backend, not only in the UI.
- Keep the verified `system` probe slice running. Do not replace it with product entities. Do not add user ownership to `SystemProbe`.
- Keep `GET /health` and `GET /ready` public. Require authentication for `POST`/`GET` `/api/system/probes`.

## 3. Non-Goals

- Projects, tasks, Kanban, dashboard, membership, roles, or collaboration.
- Adding user ownership, actor id, or per-user filtering to `SystemProbe`.
- Changing probe success DTOs from `001-foundation` except the authenticated access policy on probe routes.
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- Account deletion, email verification, password reset, password change, changing email, OAuth/social login, and administrative user directories.
- Bearer tokens, refresh tokens, or storing an authentication credential in JavaScript.
- Inventing a client-side routing library or design system (frontend routing and styling remain deferred: Q-016).
- Production image design, CI, or deployment (Q-006, Q-009 from foundation).
- Password complexity beyond non-empty (Q-015) and account lockout / rate limiting (Q-017).

## 4. Actors and User Stories

### User Story US-001

As a visitor, I want to register with a unique email, a display name, and a password, so that I have a DevTrack user account and am authenticated afterward.

### User Story US-002

As a registered user, I want to log in with that email and password, so that the backend can authenticate me with a session cookie.

### User Story US-003

As an authenticated user, I want to access protected operations that require authentication, so that unauthenticated callers cannot act as me.

### User Story US-004

As an authenticated user, I want to view my profile and update my display name, so that my account details stay under my control without changing my email.

### User Story US-005

As an authenticated user, I want other people to be unable to read or change my profile, so that authentication is not treated as authorization.

### User Story US-006

As a developer, I want the existing system-probe slice to keep working, so that foundation verification is not lost when identity is added.

### User Story US-007

As an authenticated user, I want to log out and have that session revoked, so that that cookie can no longer be used.

## 5. Functional Requirements

- **FR-001:** A visitor MUST be able to register a user by supplying `email`, `displayName`, and `password`. `email` is the unique account identifier. Uniqueness MUST be case-insensitive. The stored email MUST be the canonical lowercase form of the submitted value.
- **FR-002:** The password MUST be hashed with an appropriate algorithm before persistence. The plaintext password MUST NOT be stored. Password hashes MUST NOT be returned in API responses, logs intended for clients, or UI state.
- **FR-003:** Registration MUST reject missing or empty `email`, `displayName`, or `password` with validation failure. `email` MUST be a valid email format. Additional password-complexity rules are Q-015 (deferred, not required to implement this feature).
- **FR-004:** Registration MUST reject a duplicate email (case-insensitive) without creating a second user.
- **FR-005:** A registered user MUST be able to log in with the same email (case-insensitive) and password. Success MUST issue an HTTP-only server-side session cookie. The frontend MUST send that cookie with `fetch` `credentials: 'include'`. Successful registration MUST also authenticate and issue the same session cookie as login (Q-018). JavaScript MUST NOT store a bearer token.
- **FR-006:** Login with an unknown email or wrong password MUST fail as unauthenticated. The failure MUST use a generic message that does not disclose whether the email exists. Hashes MUST NOT be returned.
- **FR-007:** Protected operations in this feature (own profile, logout, and `POST`/`GET` `/api/system/probes`) MUST require a valid session. Missing, malformed, expired, revoked, or unknown session cookies MUST fail as unauthenticated. `GET /health` and `GET /ready` MUST remain public.
- **FR-008:** Authentication (proving who the caller is) MUST remain distinct from authorization (what that caller may do). Passing authentication MUST NOT by itself grant access to another user’s profile.
- **FR-009:** An authenticated user MUST be able to read their own profile: `id`, `email`, `displayName`. They MUST be able to update `displayName` only. They MUST NOT change `email` in this feature. They MUST NOT update another user’s profile.
- **FR-010:** A session MUST be issued on successful login and on successful registration. Logout MUST revoke that session only. Absolute expiry MUST be 7 days from issuance. There MUST be no refresh tokens. Multiple concurrent sessions per user MUST be allowed.
- **FR-011:** External input MUST be validated at HTTP boundaries with Zod. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- **FR-012:** The backend MUST remain a modular monolith. `users` MUST own user identity and profile. `auth` MUST own password hashing, credential verification, session issuance/validation/revocation, and authentication middleware. `system` MUST keep owning probes and readiness. A generic repository MUST NOT be introduced.
- **FR-013:** Prisma MUST be used only behind the owning domain’s repository. User, password-credential, and session persistence MUST be added under `backend/prisma/` with a versioned migration. `SystemProbe` MUST remain and MUST NOT gain a user-ownership field. Controllers MUST NOT query the database. Services MUST NOT issue ad hoc Prisma queries.
- **FR-014:** The React UI MUST provide register, login, logout, and own-profile flows with loading, success, validation/error, and unauthenticated states. The browser MUST keep using the published backend port, `VITE_API_URL`, and CORS. All frontend `fetch` calls that talk to the API MUST use `credentials: 'include'`. The frontend MUST NOT be the only access check. The frontend MUST NOT store a bearer token in JS (memory, `localStorage`, or `sessionStorage`).
- **FR-015:** `GET /health` and `GET /ready` MUST stay public. `POST /api/system/probes` and `GET /api/system/probes` MUST require authentication. Probe success DTOs and `SystemProbe` meaning MUST otherwise stay as in `001-foundation`. The probe slice MUST NOT be removed. Any authenticated user MAY create and list probes; the list is not filtered by user.
- **FR-016:** Domain identity and password-hashing behavior MUST be testable without HTTP or Prisma. Register/login/logout/profile API behavior, probe-auth behavior, and critical auth UI behavior MUST also be tested with Vitest, Testing Library, and SuperTest.
- **FR-017:** Backend CORS MUST allow the configured frontend origin with credentials. It MUST NOT use `Access-Control-Allow-Origin: *` together with credentials.

## 6. Acceptance Criteria

### Scenario AC-001: Successful registration

- Given a visitor and an email that is not already registered (case-insensitive)
- When they register with that email, a non-empty display name, and a non-empty password
- Then a user is persisted with canonical lowercase email and display name, the password is stored only as a hash, the API responds `201` with `{ id, email, displayName }` and no password or hash, an HTTP-only session cookie is issued, and the identifier can be used to log in later

### Scenario AC-002: Duplicate registration

- Given a user already registered with an email
- When a visitor tries to register with the same email in a different letter case
- Then the API rejects the request with `409` and `{ error: { code, message } }`, and a second user is not created

### Scenario AC-003: Registration validation

- Given a visitor
- When they register with a missing or empty email, display name, or password, or with an email that is not a valid email format
- Then the API responds `400` with `{ error: { code, message } }` and no user is persisted

### Scenario AC-004: Successful login

- Given a registered user
- When they log in with the correct email (any letter case) and password
- Then the backend authenticates them, issues an HTTP-only session cookie (not a body bearer token), responds `200` with `{ id, email, displayName }`, and the response contains no password or hash

### Scenario AC-005: Failed login

- Given a login attempt with an unknown email or a wrong password
- When the backend handles the request
- Then it responds `401` with `{ error: { code: "INVALID_CREDENTIALS", message } }`, uses a generic message, and does not return a hash or confirm whether the email exists

### Scenario AC-006: Authenticated profile access

- Given an authenticated user with a valid session cookie
- When they request their own profile
- Then the backend returns `{ id, email, displayName }` and does not include a password hash

### Scenario AC-007: Unauthenticated protected access

- Given a caller with no session cookie, or a malformed, expired, revoked, or unknown session cookie
- When they request a protected profile operation, logout, or probe operation
- Then the backend responds `401` with `{ error: { code, message } }` and does not return profile or probe data

### Scenario AC-008: Authorization is distinct from authentication

- Given user A is authenticated
- When A attempts to read or update user B’s profile
- Then the backend responds `403` with `{ error: { code, message } }` and B’s profile is unchanged

### Scenario AC-009: Own profile update

- Given an authenticated user
- When they update their profile with a valid `displayName`
- Then the backend persists `displayName`, later reads return the updated `{ id, email, displayName }`, and `email` is unchanged
- When they send `email` or other disallowed fields in the update body
- Then the API rejects the request as validation (`400`) and does not change email

### Scenario AC-010: Session lifecycle

- Given a session issued on login or on successful registration
- When the session is unrevoked and younger than 7 days, protected requests succeed
- When the user logs out, that session is revoked and later protected requests with that cookie fail as unauthenticated
- When 7 days have passed since issuance, the session is invalid even without logout
- Then other concurrent sessions for the same user remain valid until each is revoked or expires, and hashes and secrets are never returned

### Scenario AC-011: Sensitive data stays off the wire

- Given any auth or profile success or failure response
- When the body is inspected
- Then it uses the error envelope on failures, and never includes password hashes, plaintext passwords, secrets, stack traces, or database connection data, and never includes a bearer token for the client to store

### Scenario AC-012: System probe slice remains

- Given the verified foundation slice
- When this feature is implemented
- Then `SystemProbe` still exists without a user-ownership field, probe UI remains, `GET /health` and `GET /ready` still succeed without a session, and `POST`/`GET` `/api/system/probes` require a valid session while keeping the same success DTOs as `001-foundation`

### Scenario AC-013: Architecture path

- Given register, login, or profile is exercised
- When the request is handled
- Then control flows React UI → HTTP → Express route → owning controller → service → owning repository → Prisma → PostgreSQL for persistence, authentication middleware does not perform profile authorization, and Prisma types are not used as domain entities or public DTOs

### Scenario AC-014: Frontend auth flows

- Given the running frontend
- When a visitor registers (and is then authenticated), logs in, logs out, and views or updates their profile
- Then the UI covers loading, success, and error states, calls the backend at `VITE_API_URL` with `credentials: 'include'`, does not store a bearer token in JS, and does not treat hidden UI as authorization

### Scenario AC-015: Automated checks

- Given the new domain, API, and UI tests
- When the documented commands are run
- Then hashing and user-identity tests pass without HTTP or Prisma, and Vitest, Testing Library, and SuperTest checks for this feature pass, including existing `system` liveness/readiness cases and authenticated probe cases

### Scenario AC-016: Concurrent sessions and logout

- Given a user with two valid sessions from two logins
- When they log out using one session cookie
- Then that session is revoked, the other session still authenticates, and CORS `Access-Control-Allow-Origin` is the configured frontend origin (not `*`) with credentials allowed

### Scenario AC-017: Probes require authentication without ownership

- Given an unauthenticated caller
- When they `POST` or `GET` `/api/system/probes`
- Then the API responds `401` and does not create or list probes
- Given two authenticated users
- When either lists probes
- Then they see the same global list (no per-user ownership on `SystemProbe`)

## 7. Business Rules

- A user has a system-assigned identity and a unique email (case-insensitive) — owning domain: `users`
- A user owns their profile; another user MUST NOT read or change it — owning domain: `users` (authorization)
- `displayName` is updatable by the owner; `email` is not changeable in this feature — owning domain: `users`
- Passwords are secrets; only a hash is persisted; hashes are never part of a user profile — owning domain: `auth`
- Authentication proves identity; it does not grant access to another user’s resources — owning domain: `auth` (authentication) and `users` (authorization)
- Failed login MUST NOT disclose whether the email exists — owning domain: `auth`
- Duplicate emails are not allowed, including letter-case variants — owning domain: `users`
- A session belongs to one user, expires 7 days after issuance, and is revoked only by logout of that session; other sessions for the same user stay valid — owning domain: `auth`
- System probes remain non-product records owned by `system` and MUST NOT gain user ownership — owning domain: `system`
- `auth` MUST NOT use the `users` Prisma repository class; `users` MUST NOT depend on `auth`; `system` MUST NOT gain product identity rules — owning domains: `auth`, `users`, `system`

## 8. Data

**User** (owned by `users`)

- Meaning: a registered DevTrack person.
- Identity: system-assigned unique identifier.
- Account identifier: `email`, unique case-insensitively, stored in canonical lowercase form.
- Profile stored: `email`, `displayName`.
- Profile returned: `id`, `email`, `displayName`.
- Updatable in this feature: `displayName` only. Email is not changeable.
- Password hash is not a profile field.
- Lifecycle: created on successful registration; read of own profile; update of own `displayName`. Deletion and archival are out of scope.
- Uniqueness: email is unique case-insensitively.

**Password credential** (owned by `auth`)

- Meaning: the secret that authenticates a user.
- Storage: password hash only, never plaintext.
- Lifecycle: set at registration; verified at login. Password change and reset are out of scope.
- Deletion: out of scope.

**Session** (owned by `auth`)

- Meaning: proof of a successful login or registration: a server-side session identified by an opaque id in an HTTP-only cookie.
- Lifecycle: issued on login and on successful registration; accepted while unrevoked and younger than 7 days; revoked on logout of that session; rejected after absolute expiry.
- Concurrency: multiple sessions per user are allowed.
- Storage: server-side session row. No refresh-token store. No bearer token in the JSON body for the frontend to keep.
- Exposure: MUST NOT include password hashes. Cookie MUST be HTTP-only so JS cannot read it.

**System probe** (owned by `system`)

- Unchanged from `001-foundation` except access: create and list require authentication. No user-ownership field.

## 9. API and Integrations

The frontend remains the in-scope HTTP client. The browser uses the published backend port and `VITE_API_URL`. Frontend `fetch` MUST use `credentials: 'include'`. The backend MUST allow that frontend origin via CORS with credentials enabled. `Access-Control-Allow-Origin` MUST be the configured origin, never `*`.

The backend MUST provide these capabilities (HTTP paths and DTO field names belong in the plan):

- Register a user (public). Success also issues the session cookie.
- Log in (public). Success issues the session cookie.
- Log out (protected). Revokes the current session and clears the cookie.
- Authenticated read of own profile (protected).
- Authenticated update of own `displayName` (protected).
- Existing `GET /health` and `GET /ready` remain public.
- Existing `POST /api/system/probes` and `GET /api/system/probes` remain with the same success DTOs and now require authentication.

Error responses MUST use `{ error: { code, message } }` plus HTTP status.

There are no third-party identity providers in this feature.

## 10. Security

- Passwords MUST be hashed with an appropriate algorithm. Authentication and authorization MUST remain distinct.
- Protected profile, logout, and probe operations MUST be enforced in the backend. Hiding UI is not authorization.
- Own-profile authorization MUST compare the authenticated user to the target user resource, even if the HTTP shape is a `/me` route.
- External input MUST be validated with Zod at the HTTP boundary.
- Responses MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- CORS MUST allow only the configured frontend origin, not a wildcard, and MUST allow credentials.
- The session cookie MUST be HTTP-only. The frontend MUST NOT store a bearer token in JS.
- CSRF posture for this JSON API: HTTP-only cookie, `SameSite=Lax`, CORS origin allowlist with credentials, and JSON request bodies (not cookie-authenticated HTML form posts). A dedicated CSRF token is not in this feature.
- Database credentials stay in backend/runtime env only.
- New secrets MUST NOT be committed or baked into images.
- Public liveness and readiness remain intentional so orchestrators can probe without a session. Probe mutation and listing no longer stay public.

## 11. Non-Functional

- Register, login, logout, and profile MUST be usable enough to complete the flows; visual polish is not required.
- Existing local Compose, Node.js 22 LTS, npm, PostgreSQL 16, Zod, and Vitest + Testing Library + SuperTest stack MUST be reused.
- TypeScript strictness SHOULD catch boundary and domain typing issues.
- Numeric performance targets are not specified.
- Do not infer database readiness from container start order (unchanged from foundation).
- Local HTTP Compose MUST still be able to set and send the session cookie (do not require `Secure` on the local HTTP stack; production HTTPS images remain Q-006).

## 12. Dependencies

- Existing features: `001-foundation` Verified. Present in the repo: `frontend/`, `backend/`, Compose services `frontend`/`backend`/`db`, `system` domain, Prisma `SystemProbe` and migration `20261026120000_init_system_probe`, error envelope, CORS origin without credentials, `VITE_API_URL`.
- Architectural constraints: constitution v2.1.0; modular monolith; Prisma behind owning-domain repositories; no generic repository; no microservices; application source under `frontend/` or `backend/`; additive versioned migration; no unauthorized database reset or volume delete.
- External dependencies (already decided): Docker Compose; PostgreSQL 16; Node.js 22 LTS; npm; Prisma 6; React; Vite; Express; Zod; Vitest; Testing Library; SuperTest; CORS for the frontend origin.
- New dependencies: a password-hashing library appropriate for the constitution (plan: Argon2id); cookie parsing so the backend can read the session cookie. No JWT or bearer-token library.

## 13. Failures and Edge Cases

- Duplicate email, including different letter case: reject; no second user.
- Empty or missing email/displayName/password, or invalid email format: `400` validation envelope; nothing persisted.
- Wrong password or unknown email: unauthenticated, generic message.
- Missing/invalid/expired/revoked session cookie on protected routes: `401`.
- Authenticated user targeting another user’s profile: `403`; no data change.
- Profile update that includes `email` or unknown/disallowed fields: `400`; email unchanged.
- Logout without a valid session: `401`; no other sessions affected.
- Database unreachable: `503` with envelope; no secrets leaked.
- Invalid JSON/body: `400` with envelope.
- Frontend cannot reach backend: UI error state; no database credentials involved.
- Unauthenticated probe create/list: `401`; health and ready still public.
- Cookie `Secure` on local HTTP would drop the cookie: do not set `Secure` for the local HTTP Compose stack.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001, FR-004 | AC-001, AC-002 | Register API + persistence tests; case-insensitive duplicate |
| FR-002, FR-011 | AC-001, AC-011 | Hash stored; responses inspected |
| FR-003 | AC-003 | Validation API tests |
| FR-005, FR-010, FR-017 | AC-001, AC-004, AC-010, AC-016 | Login/register Set-Cookie; CORS credentials; no JS token |
| FR-006, FR-007 | AC-005, AC-007 | Failed login and 401 tests |
| FR-008, FR-009 | AC-006, AC-008, AC-009 | Profile get/update and 403 tests |
| FR-012, FR-013 | AC-013 | Module layout, repositories, migration |
| FR-014 | AC-014 | Frontend tests + `credentials: 'include'` |
| FR-015 | AC-012, AC-017 | Public health/ready; authenticated probes; no probe owner |
| FR-016 | AC-015 | Executed Vitest / Testing Library / SuperTest |

## 15. Open Questions

### Resolved (no longer blocking)

- **Q-010:** HTTP-only server-side session cookie. Frontend `fetch` uses `credentials: 'include'`. Backend CORS allows the frontend origin with credentials (not `*`). No bearer token stored in JS. Owner: architecture. Status: Resolved.
- **Q-011:** Login issues a session. Logout revokes that session. Absolute expiry 7 days. No refresh tokens. Multiple concurrent sessions per user allowed. Owner: `auth`. Status: Resolved.
- **Q-012:** Unique account identifier is email, case-insensitive. Owner: `users`. Status: Resolved.
- **Q-013:** Stored: email + displayName. Returned on profile: id, email, displayName. Updatable: displayName only. Email is not changeable in this feature. Owner: `users`. Status: Resolved.
- **Q-014:** `GET /health` and `GET /ready` stay public. `POST`/`GET` `/api/system/probes` require authentication. Do not add user ownership to `SystemProbe`. Owner: `system` + security. Status: Resolved.
- **Q-018:** Successful registration also authenticates (issues the same session cookie as login). Owner: product. Status: Resolved.

### Deferred (not required to implement this feature)

- **Q-015:** Password complexity beyond non-empty (minimum length, character classes). Owner: `auth`. Status: Deferred. Empty passwords are already rejected.
- **Q-016:** Frontend routing library and styling. Owner: frontend. Status: Deferred from `001-foundation`. This feature MUST NOT require introducing a router; view/state switching is enough.
- **Q-017:** Rate limiting and account lockout after failed logins. Owner: `auth`. Status: Deferred.

### Still deferred from `001-foundation` (out of scope)

- **Q-006:** Dev vs production images. Owner: architecture. Status: Deferred.
- **Q-007:** Probe list retention. Owner: `system`. Status: Deferred.
- **Q-009:** CI and deployment. Owner: project. Status: Deferred.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Blocking Q-010, Q-011, Q-012, Q-013, Q-014, and Q-018 are recorded as answered; deferred questions remain by design
- Approved for planning: Yes
- Approved for implementation: Held — artifacts are Approved; do not start T001–T018 until explicitly requested
