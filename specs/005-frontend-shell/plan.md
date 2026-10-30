# Implementation Plan: Frontend Shell

- **Feature ID:** 005-frontend-shell
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Q-016 is resolved at product level. Q-028, Q-029, Q-030, Q-031, and Q-032 are **recorded decisions** (not recommendations). Do not write `specs/005-audit/`; this ID is the frontend shell, not audit. Later audit MUST use a different feature ID.

## 1. Summary

Replace the verified React app’s in-memory view/state switching with a frontend shell: React Router destinations, authenticated chrome with a persistent left project sidebar and a main area for the current destination, Tailwind + copied shadcn/ui restyle using layout metaphors and original DevTrack identity, and removal of `ProbePage` from the product UI.

This is presentation-only. Reuse existing screen modules (`LoginForm`, `RegisterForm`, `LogoutButton`, `ProfilePage`, `ProjectsPage` list/create logic, `ProjectDetail`, `TasksPanel`/`TaskDetail`) and the typed API client (`credentials: 'include'`, `VITE_API_URL`). Do not change backend routes, DTOs, Prisma, or domains.

Navigation today is `guestView` plus `selectedProjectId` in `frontend/src/App.tsx`, with `ProbePage` rendered on every session. After this feature, destinations are URLs. The caller’s project list lives in authenticated chrome’s left sidebar, not in a stacked full-page list that hides the shell. Nested selected-task state may stay inside project detail. There is no product destination for probes.

## 2. Current State

Inspected 2026-10-30. `001-foundation`, `002-authentication`, `003-projects`, and `004-tasks` are Verified.

Present and in use:

- Compose services `frontend`, `backend`, `db`; frontend is Vite React TypeScript on published port 5173; `VITE_API_URL` from repo-root env
- Frontend dependencies: `react` ^19.2.0, `react-dom` ^19.2.0; no router; no CSS framework; no Tailwind; no shadcn
- `frontend/src/main.tsx` mounts `App` and imports `App.css`
- `frontend/src/App.tsx` holds session state (`GET /api/users/me`), guest register/login toggle (default register; logout → login), stacked profile + projects list or `ProjectDetail`, and global `ProbePage`
- Screens: `auth/LoginForm`, `auth/RegisterForm`, `auth/LogoutButton`, `users/ProfilePage`, `projects/ProjectsPage` (full-page list + create; `GET/POST /api/projects`; client filters `archivedAt === null`), `projects/ProjectDetail`, `tasks/TasksPanel`, `tasks/TaskDetail`, `system/ProbePage`
- `frontend/src/api/client.ts` already covers auth, profile, projects, tasks, probes with `credentials: 'include'`
- `frontend/src/App.css` is a narrow unstyled column
- Vite `envDir` is the repo root; Vitest + Testing Library; `App.test.tsx` asserts no client router (`pathname` stays `/`) and probe on every page
- `frontend/src/system/ProbePage.test.tsx` covers probe create/list UI
- `frontend/tsconfig.json` has no `@/` path alias
- Frontend Dockerfile is the local Vite dev server (Q-006 deferred). Vite already falls back unknown paths to `index.html` in that mode
- Backend modules `system`, `auth`, `users`, `projects`, `tasks` unchanged by this plan

Absent:

- Client routing / URL destinations
- App chrome separate from stacked screens
- Left sidebar of the caller’s projects on authenticated product destinations
- Layout-metaphor visual language / original DevTrack themed surfaces
- Probe UI off the global tree (today it is on every page)

Limitations to respect:

- Do not change cookie auth, CORS, or the API client contract for product calls
- Do not add Kanban columns, DnD, or card dragging while making the UI “board-like” or “Trello-style”
- Do not add an `includeArchived` sidebar filter; Q-021 remains
- Do not require a mobile collapse/drawer; persistent desktop sidebar is enough
- `App.test.tsx` and related tests MUST be rewritten for destinations and sidebar chrome; they currently lock Q-016 deferred behavior
- Do not reset the database or delete `pgdata`
- Do not add a `/system/probes` route to “preserve” UI that Q-030 removed

## 3. Domain Boundaries

