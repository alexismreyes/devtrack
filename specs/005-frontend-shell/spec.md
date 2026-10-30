# Feature Specification: Frontend Shell

- **ID:** 005-frontend-shell
- **Status:** Verified
- **Created:** 2026-10-30
- **Related features:** 001-foundation (Verified), 002-authentication (Verified), 003-projects (Verified), 004-tasks (Verified)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Do not write `specs/005-audit/` or treat this ID as audit work. Later audit work MUST use a different feature ID.

Q-016 is resolved at the product level for this feature: navigation MUST be real URL destinations, and styling MUST use the layout metaphors in FR-009 / Q-031. View/state switching MUST NOT remain the navigation model. Q-028, Q-029, Q-030, Q-031, and Q-032 are **decided** (see §15). There are no remaining blocking questions for this feature.

## 1. Problem

Verified slices already give users register, login, logout, own-profile, owner-only projects, and project-scoped tasks. The React app still switches those screens with in-memory view state in `App.tsx`. URLs do not identify destinations, the browser back button does not restore a screen, and every page stacks the foundation probe UI (`ProbePage`) with profile and the current project view. Styling is a single unstyled column (`App.css`). That deferred Q-016 choice now blocks a usable product shell.

Users need a frontend shell: client routing with React Router; authenticated chrome with a persistent left sidebar of the caller’s projects and a main area for the current destination; and a board-product layout using original DevTrack identity — without probe CRUD in the product UI, and without changing backend APIs, domains, or verified cookie auth.

## 2. Goals

- Replace view/state switching with React Router so login, register, projects (no project selected), project detail (with tasks), and profile are real destinations with shareable URLs and back/forward behavior.
- Provide authenticated app chrome: a persistent top app bar (application name, profile, logout) and a left sidebar whose primary content is the caller’s project list, always visible on authenticated product destinations, with the main area showing the current destination.
- When no project is selected (projects destination / after login), keep the sidebar visible and show an empty/select-or-create main area — not a second stacked full-page list that hides the sidebar.
- Remove `ProbePage` and probe chrome from the React app so guests and authenticated users never see probe create/list UI on any product destination, while leaving the system domain, probe HTTP API, Prisma `SystemProbe`, `GET /health`, `GET /ready`, and backend probe tests unchanged.
- Restyle the shell and migrated screens with layout metaphors only (top app bar, left project sidebar, card-like surfaces, board-like project detail hosting existing tasks) and original DevTrack identity, using Tailwind CSS plus copied shadcn/ui components.
- Keep the same backend APIs, domains, cookie session behavior, and existing screen behaviors (loading, empty, success, validation/error, unauthenticated, forbidden, archived-parent conflict).
- Resolve Q-016 for routing and styling at the product level, with Q-028–Q-032 recorded as the implementation choices.

## 3. Non-Goals

- New product behavior, fields, or workflows beyond presenting existing verified screens in a routed, styled shell with sidebar chrome.
- API, DTO, contract, schema, or Prisma changes. No migrations. No database reset.
- New backend domains, a generic repository, or microservices.
- Kanban columns, a board-as-columns layout, drag-and-drop, or card dragging (later Kanban work). This sidebar is layout/navigation, not a Kanban board.
- An `includeArchived` (or equivalent) sidebar or list filter. Archived recovery stays on the existing project-detail destination.
- A required mobile-only collapse, drawer, or overlay for the sidebar. A persistent desktop sidebar is enough.
- Dashboard aggregates (pending, completed, overdue counts).
- Collaboration, membership, invitations, or `project-members`.
- App-wide CRUD audit logging. That later work MUST NOT use feature ID `005` and MUST NOT be written as `specs/005-audit/`.
- Password complexity beyond non-empty (Q-015), rate limiting / lockout (Q-017), probe retention (Q-007).
- Production images or CI/deployment (Q-006, Q-009).
- Changing HTTP-only `devtrack_session` cookie behavior, CORS credentials, or `fetch` `credentials: 'include'`.
- Storing a bearer token or session id in JavaScript.
- Treating hidden UI or client route guards as authorization.
- Deleting backend probe routes, Prisma `SystemProbe`, the `system` domain, `GET /health`, `GET /ready`, or backend probe HTTP tests.
- Adding a product destination for system probes (no `/system/probes` screen, no probe CRUD in the Trello-like app).
- Copying Trello trademarks, logos, or copyrighted assets, or making a Trello clone.
- Importing the entire shadcn/ui catalog, or adding a second CSS framework besides Tailwind.
- Nested task-detail URLs (optional later; not required here).

