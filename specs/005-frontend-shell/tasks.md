# Tasks: Frontend Shell

- **Feature ID:** 005-frontend-shell
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks, and only after an explicit request to implement. Checklist items are not started. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

Feature artifacts are **Verified**. Q-016 is resolved at product level. Q-028, Q-029, Q-030, Q-031, and Q-032 are recorded decisions. Do not add backend/API/schema work. Do not invent Kanban columns, drag-and-drop, card dragging, dashboard aggregates, `project-members`, an `includeArchived` sidebar filter, required mobile sidebar collapse, or `005-audit`. Do not create `specs/005-audit/`. Do not mark Q-006, Q-007, Q-009, Q-015, or Q-017 as done. Later audit MUST NOT use ID `005`.

Backend phase omitted: this feature is frontend-only.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect the current frontend: `App.tsx` view/state switching (`guestView`, `selectedProjectId`, stacked profile + list/detail + global `ProbePage`), existing screens under `auth/`, `users/`, `projects/` (including `ProjectsPage` owner-only list that default-excludes archived), `tasks/`, `system/`, `api/client.ts` (`credentials: 'include'`), `App.css`, Vite config/Dockerfile history fallback, and tests that currently require no router and probe-on-every-page. Record what must be extended rather than replaced, including that the project list must move into authenticated left-sidebar chrome rather than remain a stacked full-page home. Do not change backend modules, Prisma, or Compose.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved. Reconfirm recorded answers: Q-028 React Router (SPA/library mode, version compatible with React 19 + Vite 7; real URLs, not `App.tsx` view/state switching); Q-029 Tailwind CSS + copied shadcn/ui and documented peers (no second CSS framework, no full catalog; sidebar/layout primitives allowed if required); Q-030 no product-UI probe destination — remove `ProbePage`/probe chrome, keep backend health/ready/`system`/probe HTTP/Prisma/tests; Q-031 layout metaphors only and original DevTrack identity (not a Trello clone; no trademarks/Kanban/DnD/card dragging); Q-032 authenticated left sidebar of the caller’s projects always visible on product destinations, empty/select-or-create main when none selected, guest login/register have no product sidebar, same verified list APIs/rules, create-project in this chrome, profile keeps sidebar, archived detail URL keeps archive/unarchive, no `includeArchived` filter, persistent desktop sidebar enough (mobile collapse not required). Reconfirm Q-016 product decision. Reconfirm no API/DTO/schema/migration changes, no new domain, no generic repository, no microservices, HTTP-only `devtrack_session` unchanged, `credentials: 'include'`, no bearer token in JS, guest root → register, logout → login, post-auth → projects destination, nested task detail MAY stay inside project detail, later audit MUST NOT use ID `005`. Stop if artifacts are not Approved.

### Phase 2 — Frontend