- Owning domain: none new. This is frontend presentation. Do not create a `shell` backend module or a generic repository.
- Other domains (unchanged, HTTP only):
  - `auth` — session cookie, register/login/logout
  - `users` — own profile
  - `projects` — owner-only projects, archive/unarchive; default list excludes archived
  - `tasks` — project-scoped tasks, soft-delete
  - `system` — authenticated probes and public health/ready remain on the backend; unused as product chrome
- Invariants: no new backend invariants. Frontend MUST NOT treat route guards as authorization. Probe still has no ownership (Q-014). Probe has no product UI in this feature (Q-030). Sidebar MUST NOT broaden project visibility beyond owner-only default list.
- Cross-domain interfaces: none. The frontend already calls public HTTP DTOs.
- Dependency direction: `frontend/` → HTTP → existing Express routes. Frontend MUST NOT import Prisma, backend modules, or `DATABASE_URL`.
- Controller, service, repository, DTOs, routes, validators, domain objects: **no backend file changes**. Do not add empty product domain folders.

## 4. API Contract

No endpoint is added, removed, or changed.

Existing contracts remain as verified in `002-authentication`, `003-projects`, and `004-tasks`:

| Method and path | Auth | Use in this feature |
| --- | --- | --- |
| `POST /api/auth/register` | public | register destination |
| `POST /api/auth/login` | public | login destination |
| `POST /api/auth/logout` | session | chrome logout |
| `GET /api/users/me` | session | session restore + profile |
| `PATCH /api/users/me` | session | profile destination |
| `GET /api/projects` | session | **sidebar project list** (owner-only; default excludes archived; no `includeArchived`) |
| `POST /api/projects` | session | create-project control in this chrome |
| `GET/PATCH /api/projects/:id` | session + owner | project detail (main area) |
| archive/unarchive project | session + owner | project detail (including archived URL) |
| task list/create/get/patch/delete | session + owner | nested in project detail |
| `POST/GET /api/system/probes` | session | **unchanged backend; not used by product UI** |
| `GET /health`, `GET /ready` | public | unchanged; not product chrome |

Request/response DTOs, validation, status codes, and error envelope stay as already specified. Error cases (401, 403, 404, 409, 400) are still handled by existing screens.

If implementation is tempted to add a “current project for chrome” endpoint or an `includeArchived` list query, that is out of scope: use the project detail payload already fetched, and keep the default list.

## 5. Persistence

- Prisma model changes: none
- Relationships, constraints, indexes: none
- Migration implications: none; do not create a migration; do not run `migrate reset`; do not delete `pgdata`
- Repository contracts: unchanged
- Transactions: none
- Compatibility risks: none at the database. Risk is frontend-only test churn

Do not expose Prisma models as domain entities or API DTOs (unchanged rule; not exercised here).

## 6. Frontend

**Routing (Q-028 decided: React Router)**

Add React Router as an explicit dependency. Use a version compatible with the current stack (`react` ^19.2.0, `react-dom` ^19.2.0, Vite ^7.1.12, TypeScript ^5.8). Use SPA/library mode with browser history (`BrowserRouter` or `createBrowserRouter`), not React Router framework/SSR mode.

Wrap the tree from `main.tsx`. Destination map lives in `App.tsx` or a small `frontend/src/routes/` module. Tests use the library’s memory router (`MemoryRouter` / `createMemoryRouter`). Stop asserting `pathname === '/'` as proof of no router.

Planned path map:

| Destination | Path | Session | Chrome |
| --- | --- | --- | --- |
| Register | `/register` | guest | no product sidebar |
| Login | `/login` | guest | no product sidebar |
| App root | `/` | guest → register; authenticated → projects | follows target |
| Projects (no selection) | `/projects` | authenticated | left sidebar + empty/select-or-create main |
| Project detail + tasks | `/projects/:projectId` | authenticated | left sidebar + existing detail/tasks in main |
| Profile | `/profile` | authenticated | left sidebar + profile in main |
| Unknown (including `/system/probes`) | `*` | not-found; no probe UI | product sidebar not required |

There is **no** probe destination.