## 4. Actors and User Stories

### User Story US-001

As a guest, I want login and register to be distinct URL destinations, so that I can open, bookmark, and use the browser back button on those screens.

### User Story US-002

As an authenticated user, I want projects (no selection), project detail (with that project’s tasks), and profile to be distinct URL destinations, so that navigation is not in-memory view switching.

### User Story US-003

As an authenticated user, I want app chrome with a left sidebar of my projects that stays visible on product destinations, so that I can switch projects, open profile, and log out without a stacked full-page list hiding the shell.

### User Story US-004

As a guest or authenticated user, I want no system-probe create/list UI on any product destination, so that the Trello-like app is only auth, projects, tasks, and chrome.

### User Story US-005

As a developer, I want `GET /health`, `GET /ready`, the `system` domain, probe HTTP routes, Prisma `SystemProbe`, and backend probe tests left unchanged, so that removing `ProbePage` from the React app does not delete the verified backend probe slice.

### User Story US-006

As a user, I want the shell and migrated screens to use a top app bar, a left project sidebar, card-like surfaces, and a board-like project detail that hosts existing tasks, with original DevTrack identity, so that the UI is no longer an unstyled single column and is not a Trello clone.

### User Story US-007

As a developer, I want existing auth, profile, project, task, and probe API behavior unchanged, so that this feature is presentation-only.

### User Story US-008

As a guest, I want login and register to have no product sidebar, so that unauthenticated screens stay auth-only.

## 5. Functional Requirements