- [x] T003 Add client routing with React Router (Q-028) as the navigation model. Define destinations for login, register, projects (no selection), project detail, profile, app root redirects (guest → register, authenticated → projects), and unknown-path not-found. Do not keep `guestView` / `selectedProjectId` as the navigation model. Do not add a probe destination. Do not restyle yet. Do not remove `ProbePage` yet (T007).
- [x] T004 Implement session restore (`GET /api/users/me` with `credentials: 'include'`) and guest vs authenticated guards: guests opening authenticated destinations go to login; authenticated users opening login/register go to the projects destination; loading and non-auth session errors remain visible; 401 on a protected screen sends the user to login. Do not treat guards as backend authorization.
- [x] T005 Implement app chrome: persistent top app bar (application name, profile, logout via `LogoutButton` / `POST /api/auth/logout`) and a left sidebar whose primary content is the caller’s project list, always visible on authenticated product destinations (projects, project detail, profile). Guest chrome offers login and register only and MUST NOT include a product sidebar. On project detail, show the loaded project name as context and mark that project as selected in the sidebar when it appears in the list. Create-project MUST be available in this chrome (sidebar and/or an obvious control) using existing APIs/fields. Do not put probe UI or a probes nav item in chrome. Do not store session ids or bearer tokens in `localStorage` or `sessionStorage`. Do not require a mobile-only collapse. Do not add Kanban columns, drag-and-drop, or an `includeArchived` filter.
- [x] T006 Migrate existing login, register, project detail (with tasks), and profile screens onto the destinations. Put the verified project list in the sidebar (reuse/extract `ProjectsPage` list/create rules: owner-only, default excludes archived, same `GET/POST /api/projects`, `credentials: 'include'`). Selecting a project MUST navigate to the existing project-detail URL. The projects destination MUST keep the sidebar visible and use an empty/select-or-create main area — not a second stacked full-page list that hides the sidebar. Profile MUST keep the sidebar. Preserve verified loading/empty/success/error/unauthenticated/forbidden/archived-parent conflict states and existing API client usage. Archive remains on the project detail destination (including archived URLs whose project may be absent from the sidebar). Nested selected-task state MAY stay inside project detail. Remove stacked profile + list/detail from `App.tsx`.
- [x] T007 Remove `ProbePage` and probe chrome from the React app so they do not render on any product destination (login, register, projects, project detail, profile, root, not-found, chrome). Guests and authenticated users MUST NOT see probe create/list UI. Do not add `/system/probes` or any other probe product destination. Do not delete backend probe routes, Prisma `SystemProbe`, the `system` domain, `GET /health`, `GET /ready`, or backend probe HTTP tests. Typed frontend probe helpers MAY remain unused; they MUST NOT be wired to UI.
- [x] T008 Apply Tailwind CSS plus copied shadcn/ui components (Q-029) using layout metaphors and original DevTrack identity (Q-031 / Q-032): persistent top app bar, persistent left project sidebar on authenticated product destinations, card-like surfaces, board-like project detail hosting tasks. Copy only components needed to restyle existing shell screens (auth, projects, tasks, chrome), plus sidebar/layout primitives if required for this chrome. Add documented peers only (`class-variance-authority`, `clsx`, `tailwind-merge`, icons, Radix only as required). Do not add Kanban status columns, drag-and-drop, or card dragging. Do not copy Trello trademarks, logos, or assets. Do not add a second CSS framework. Do not import the entire shadcn catalog. Do not invent a required mobile collapse.

### Phase 3 — Verification