Guards: wait for session restore; guests hitting authenticated paths go to login; authenticated users hitting login/register go to `/projects`. Loading and non-auth session errors stay visible.

Task detail stays nested state inside `TasksPanel` (no required `/tasks/:id` route).

**Chrome (Q-032)**

Authenticated product layout (desktop; persistent; mobile collapse not required):

- Top app bar: application name, profile access, logout (`LogoutButton` / `POST /api/auth/logout`)
- Left sidebar: caller’s project list as primary content; create-project in the sidebar and/or an obvious control in this chrome
- Main area: current destination only — empty/select-or-create on `/projects`; existing `ProjectDetail` + tasks on `/projects/:projectId`; `ProfilePage` on `/profile`

Guest: app name, links to register and login; **no** product sidebar.

Probe: not in primary or secondary chrome; no probes nav item.

Do not render a second stacked full-page `ProjectsPage` on `/projects` that hides the sidebar. Reuse or extract the verified list/create behavior from `ProjectsPage` into sidebar (and optional empty-main create control). Selecting a list item MUST navigate to `/projects/:projectId`, not set a view flag.

On project detail, show the loaded project name as context. When that project appears in the default sidebar list, mark it as the current selection. An archived project opened by URL MAY be absent from the sidebar; keep archive/unarchive on the detail destination.

Reuse `LogoutButton`; do not duplicate logout fetch logic.

**Screens**

Keep modules; adapt props that today are callbacks for view switching (`onSelectProject`, `onBack`) into destination navigation. Preserve loading/empty/success/error/unauthenticated/forbidden/conflict UI. After archive, remain on the project detail destination.

Remove `frontend/src/system/ProbePage.tsx` and `ProbePage.test.tsx` (or equivalent) so `ProbePage` cannot render. Do not mount probe create/list UI from `App.tsx` or layout. Typed `createProbe` / `listProbes` helpers MAY remain unused by UI; they MUST NOT be called from destinations or chrome.

**Visual language (Q-029 decided: shadcn + Tailwind; Q-031 decided: layout metaphors; Q-032 decided: left sidebar)**

- Tailwind CSS is the only CSS framework. Use the Tailwind version and Vite integration required by the current shadcn/ui Vite + React recipe (typically Tailwind v4 with `@tailwindcss/vite`).
- shadcn/ui components are **copied** under the frontend (usual `src/components/ui/`), not consumed as a magic all-in-one runtime package. CLI/config (`components.json`) is allowed.
- Copy only primitives needed to restyle existing shell screens: auth forms, project surfaces, tasks panel, chrome, and the left sidebar. Expected: Button, Input, Label, Card, and similar. Sidebar/layout primitives MAY be copied if required for this chrome. Add a Radix-backed piece only if that chosen component requires it. Do not import the entire catalog.
- Usual small peers: `class-variance-authority`, `clsx`, `tailwind-merge`, icons (usual shadcn default `lucide-react`), Radix packages only as required by chosen components. A `cn()` helper under `frontend/src/lib/utils.ts` is expected scaffolding, not a new domain.
- Path alias `@/` → `frontend/src/` MAY be added if required by shadcn.
- Do not add a second CSS framework (no Bootstrap, MUI, vanilla design-system in parallel). Retire the unstyled `App.css` column as the styling system; leftover global CSS MUST NOT compete with Tailwind.
- Q-031 / Q-032: top app bar, left project sidebar, card-like surfaces, board-like project detail hosting existing tasks, original DevTrack identity. Not a Trello clone. No trademarks/logos/assets. No Kanban columns. No drag-and-drop. No card dragging. Theme tokens (colors, radius) express DevTrack, not Trello branding.
- Persistent desktop sidebar is the required layout. Do not invent a mobile-only collapse unless a later spec requires it.

**API integration**

No new client methods required. Sidebar uses existing `listProjects` / `createProject`. Product screens keep existing helpers. Do not add a global store library. Do not call probe helpers from product UI. Do not add list query parameters.

**State**

Session user in memory after `GET /api/users/me` / login / register, as today. URL owns which destination is shown (`/projects` vs `/projects/:projectId` vs `/profile`). Logout clears in-memory user; cookie cleared by backend.