- **FR-001:** The React app MUST use React Router (Q-028) as the navigation model. Login, register, projects (no project selected), project detail, and profile MUST be distinct destinations identified by the URL. View/state switching in `App.tsx` (`guestView`, `selectedProjectId`, stacked profile + list/detail + probe) MUST NOT remain the navigation model. Nested selected-task UI MAY remain inside the project-detail destination. Q-016 is resolved at this product level.
- **FR-002:** Required destinations are: login, register, projects (authenticated, no project selected), project detail with the existing tasks UI, and profile. There MUST NOT be a product destination for system probes. Unknown URLs MUST show a not-found state with a way to reach login (guest) or the projects destination (authenticated). Not-found is not a product destination; the persistent product sidebar is not required there.
- **FR-003:** Opening a destination URL directly, using browser back and forward, and using in-app navigation MUST show the matching screen when the session state allows it. Authenticated session restore MUST still use `GET /api/users/me` with `credentials: 'include'` and then render the requested destination.
- **FR-004:** Guest destinations are login and register. Authenticated product destinations are projects (no selection), project detail, and profile. A guest who opens an authenticated destination MUST be sent to login and MUST NOT see project, task, or profile data from the client cache as if authorized. An authenticated user who opens login or register MUST be sent to the projects destination. Frontend guards MUST NOT replace backend authentication or owner checks.
- **FR-005:** After successful register or login, the user MUST land on the projects destination (sidebar visible; main area empty/select-or-create). After logout, the user MUST land on the login destination. Guest first visit of the app root MUST land on register (current default guest view). Logout MUST keep using `POST /api/auth/logout` and MUST NOT store session material in `localStorage` or `sessionStorage`.
- **FR-006:** Authenticated chrome MUST include: a persistent top app bar with the application name, access to profile, and logout; and a left sidebar whose primary content is the caller’s project list. That sidebar MUST be always visible on authenticated product destinations (projects, project detail, profile). The main area MUST show the current destination: the selected project’s existing detail + tasks (board-like surface), or profile, or the no-selection empty/select-or-create state. Guest chrome MUST offer login and register and MUST NOT present a product sidebar or project/task product navigation as if the user were signed in. Chrome MUST NOT include probe create/list controls or a probes nav item. A persistent desktop sidebar is enough; a mobile-only collapse, drawer, or overlay is NOT required (Q-032).
- **FR-007:** Existing screens MUST be migrated onto the destinations, not rewritten as new product features. Preserved behavior includes: register/login/logout/own-profile; project create/list/read/update/archive/unarchive; default list excludes archived; archived project detail remains so the owner can unarchive; task create/list/optional status and priority filters/read/update/soft-delete on the selected project; loading, empty, success, validation/error, unauthenticated, forbidden, and archived-parent conflict states. The project list MUST live in the authenticated sidebar and MUST NOT be presented as a second stacked full-page list on the projects destination that hides the sidebar. The frontend MUST keep using the published backend port, `VITE_API_URL`, and `fetch` `credentials: 'include'`. The frontend MUST NOT store a bearer token in JS. The frontend MUST NOT be the only access check.
- **FR-008:** `ProbePage` and probe chrome MUST be removed from the React app so they do not render on any product destination (not login, register, projects, project detail, profile, root, not-found, or chrome). Guests and authenticated users MUST NOT see probe create/list UI. There MUST NOT be a relocated `/system/probes` (or other) product screen. `GET /health`, `GET /ready`, `POST/GET /api/system/probes`, Prisma `SystemProbe`, the `system` domain, and backend probe HTTP tests MUST remain unchanged. Typed frontend client helpers for probes MAY remain if unused by UI; they MUST NOT be wired to a destination or chrome.
- **FR-009:** The shell and migrated screens MUST use layout metaphors only (Q-031): a persistent top app bar, a left project sidebar, card-like surfaces, and a board-like project detail area that hosts the existing task list/detail, with original DevTrack identity. This MUST NOT be a Trello clone. This MUST NOT add Kanban status columns, drag-and-drop, or card dragging. Trello trademarks, logos, and copyrighted assets MUST NOT be copied. CSS MUST be Tailwind CSS with copied shadcn/ui components (Q-029), not a second CSS framework. Copied shadcn sidebar/layout primitives MAY be added if required for this chrome; the entire catalog MUST NOT be imported.
- **FR-010:** This feature MUST NOT change backend modules, HTTP contracts, DTOs, status codes, Prisma schema, or migrations. Existing domains remain `system`, `auth`, `users`, `projects`, and `tasks`. No new domain. No generic repository. No microservices. No `project-members`.
- **FR-011:** HTTP-only session cookie `devtrack_session`, 7-day absolute expiry, logout revoke of that session, CORS origin with credentials, and public `GET /health` and `GET /ready` MUST remain as verified. Probe HTTP routes remain authenticated as in `002-authentication`.
- **FR-012:** Frontend dependencies added by this feature MUST be only those recorded for Q-028 and Q-029: React Router (version compatible with the current React 19 + Vite 7 stack); Tailwind CSS; copied shadcn/ui components under the frontend; and the usual small peers shadcn needs (`class-variance-authority`, `clsx`, `tailwind-merge`, an icons package, and Radix packages only as required by the chosen components). The entire shadcn catalog MUST NOT be imported. Sidebar/layout primitives are allowed only if required for this chrome. A second CSS framework MUST NOT be added. Routing MUST still be real URL destinations, not `App.tsx` view flags.
- **FR-013:** Critical shell behavior MUST be tested: destination rendering, guest vs authenticated guards, chrome including the left sidebar on authenticated product destinations and its absence on guest destinations, probe create/list UI absent from every product destination, `credentials: 'include'` on fetches, and no bearer/session id in JS storage. Migrated screen tests MUST be updated so they no longer require view/state switching, a stacked full-page project list that hides the sidebar, or probe-on-every-page. Typecheck MUST stay strict TypeScript as in the current frontend.
- **FR-014:** Task detail MAY stay nested state inside project detail. This feature MUST NOT require a new task-detail destination, Kanban, dashboard, members UI, or audit UI.
- **FR-015:** The sidebar project list MUST reuse existing verified project-list rules (Q-021): owner-only; default excludes archived; same APIs (`GET /api/projects`, `POST /api/projects`) with `credentials: 'include'`; no new list query or backend fields. Selecting a project MUST navigate to the existing project-detail URL destination (`/projects/:projectId`). Create-project MUST remain available in this chrome (in the sidebar and/or an obvious control) without new backend fields. When a listed project is the current destination, it MUST be identifiable as selected. This feature MUST NOT add an `includeArchived` sidebar filter. An archived project opened via its detail URL MUST keep verified archive/unarchive on that destination; it MAY be absent from the sidebar because the default list excludes archived.
- **FR-016:** When authenticated with no project selected (projects destination, including after login/register and authenticated app-root redirect), the left sidebar MUST remain visible and the main area MUST be an empty/select-or-create state. The main area MUST NOT be a second stacked full-page project list that hides the sidebar. Profile remains a destination and MUST keep the sidebar so the user can jump back to a project.