- [x] T009 Update and add frontend tests for destinations, history/back, guards, chrome (top bar, **left sidebar** on authenticated product destinations, project context/selection, no probes link), guest destinations with **no** product sidebar, `/projects` empty/select-or-create main (not a stacked full-page list), sidebar selection navigating to the project-detail URL, profile keeping the sidebar, sidebar list reusing owner-only default-excludes-archived APIs with `credentials: 'include'` and no `includeArchived` control, create-project available in this chrome, archived detail URL still offering archive/unarchive, probe UI absent on every product destination (including unknown paths), register/login landing on projects, logout to login, and no token storage. Rewrite tests that currently require view/state switching, a stacked full-page list as home, or probe-on-every-page. Remove or replace `ProbePage.test.tsx`. Keep coverage of migrated screen states.
- [x] T010 Run `frontend` `npm run typecheck` and `npm test`. Report actual results. Do not run backend tests as evidence of this feature unless a regression is suspected. Do not run `prisma migrate reset` or delete Docker volumes. Do not claim checks passed without running them.
- [x] T011 Verify acceptance criteria AC-001–AC-026 against the spec (routing, chrome/sidebar, empty main, migrated behavior, probe UI removed with backend probe slice unchanged, layout metaphors without Kanban/DnD/card dragging/Trello clone, no API/schema change, documented dependencies). Record any unmet criterion.
- [x] T012 Obtain independent review and resolve blocking findings. Do not treat implementer claims as proof.
- [x] T013 Update `memory.md` (and only docs that changed) from verified state. Record Q-016 as resolved by `005-frontend-shell`. Record answered Q-028–Q-032. Keep Q-006, Q-007, Q-009, Q-015, and Q-017 deferred. Keep Kanban, dashboard, collaboration, and audit marked unimplemented. Do not write `005-audit` artifacts. Do not mark tasks complete without evidence.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes in the completion report |
| T002 | T001 | Artifacts Approved; Q-028–Q-032 recorded |
| T003 | T002 | Destinations exist; view flags are not the navigation model; no probe route |
| T004 | T003 | Guard tests |
| T005 | T004 | Chrome/sidebar tests (AC-010, AC-020, AC-021) |
| T006 | T005 | Migrated screen tests; empty main; sidebar selection; profile keeps sidebar |
| T007 | T006 | Probe UI absent; backend probe slice still present |
| T008 | T007 | Visual-language structure including left sidebar; no DnD/columns; deps match Q-029 |
| T009 | T008 | Frontend tests updated and failing cases from old UX removed |
| T010 | T009 | Executed typecheck and test commands |
| T011 | T010 | AC-001–AC-026 evidence |
| T012 | T011 | Reviewer verdict |
| T013 | T012 | `memory.md` matches verified repo |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001, AC-006, AC-016, AC-017 | T003, T009 | Frontend routing tests |
| AC-002, AC-009 | T004, T009 | Guard tests |
| AC-003, AC-004, AC-005, AC-008 | T004, T006, T009 | Auth/session tests + credentials |
| AC-007 | T003, T009 | History/direct-URL tests |
| AC-010, AC-020, AC-021 | T005, T009 | Chrome/sidebar tests |
| AC-011 | T006, T009 | Updated project/task/profile tests |
| AC-012, AC-013, AC-017 | T007, T009, T011 | Probe absence tests; inspect backend probe slice |
| AC-014 | T008, T009, T011 | Structure tests + visual review |
| AC-015 | T001, T011 | Inspect APIs/Prisma (unchanged) |
| AC-018 | T010 | Executed frontend typecheck and tests |
| AC-019 | T002, T008, T011 | package.json vs Q-028/Q-029 |
| AC-022 | T005, T006, T009 | Empty/select-or-create main tests |
| AC-023, AC-026 | T005, T006, T009 | Sidebar navigation and create-project tests |
| AC-024 | T005, T006, T009 | Profile-with-sidebar tests |
| AC-025 | T006, T009 | Sidebar list-rules and archived-detail tests |

## Completion report

- Completed tasks: T001–T013
- Tests executed (implementer T010, Node 22.13.0): `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 11 files / 92 tests passed, exit 0. Coordinator independently re-ran the same commands (Node 22.13.0): typecheck exit 0; 11 files / 92 tests passed. No backend tests re-run as evidence of this frontend-only feature. No `prisma migrate reset`. No volume delete. No migrations.
- AC-001–AC-026: all met from frontend tests, inspection, independent review, and coordinator live browser pass (no backend/API/schema/migration changes; `ProbePage` gone; `system` probe HTTP/Prisma/tests remain; Tailwind + copied shadcn primitives only: button, input, label, card, textarea; no Kanban/DnD/Trello assets)
- Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): guest `/` → `/register`, no sidebar; register → `/projects` with left sidebar + empty/select-or-create main; create project in sidebar; select project → `/projects/:id` with tasks list not columns; profile keeps sidebar; logout → `/login` no sidebar; guest `/projects` → `/login`; `/system/probes` → not-found, no probe UI. No drag-and-drop.
- Known issues: sidebar list refetch is pathname-keyed (`AuthenticatedLayout.tsx` `reloadKey={location.pathname}`), so an archived project can remain in the sidebar until navigation (non-blocking; not a failed AC). Q-006, Q-007, Q-009, Q-015, Q-017 remain deferred. Kanban, dashboard, collaboration, and audit remain unimplemented. Later audit MUST NOT use ID `005`. `specs/005-audit/` was not created.
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Non-blocking finding is the pathname-keyed sidebar refetch noted above; recorded as known issue, not treated as a blocker.
- Memory updated: yes (T013)
- Remaining work: none for `005-frontend-shell`. Next product work is not specified (proposed: Kanban, dashboard, collaboration, audit with a later feature ID, not `005`).