## 7. Files

Expected new or updated files. Names may shift slightly; roots MUST remain `frontend/` (and `backend/` only if an unexpected compile fix is required — not planned).

**frontend/**

- `src/main.tsx` — mount React Router provider
- `src/App.tsx` — destination layout and guards; remove `guestView` / `selectedProjectId` navigation; unmount `ProbePage`
- `src/index.css` (or Tailwind entry) — replace `App.css` as the styling system
- `src/layout/` (or equivalent) — authenticated chrome: top app bar, **left project sidebar**, main outlet; guest chrome without product sidebar
- `src/routes/` (optional) — destination elements if `App.tsx` would become large
- `src/components/ui/` — copied shadcn primitives actually used (including sidebar/layout primitives only if required)
- `src/lib/utils.ts` — `cn()` helper
- `components.json` — shadcn config if the CLI is used
- `vite.config.ts` / `tsconfig.json` — Tailwind plugin and optional `@/` alias
- Existing screen files under `auth/`, `users/`, `projects/`, `tasks/` — navigation props and shadcn/Tailwind classes; `ProjectsPage` list/create reused or extracted into sidebar; not new product behavior
- `src/system/ProbePage.tsx` and `ProbePage.test.tsx` — **remove** (not relocate)
- `src/App.test.tsx` and screen tests — destinations, guards, chrome/**sidebar**, empty main, probe **absence**, credentials
- `package.json` / `package-lock.json` — React Router, Tailwind, shadcn peers as documented
- `index.html` — optional `lang`/title remain; no design-system CDN

**backend/**

- None planned

**root**

- Compose, env, Prisma: no change
- Do not create implementation source under `specs/`
- Do not create `specs/005-audit/`

## 8. Dependencies and Config

**Already in use (do not replace)**

- React 19, Vite, TypeScript, Vitest, Testing Library, existing API client
- Backend: Express, Prisma 6, Zod, cookie session, CORS credentials, Node.js 22 LTS, npm, PostgreSQL 16

**New dependencies (explicit decisions)**

- **Q-028 — React Router:** add `react-router` and, if the chosen compatible major still publishes a separate SPA entry, `react-router-dom`. Use the current major that supports React 19 + Vite 7 in SPA/library mode (React Router 7.x as of this plan). Justification: `prompt.md` requires documented client routing; FR-001 forbids view/state switching. Record the exact installed package names and version range in `package.json` during implementation. Do not add a second router.
- **Q-029 — Tailwind + shadcn:** add Tailwind CSS and its Vite integration; `class-variance-authority`; `clsx`; `tailwind-merge`; icons (`lucide-react` unless the current shadcn recipe names a different default); `@radix-ui/react-*` **only** for copied components that need them. shadcn itself is copied source under `frontend/src/components/ui/`, not an all-in-one runtime package. Sidebar/layout primitives MAY be copied if required for Q-032 chrome. Justification: user chose shadcn/ui (“chadcn”); Tailwind is the required companion; sidebar is required chrome. Do not add a second CSS framework. Do not add unused catalog packages.
- Not justified: DnD libraries, extra UI kits, CSS-in-JS, state libraries, generic repository packages, Trello assets, mobile-drawer libraries unless a copied shadcn primitive already includes one and is needed.

**Environment**

- Existing only: `VITE_API_URL`, `CORS_ORIGIN`, `PORT`, `DATABASE_URL`, Postgres user/password/db
- No new public env for routing

**Docker**

- Keep three primary services. Frontend still Vite dev (`--host 0.0.0.0`). History fallback already provided by Vite; do not add a production nginx image (Q-006).

## 9. Security and Failures

- Cookie session unchanged: HTTP-only `devtrack_session`, `credentials: 'include'`, no JS token store
- Guards only change which destination renders; 401/403 still come from the API
- 401 → login destination; 403 on detail → existing forbidden message; sidebar still lists only the caller’s default projects
- Probe HTTP remains authenticated on the backend; product pages MUST NOT call probe APIs
- Validate nothing new on the backend; frontend forms keep current client-side required fields
- Unknown route → not-found, including `/system/probes`; not an information leak about other users’ ids (project ids in URLs are already unguessable only by not listing them; backend still 403/404)
- Sidebar MUST NOT fetch or display another user’s projects; it uses the same owner-only list as today

## 10. Testing

Map to frontend tests (no new backend tests expected; do not rewrite backend probe tests).

| Area | Tests |
| --- | --- |
| Routing | Guest login/register destinations; authenticated projects/detail/profile; root redirects (AC-001, AC-006, AC-016, AC-017) |
| Guards | Guest on protected paths → login; authenticated on guest paths → projects (AC-002, AC-009) |
| History | Direct project URL + back (AC-007); session restore on protected URL (AC-008) |
| Auth flows | Register/login land on projects with sidebar + empty main; logout to login and no sidebar; credentials include; no storage of tokens (AC-003, AC-004, AC-005) |
| Chrome | Top bar, profile, logout, **left sidebar** on product destinations; project name/selection on detail; no probes link (AC-010, AC-020) |
| Guest chrome | No product sidebar on login/register (AC-021) |
| Empty main | `/projects` shows sidebar + select-or-create main, not a stacked full-page list (AC-022) |
| Sidebar nav | Select project → `/projects/:projectId` with existing detail/tasks in main (AC-023) |
| Profile | Profile destination keeps sidebar (AC-024) |
| List rules | Owner-only, excludes archived, same APIs, credentials include; archived URL still unarchives; no `includeArchived` control (AC-025) |
| Create | Create-project available in this chrome; existing fields only (AC-026) |
| Migration | Existing project/task/profile states still covered after navigation-prop changes (AC-011) |
| Probe UI | Absent on every product destination including unknown paths; `ProbePage` gone (AC-012, AC-013, AC-017) |
| Probe backend | Inspect routes/schema/tests unchanged (AC-013, AC-015); do not add SuperTest cases |
| Visual | Assert landmark/header, complementary/sidebar, and card/board structure exist; assert no DnD/column board, no card dragging, and no Trello brand assets (AC-014) |
| Contracts | No backend test changes; inspect schema/routes for AC-015 |
| Quality | `frontend` `npm run typecheck` and `npm test` (AC-018) |
| Deps | `package.json` matches Q-028/Q-029; no full shadcn catalog dump (AC-019) |

Do not skip rewriting `App.test.tsx` tests that currently require probe-on-every-page and no router. Remove or replace `ProbePage.test.tsx` so it no longer requires probe UI. Do not keep tests that require a stacked full-page project list as the authenticated home.

## 11. Sequence

Safe order. Stop at step 2 if artifacts are not Approved. Q-028–Q-032 are already recorded; T002 reconfirms them.

1. Inspect current screens, tests, and client (T001).
2. Confirm approval and reconfirm recorded answers for Q-028–Q-032 (T002).
3. Add React Router foundation and destination map without restyling everything. Do not add a probe route.
4. Session restore and guest/authenticated guards.
5. Chrome: top app bar plus **left project sidebar** on authenticated product destinations; guest chrome without product sidebar; empty/select-or-create main on `/projects`; no probes item.
6. Point existing screens at destinations; put project list in the sidebar; remove stacked `App.tsx` layout and the full-page list that would hide the sidebar.
7. Remove `ProbePage` and probe chrome from the React app; leave backend probe slice untouched.
8. Apply Tailwind + copied shadcn components per Q-029/Q-031/Q-032, including sidebar/layout primitives only if required.
9. Update frontend tests; run typecheck and tests.
10. Independent review; update `memory.md` only from verified state. Record Q-016 as resolved by this feature. Do not mark Kanban, dashboard, members, or audit as implemented. Do not write `005-audit`.

No Prisma generate, migrate, or Docker volume work.

## 12. Risks

- **Implementing beyond T001–T013:** stay inside approved shell scope. Mitigation: T002 reconfirms Q-028–Q-032 and non-goals.
- **Test suite locks old UX:** `App.test.tsx` currently requires no router and probe on every page. Mitigation: rewrite those tests in the same feature; do not keep both models.
- **Stacked full-page list hides sidebar:** migrating `ProjectsPage` unchanged onto `/projects` would violate Q-032. Mitigation: FR-016 / AC-022 / T006 require sidebar + empty main.
- **Kanban pressure from board / Trello-style metaphors:** board styling can slide into columns/DnD/card dragging or a Trello clone. Mitigation: FR-009 / AC-014 / Q-031 / Q-032 forbid columns, DnD, card dragging, and cloned branding.
- **Inventing `includeArchived`:** archived detail URLs might tempt a sidebar filter. Mitigation: FR-015 / AC-025 / Q-021; keep archive/unarchive on detail only.
- **Accidentally deleting the backend probe slice:** Q-030 removes UI only. Mitigation: FR-008 / AC-013 / T007 forbid deleting routes, Prisma `SystemProbe`, `system` domain, health/ready, or backend tests.
- **Re-adding a probe page “to be safe”:** would violate Q-030. Mitigation: no `/system/probes` destination; unknown path is not-found.
- **shadcn catalog bloat:** copying unused components, including unused sidebar variants. Mitigation: FR-012 / AC-019; only screens and chrome already in the shell.
- **Second styling system:** leftover `App.css` plus Tailwind. Mitigation: Tailwind is the CSS approach; retire the unstyled column system.
- **Guard vs authz confusion:** client redirects are not 403. Mitigation: keep existing API error states on detail.
- **Deep links to archived projects:** default sidebar hides them; direct URL must still work for the owner. Mitigation: AC-011, AC-025, and current `getProject`.
- **Extra dependency drift:** undeclared packages violate `prompt.md`. Mitigation: AC-019.
- **Audit ID collision:** memory/Q-027 called later work `005-audit`. Mitigation: this feature occupies `005`; later audit uses a new ID.

Alternatives considered: keep view/state switching (rejected: Q-016); History API without a package (rejected: Q-028 = React Router); vanilla CSS only (rejected: Q-029 = shadcn + Tailwind); relocate probe UI to `/system/probes` (rejected: Q-030); closer Trello clone or Kanban columns (rejected: Q-031); keep a full-page project list as home (rejected: Q-032); add a backend “shell” module (rejected: no new domain); production nginx SPA fallback (rejected: Q-006); require mobile sidebar collapse (rejected: unspecified; persistent desktop is enough).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001, AC-006, AC-016, AC-017 | Destination map + React Router | Frontend routing tests |
| AC-002, AC-009 | Session guards | Guard tests |
| AC-003, AC-004, AC-005, AC-008 | Auth screens + session restore | App/auth tests + credentials |
| AC-007 | History API destinations | History test |
| AC-010, AC-020, AC-021 | Layout chrome + left sidebar | Chrome/sidebar tests |
| AC-011 | Migrated screens | Updated project/task/profile tests |
| AC-012, AC-013, AC-017 | Remove ProbePage; leave backend | Probe absence tests + inspect backend |
| AC-014 | Tailwind + shadcn + Q-031/Q-032 | Landmark/structure tests + review |
| AC-015 | No backend change | Inspect APIs/Prisma |
| AC-018 | Typecheck + Vitest | Executed frontend commands |
| AC-019 | Documented deps only | package.json vs Q-028/Q-029 |
| AC-022 | `/projects` empty/select-or-create main | Empty-main tests |
| AC-023 | Sidebar selection → project detail URL | Sidebar navigation tests |
| AC-024 | Profile keeps sidebar | Profile chrome tests |
| AC-025 | Default list rules; archived URL | Sidebar list + archived-detail tests |
| AC-026 | Create-project in chrome | Create-project tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes — Q-028–Q-032 recorded; remaining risks are implementation/process
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Non-blocking: sidebar list refetch is pathname-keyed (`AuthenticatedLayout.tsx`), so an archived project can remain in the sidebar until navigation.
- Verified: Yes; coordinator re-ran frontend typecheck (exit 0) and `npm test` (11 files / 92 tests passed, Node 22.13.0); live browser pass recorded in `spec.md` / `tasks.md`; no migrations; Kanban, dashboard, members, and audit remain unimplemented