## 6. Acceptance Criteria

### Scenario AC-001: Guest destinations

- Given a browser with no valid session
- When the user opens the register destination or the login destination
- Then the matching existing form is shown, the URL identifies that destination, the other guest form is not stacked on the same page as view-state chrome, and no product sidebar is shown

### Scenario AC-002: Guest cannot open product destinations

- Given a browser with no valid session
- When the user opens projects, project detail, or profile
- Then they are sent to login and project/task/profile data is not presented as an authorized view

### Scenario AC-003: Register then projects destination

- Given a guest on the register destination
- When registration succeeds
- Then they are authenticated with the existing cookie session behavior and land on the projects destination with the left sidebar visible and an empty/select-or-create main area

### Scenario AC-004: Login then projects destination

- Given a guest on the login destination
- When login succeeds
- Then they land on the projects destination (sidebar visible; empty/select-or-create main) and the session is the verified HTTP-only cookie (no bearer token in JS)

### Scenario AC-005: Logout to login

- Given an authenticated user
- When they log out from app chrome
- Then `POST /api/auth/logout` is used, in-memory user state is cleared, they land on the login destination, `localStorage` / `sessionStorage` still hold no session id or bearer token, and the product sidebar is gone

### Scenario AC-006: Authenticated destinations

- Given an authenticated user
- When they navigate to projects (no selection), a project detail URL for a project they can open, and profile
- Then each is a distinct destination, the URL matches, those screens are not all stacked at once as in the pre-shell `App.tsx`, and the left sidebar remains visible on each

### Scenario AC-007: Direct URL and history

- Given an authenticated session
- When the user opens a project detail destination directly, then navigates to the projects destination, then uses browser back
- Then project detail is shown again from the URL, not from a `selectedProjectId` flag with `window.location.pathname` stuck at `/`

### Scenario AC-008: Session restore onto a destination

- Given a valid session cookie
- When the app loads on a protected destination
- Then `GET /api/users/me` runs with `credentials: 'include'` and that destination is shown after restore (including the sidebar on product destinations)

### Scenario AC-009: Authenticated user hitting guest destinations

- Given an authenticated user
- When they open login or register
- Then they are sent to the projects destination

### Scenario AC-010: App chrome

- Given an authenticated user
- When they use the shell
- Then chrome shows the application name, profile, logout, and a left sidebar whose primary content is the caller’s project list; on project detail the loaded project name is shown as context and that project is identifiable as selected in the sidebar when it appears in the list; guest chrome does not present that authenticated product navigation or a product sidebar; chrome has no probe create/list controls and no probes destination link

### Scenario AC-011: Migrated project and task behavior

- Given an authenticated owner
- When they use the sidebar list, create-project in this chrome, and project detail
- Then create/list/read/update/archive/unarchive, default list excluding archived, archived detail with unarchive, and task create/list/filter/read/update/soft-delete still work with the existing loading/empty/success/error/unauthenticated/forbidden/conflict states, and fetches keep `credentials: 'include'`

### Scenario AC-012: No probe UI on product destinations

- Given a guest or an authenticated user on login, register, projects, project detail, profile, app root, or not-found
- When the page renders
- Then probe create/list UI is not present (no `ProbePage`, no “Record probe” control, no “Recorded probes” heading, no probes list chrome)

### Scenario AC-013: Probe backend slice unchanged; product UI removed

- Given this feature’s implementation
- When the React app and backend are inspected
- Then `ProbePage` (and probe chrome) are gone from the React app and do not render on any product destination; `GET /health`, `GET /ready`, `POST/GET /api/system/probes`, Prisma `SystemProbe`, the `system` domain, and backend probe HTTP tests remain as verified in `001`–`004`

### Scenario AC-014: Layout metaphors and DevTrack identity

- Given any migrated destination
- When the UI renders
- Then a persistent top app bar, a left project sidebar on authenticated product destinations, and card/board-like surfaces are used instead of the pre-shell unstyled single column, original DevTrack identity is used (not a Trello clone), and there are no Kanban columns, no drag-and-drop, no card dragging, and no Trello trademarks, logos, or copyrighted assets

### Scenario AC-015: No backend contract change

- Given this feature’s implementation
- When APIs, Prisma schema, and migrations are inspected
- Then they are unchanged from the verified `001`–`004` state; no new domain, generic repository, microservice, or `005-audit` artifacts exist

### Scenario AC-016: Root landing

- Given a guest visiting the app root
- When the shell resolves the route
- Then they land on register
- Given an authenticated user visiting the app root
- When the shell resolves the route
- Then they land on the projects destination with the left sidebar visible and an empty/select-or-create main area

### Scenario AC-017: Unknown destination

- Given a session of either kind
- When the user opens an unknown path (including any former probe path such as `/system/probes`)
- Then a not-found state is shown with navigation to login (guest) or the projects destination (authenticated), and probe create/list UI is not shown

### Scenario AC-018: Frontend verification

- Given the frontend test suite and typecheck
- When they are run
- Then shell routing/chrome/sidebar tests pass, updated screen tests no longer require view/state switching, a stacked full-page list that hides the sidebar, or probe-on-every-page, tests assert probe UI absence on product destinations, `credentials: 'include'` is still asserted, and `npm run typecheck` in `frontend/` passes

### Scenario AC-019: Extra dependencies documented

- Given the Q-028 and Q-029 decisions
- When `frontend/package.json` is inspected
- Then new runtime/dev packages are React Router (compatible with the current React/Vite stack), Tailwind CSS, and the documented shadcn peers; copied shadcn components live under the frontend; no undeclared CSS framework or router package is added; the full shadcn catalog is not present as unused bulk; sidebar/layout primitives appear only if used by this chrome

### Scenario AC-020: Authenticated left sidebar

- Given an authenticated user on projects, project detail, or profile
- When the shell renders
- Then a left sidebar is visible whose primary content is the caller’s project list, and the main area shows that destination rather than replacing the sidebar

### Scenario AC-021: Guest has no product sidebar

- Given a guest on login or register
- When the page renders
- Then no product sidebar and no caller project list are shown

### Scenario AC-022: No project selected

- Given an authenticated user on the projects destination (including after login/register)
- When the shell renders
- Then the left sidebar is visible and the main area is an empty/select-or-create state, not a second stacked full-page project list that hides the sidebar

### Scenario AC-023: Sidebar selection navigates to project detail

- Given an authenticated user with at least one listed project
- When they select a project in the sidebar
- Then they navigate to the existing project-detail URL destination for that project and the main area shows that project’s existing detail + tasks

### Scenario AC-024: Profile keeps the sidebar

- Given an authenticated user on the profile destination
- When the shell renders
- Then the left sidebar remains visible so the user can jump to a project, and the main area shows profile (not a stacked full-page list)

### Scenario AC-025: Sidebar reuses verified list rules; archived detail unchanged

- Given an authenticated owner
- When the sidebar list loads
- Then it uses the existing owner-only project list APIs with `credentials: 'include'`, default-excludes archived projects, and has no `includeArchived` control
- Given that owner opens an archived project via its detail URL
- When that destination renders
- Then verified archive/unarchive remains available on that destination even if the archived project is absent from the sidebar

### Scenario AC-026: Create-project remains available

- Given an authenticated user in product chrome
- When they create a project using the control in this chrome (sidebar and/or an obvious control)
- Then create uses the existing project create API and fields (no new backend fields), and a successful create can be selected from the sidebar afterward

## 7. Business Rules

- Navigation identity is the URL destination, not React view flags — owning concern: frontend shell (no new backend domain).
- Backend authentication and owner authorization remain the source of access control — owning domains: `auth`, `users`, `projects`, `tasks`.
- Probe records remain a global authenticated list with no ownership (Q-014) on the backend; they have no product-UI destination in this feature — owning domain: `system`.
- Default project list excludes archived projects; there is no `includeArchived` filter (Q-021); owner GET of archived detail remains allowed — owning domain: `projects`. The sidebar MUST follow those same rules.
- Tasks stay project-scoped, soft-deleted via `deletedAt`, nested in project detail for this feature — owning domain: `tasks`.
- No new product fields, statuses, or roles.
- Visual identity is original DevTrack using layout metaphors only (Q-031), including a left project sidebar (Q-032), not a Trello clone.
- Authenticated product destinations always show the left project sidebar; guest destinations do not.

## 8. Data

No new business data. No new persistence.

The shell reads existing public DTOs already used by the frontend (`PublicUserDto`, `PublicProjectDto`, `PublicTaskDto`). Project context in chrome uses the project already loaded for detail, not a new API. The sidebar list uses the existing project list payload. Probe DTOs remain on the backend (and MAY remain in unused frontend types/helpers) but MUST NOT drive a product screen.

Session material stays in the HTTP-only `devtrack_session` cookie. The frontend MUST NOT persist session ids or bearer tokens.

Probe list retention remains deferred (Q-007).

## 9. API and Integrations

No new endpoints and no contract changes.

The shell continues to call the verified client helpers against `VITE_API_URL`:

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/users/me`, `PATCH /api/users/me`
- `GET/POST /api/projects`, `GET/PATCH /api/projects/:id`, archive/unarchive
- Project-scoped task list/create and task get/patch/delete
- `POST/GET /api/system/probes` remain on the backend; the product UI MUST NOT call them
- Public `GET /health` and `GET /ready` remain unused as product chrome

HTTP schemas stay in the verified `001`–`004` plans. This feature MUST NOT add request/response fields. The sidebar MUST NOT introduce an `includeArchived` query or any new list parameter.

## 10. Security

- Authentication remains the HTTP-only `devtrack_session` cookie. Frontend keeps `credentials: 'include'` on every `fetch`.
- Authorization remains resource-level in the backend. Client route guards only choose which screen to show.
- Hidden nav links and a client-only sidebar are not access control. The sidebar MUST still call owner-only list APIs; it MUST NOT invent a broader list.
- Responses and UI MUST NOT display secrets, hashes, or stack traces (unchanged).
- No new secrets, env vars, or cookie flags.
- Removing probe UI MUST NOT make probe HTTP routes public; unauthenticated probe calls still 401.

## 11. Non-Functional

- Usable navigation: URLs, back/forward, sidebar, and chrome must be enough to move between the required destinations without stacked screens that hide the sidebar.
- Maintainable presentation: destination components reuse existing screen modules under `frontend/src/` rather than duplicating API calls in a parallel tree. Sidebar list logic MAY be extracted from `ProjectsPage` rather than leaving a duplicate stacked list.
- Educational clarity: routing and styling choices (Q-028–Q-032) MUST be documented in the plan.
- Copied shadcn components stay under `frontend/` and remain reviewable source, not a magic all-in-one runtime package.
- Desktop-first chrome: a persistent left sidebar is the required layout. Responsive collapse is unspecified and not required.
- No invented performance budgets.
- Local Compose remains Vite/tsx dev servers (Q-006 deferred). History fallback in that Vite setup MUST keep supporting direct destination URLs in development.

## 12. Dependencies

- Existing features: Verified `001-foundation`, `002-authentication`, `003-projects`, `004-tasks`.
- Architectural constraints: constitution v2.1.0 (modular monolith, no generic repository, no microservices, frontend talks to backend over HTTP only, TypeScript, SDD artifacts). `prompt.md` stack: React, TypeScript, Vite, documented client routing, maintainable API client. Additional dependencies require an explicit documented decision.
- External dependencies (decided):
  - Q-028: React Router (SPA/library mode, version compatible with React 19.2 + Vite 7).
  - Q-029: Tailwind CSS; shadcn/ui copied into the frontend; peers `class-variance-authority`, `clsx`, `tailwind-merge`, icons, and Radix only as required by chosen components. Sidebar/layout primitives allowed if required for this chrome.

## 13. Failures and Edge Cases

- Session check loading: show a loading state; do not flash protected data to a guest.
- Session check non-auth failure: show an error; do not pretend the user is a guest or authenticated.
- 401 on a protected screen: treat as logged out and send the user to login (existing `onUnauthenticated` behavior).
- 403 on project detail: show the existing forbidden state on that destination; do not invent a new authorization model. Sidebar list remains the caller’s own projects.
- Archived project detail URL: still opens for the owner with unarchive (Q-020 / Q-021 behavior). Direct URL to an archived id is allowed for the owner even though the default sidebar list hides it. Do not invent an `includeArchived` sidebar filter to make it appear.
- Unknown project id: existing not-found/error handling on the detail screen; sidebar still shows the default list.
- Nested task selection inside project detail is not required to be a URL; refresh MAY clear selected task state.
- Path `/system/probes` (or any other probe-like path) is an unknown destination: not-found, no probe CRUD UI. Product sidebar is not required on not-found.
- Empty project list: sidebar shows the existing empty list state; main area on the projects destination remains select-or-create.
- Do not `prisma migrate reset` or delete `pgdata`.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001, FR-002 | AC-001, AC-006, AC-007, AC-016, AC-017 | Frontend routing tests |
| FR-003, FR-005 | AC-003, AC-004, AC-005, AC-007, AC-008 | Frontend tests + credentials asserts |
| FR-004 | AC-002, AC-009, AC-021 | Guard tests |
| FR-006 | AC-010, AC-020, AC-021 | Chrome/sidebar tests |
| FR-007, FR-014 | AC-011 | Updated project/task/profile tests |
| FR-008 | AC-012, AC-013, AC-017 | Probe UI absence tests; inspect backend probe slice |
| FR-009 | AC-014 | UI assertions / review of layout metaphors and identity |
| FR-010, FR-011 | AC-015 | Inspect APIs, Prisma, cookie usage |
| FR-012, FR-013 | AC-018, AC-019 | `frontend` typecheck + tests; package.json vs Q-028/Q-029 |
| FR-015 | AC-011, AC-023, AC-025, AC-026 | Sidebar list/create/navigation tests |
| FR-016 | AC-003, AC-004, AC-016, AC-022, AC-024 | Empty-main and profile-sidebar tests |

## 15. Open Questions

### Resolved for this feature (product level)

- **Q-016:** Frontend routing and styling. Owner: frontend. Status: **Resolved for `005-frontend-shell`**. Navigation MUST be real URL destinations (not view/state switching). Styling MUST be the layout metaphors in FR-009 / Q-031 with original DevTrack identity.

### Resolved implementation choices (blocking questions answered)

- **Q-028:** Router library. Owner: frontend. Status: **Resolved**. Use **React Router** as an explicit documented dependency. Use a React Router version compatible with the current frontend React 19.2 + Vite 7 stack, in SPA/library mode (browser history). Destinations remain real URLs. Do not keep `App.tsx` view/state switching as the navigation model.
- **Q-029:** CSS approach. Owner: frontend. Status: **Resolved**. Use **shadcn/ui** (user said “chadcn”) with **Tailwind CSS** as the required companion. Document Tailwind, shadcn (copied components under the frontend, not a magic all-in-one package), and the usual small peers (`class-variance-authority`, `clsx`, `tailwind-merge`, icons, Radix only as required by chosen components) as an explicit dependency decision. Copy only components needed to restyle existing shell screens (auth, projects, tasks, chrome). Sidebar/layout primitives MAY be copied if required for this chrome. Do not add a second CSS framework. Do not import the entire shadcn catalog. Visual identity stays Q-031.
- **Q-030:** Probe destination. Owner: frontend. Status: **Resolved**. **No product-UI destination for system probes.** The Trello-like app does not need probe CRUD in the UI. Keep `GET /health`, `GET /ready`, the `system` domain, and probe HTTP API/backend tests unchanged. Remove `ProbePage` (and probe chrome) from the React app so it does not render on any product destination. Do not delete backend probe routes, Prisma `SystemProbe`, or the `system` domain in this feature. Guests and authenticated users must not see probe create/list UI.
- **Q-031:** Visual fidelity. Owner: product + frontend. Status: **Resolved**. **Layout metaphors only** — top app bar, left project sidebar, card-like surfaces, board-like project detail hosting existing tasks, original DevTrack identity. Not a Trello clone. No trademarks/logos/assets. No Kanban columns. No drag-and-drop. No card dragging.
- **Q-032:** Authenticated chrome layout. Owner: product + frontend. Status: **Resolved**. Authenticated product destinations MUST use a left sidebar whose primary content is the caller’s project list (always visible). Main area shows the current destination (selected project detail + tasks, profile, or empty/select-or-create when none selected). Guest login/register have no product sidebar. Sidebar list reuses verified owner-only, default-excludes-archived project-list rules and the same APIs; selecting a project navigates to the existing project-detail URL. Create-project remains available in this chrome (sidebar and/or an obvious control) without new backend fields. Profile keeps the sidebar. Archived detail URLs keep verified archive/unarchive; do not add an `includeArchived` sidebar filter. A persistent desktop sidebar is enough; mobile-only collapse is not required. This is layout/navigation, not Kanban.

### Deferred (out of scope)

- **Q-006:** Dev vs production images. Owner: architecture. Status: Deferred.
- **Q-007:** Probe list retention. Owner: `system`. Status: Deferred.
- **Q-009:** CI and deployment. Owner: project. Status: Deferred.
- **Q-015:** Password complexity beyond non-empty. Owner: `auth`. Status: Deferred.
- **Q-017:** Rate limiting and account lockout. Owner: `auth`. Status: Deferred.

### Later product work (do not specify here)

- Kanban columns and drag-and-drop.
- Dashboard aggregates.
- Project membership / `project-members`.
- App-wide CRUD audit logging (future feature ID, **not** `005`).
- Nested task-detail URLs (optional later; not required here).
- Responsive/mobile sidebar collapse (unspecified; not required here).

### Remaining open

None for this feature. Create-project placement (sidebar and/or an obvious chrome control) is allowed either way as long as it is available and uses existing APIs.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-028, Q-029, Q-030, Q-031, and Q-032 are recorded
- Approved for planning: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Non-blocking: sidebar list refetch is pathname-keyed (`AuthenticatedLayout.tsx`), so an archived project can remain in the sidebar until navigation. Coordinator independently re-ran (Node 22.13.0): `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 11 files / 92 tests passed. Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): guest `/` → `/register`, no sidebar; register → `/projects` with left sidebar + empty/select-or-create main; create project in sidebar; select project → `/projects/:id` with tasks list not columns; profile keeps sidebar; logout → `/login` no sidebar; guest `/projects` → `/login`; `/system/probes` → not-found, no probe UI. No drag-and-drop.
- Verified: Yes; Q-016 resolved by this feature; Q-028–Q-032 recorded; deferred Q-006, Q-007, Q-009, Q-015, Q-017 remain; Kanban, dashboard, collaboration, and audit remain unimplemented; later audit MUST NOT use ID `005`
