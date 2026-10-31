# Implementation Plan: Workspace UI

- **Feature ID:** 007-workspace-ui
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified** (original T001–T013 plus polish T014–T026). Amend this folder in place. Do not write `specs/008-*` or `specs/005-audit/` for this polish. Later audit MUST use a different feature ID than `005` and MUST NOT be this folder.

The original 007 pass (T001–T013) is in the repo. This plan describes the **polish batch** on that baseline. Q-036, Q-038, Q-039, and Q-040 remain. Original FR-006 / Q-037 “remove Back to projects” is **superseded**. Q-041–Q-044 are **Decided**. Q-006, Q-007, Q-009, Q-015, and Q-017 stay deferred. Dashboard, collaboration, and audit remain unimplemented.

## 1. Summary

Keep the verified 007 workspace (card grid, compact sidebar, Dialogs, remaining-height board) and add a presentation polish batch:

- Restore **Back to projects** in the compact project-detail header action row next to Edit/Archive; keep DevTrack → `/projects`.
- Constrain `/projects` cards to about **14–18rem**, left-aligned, not full-main stretch (still name-derived covers).
- Reduce Kanban column width to about **16–20rem**, left-aligned row of three, so they do not stretch the full main area.
- Task-card pointer cursor and `@dnd-kit/core` `DragOverlay` / transform animation. Keep Q-034. Do not add `@dnd-kit/sortable` (Q-043).
- User-selectable whole-UI palettes from the Q-041 catalog (Forest default, Ocean, Sunset, Violet, Midnight, Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier), persisted in localStorage only under `devtrack.uiPalette`. Selector on the authenticated top bar. Apply on document root. Guests apply stored palette or Forest. Do not clear on logout. No profile API, schema, or migration.

This remains frontend presentation. Reuse existing destinations, `frontend/src/api/client.ts` (`credentials: 'include'`), owner-only list rules, archive/unarchive, task create/list/update/soft-delete, and status-only `@dnd-kit/core` DnD. Do not change backend routes, DTOs, Prisma, or domains.

## 2. Current State

Inspected 2026-10-31. `001-foundation` through `006-kanban` are Verified. Original 007 T001–T013 are in the repo (not this polish).

Present and in use after the original 007 pass:

- Destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`; guest root → register; authenticated root → projects; unknown (including `/system/probes`) → not-found
- `frontend/src/layout/AuthenticatedLayout.tsx`: `h-svh overflow-hidden`; top app bar (`DevTrack` is a `Link` to `/projects`, plus profile and logout); compact left sidebar; main `<Outlet />`
- `frontend/src/layout/GuestLayout.tsx`: guest bar + login/register; no product sidebar; uses `bg-background` tokens
- `frontend/src/routes/ProjectsHome.tsx`: card grid `sm:grid-cols-2 xl:grid-cols-3` (cards stretch too wide)
- `frontend/src/projects/ProjectCard.tsx`: name-derived cover + name; `Link` (pointer by default)
- `frontend/src/projects/ProjectsPage.tsx`: compact names + create Dialog
- `frontend/src/projects/ProjectDetail.tsx`: compact header with **Edit project** and **Archive project** only; **no Back to projects**
- `frontend/src/tasks/TasksPanel.tsx`: compact filters, header `+` Dialog, column `+`, task-detail Dialog, remaining-height board
- `frontend/src/tasks/KanbanBoard.tsx`: `grid-cols-3` full-width stretch; `min-w-48` columns; cards use `opacity-50` while dragging; **no** `DragOverlay`; **no** `cursor-pointer`; `@dnd-kit/core` only
- Copied shadcn: `button`, `input`, `label`, `card`, `textarea`, `dialog`. Peers include `@radix-ui/react-dialog`
- `frontend/src/index.css`: single `:root` token set (Forest-like DevTrack colors). No palette catalog, no `data-palette`
- Tests assert `queryByRole("button", { name: /back to projects/i })` is absent (`App.test.tsx`, `ProjectDetail.test.tsx`)
- Many tests assert `window.localStorage.length === 0` as a no-session-token proxy
- Prisma `Project` / `Task`: no cover color, no image, no rank/position, no palette field
- Backend `tasks` PATCH `{ status }` and archived `409` remain the DnD/write contract
- `@dnd-kit/sortable` is absent from `frontend/package.json`

Absent (this polish adds as UI only):

- Back to projects in the board header action row
- Constrained compact project-card grid
- Compact (non-stretching) Kanban column width
- Task-card pointer cursor and DragOverlay / transform animation
- Whole-UI palette catalog, selector, document-root application, localStorage persistence, guest fallback

Limitations to respect:

- Do not change cookie auth, CORS, or product API contracts
- Do not add `coverColor`, image storage, rank, dashboard counts, members, audit, or a User palette field
- Do not add `@dnd-kit/sortable` (Q-043); do not add a second DnD/CSS framework or `next-themes`
- Do not reset the database or delete `pgdata`
- Rewrite tests that lock “no Back to projects” or empty localStorage as a session-token proxy
- Q-041–Q-044 decided: catalog Forest (default), Ocean, Sunset, Violet, Midnight, Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier; authenticated bar selector; apply on document root; guests stored-or-Forest; key `devtrack.uiPalette`; do not clear on logout; DragOverlay not sortable; ~14–18rem cards and ~16–20rem columns, left-aligned
- Project-cover hash palette in `projectCover.ts` stays name-derived and separate from whole-UI palettes

## 3. Domain Boundaries

- Owning domain: **none new**. This is frontend presentation. Do not create a `workspace`, `theme`, or `shell` backend module or a generic repository.
- Other domains (unchanged, HTTP only):
  - `auth` — session cookie, register/login/logout
  - `users` — own profile (no palette field)
  - `projects` — owner-only projects, archive/unarchive; default list excludes archived
  - `tasks` — project-scoped tasks, status, soft-delete; board column = persisted `status`
  - `system` — probes/health/ready remain on the backend; unused as product chrome
- Invariants: no new backend invariants. Derived covers and UI palettes are not data. Frontend MUST NOT treat Dialogs, palettes, or route guards as authorization. Sidebar and grid MUST NOT broaden visibility beyond the owner-only default list.
- Cross-domain interfaces: none new. Existing `ProjectAccessPort` stays inside the backend unused by this frontend-only feature.
- Dependency direction: `frontend/` → HTTP → existing Express routes. Frontend MUST NOT import Prisma, backend modules, or `DATABASE_URL`. Palette code MUST NOT import the API client except incidentally if a chrome component already does.
- Controller, service, repository, DTOs, routes, validators, domain objects: **no backend file changes**. Do not add empty product domain folders (`project-members`, audit, workspace-backend).

T016 confirms no API/schema gap rather than scaffolding unused layers.

## 4. API Contract

No endpoint is added, removed, or changed.

Existing contracts remain as verified in `002-authentication`, `003-projects`, and `004-tasks`. Board moves still reuse `PATCH /api/tasks/:id` `{ status }`.

| Method and path | Auth | Use in this feature |
| --- | --- | --- |
| `POST /api/auth/register` | public | register destination (unchanged) |
| `POST /api/auth/login` | public | login destination (unchanged) |
| `POST /api/auth/logout` | session | chrome logout (unchanged; MUST NOT clear palette localStorage) |
| `GET /api/users/me` | session | session restore (unchanged) |
| `PATCH /api/users/me` | session | profile (unchanged; **no** palette field) |
| `GET /api/projects` | session, owner list | sidebar + `/projects` grid |
| `POST /api/projects` | session | create-project **modal** (`name`, optional `description`) |
| `GET /api/projects/:id` | session, owner | project-detail header |
| `PATCH /api/projects/:id` | session, owner | edit **modal** |
| archive / unarchive existing paths | session, owner | board chrome actions |
| `GET /api/projects/:projectId/tasks` | session, owner | board cards; optional `status`/`priority` query |
| `POST /api/projects/:projectId/tasks` | session, owner | add-task **modal**; column `+` includes that `status` |
| `GET /api/tasks/:id` | session, owner | task-detail **modal** |
| `PATCH /api/tasks/:id` | session, owner | detail update and DnD `{ status }` |
| `DELETE /api/tasks/:id` | session, owner | soft-delete from detail modal |

Error envelope unchanged: `{ error: { code, message } }` plus HTTP status (`401`, `403`, `404`, `409` archived writes, `400` validation).

Do not add `coverColor`, image URL, `includeArchived`, move endpoint, rank, or palette/theme fields.

## 5. Persistence

- Prisma model changes: **none**
- Relationships, constraints, indexes: unchanged
- Migration implications: **no migration**. Do not create, apply, or reset migrations for covers, rank, or palettes
- Repository contracts: unchanged
- Transactions: unchanged
- Compatibility risks: none if frontend-only. Inventing a `coverColor` or User palette column would violate the spec
- Browser storage: one dedicated localStorage key for the palette catalog id: `devtrack.uiPalette` (Q-042). Not a Prisma concern. Do not use `sessionStorage` for the palette. Do not store session material there. Do not clear this key on logout.

Do not expose Prisma models as domain entities or API DTOs (already true; do not start).

## 6. Frontend

Pages and chrome (keep destinations):

- `AuthenticatedLayout` — keep top bar (app name → `/projects`) and left sidebar. Add the palette selector here (Q-042). Main still `<Outlet />`.
- `GuestLayout` — no product sidebar. Apply the same document-root palette (stored or Forest) so login/register stay coherent. Guest selector is not required.
- `ProjectsHome` — keep the card grid and empty state. Replace stretching `sm:grid-cols-2 xl:grid-cols-3` with a constrained auto-fill / max-width grid of about **14–18rem**, left-aligned (Q-044).
- `ProjectCard` — keep name-derived cover. MAY add explicit `cursor-pointer` for parity with task cards.
- `ProjectsPage` — unchanged compact names + create Dialog unless a shared list refresh is already in place.
- `ProjectDetail` — add **Back to projects** in the compact header action row next to Edit/Archive (or Unarchive). Prefer a React Router `Link` to `/projects` with accessible name `Back to projects`. Keep DevTrack → `/projects`. Keep edit Dialog and archive actions.
- `TasksPanel` — unchanged Dialogs/filters except as needed to host the narrower board.
- `KanbanBoard` / column — compact column max-width about **16–20rem**; left-aligned row of three; remaining-height scroll inside the column; stop full-main `grid-cols-3` stretch (Q-044).
- `KanbanCard` — `cursor-pointer`; keep title, priority, optional due date; keep Q-034 drop rules.
- DnD — keep `DndContext`, sensors, `resolveKanbanDrop`. Add `DragOverlay` (and/or apply `transform` from `useDraggable`) so a floating card follows the pointer. Hide or fade the source while the overlay is shown. Do not add `@dnd-kit/sortable` (Q-043). Keyboard Space+Arrow path MUST still move status.
- `TaskDetail` — unchanged fields; still in Dialog.

Whole-UI palettes (frontend-only):

- Documented catalog module (for example `frontend/src/theme/uiPalettes.ts`) listing Q-041 ids and labels: Forest (default), Ocean, Sunset, Violet, Midnight, Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier.
- Apply via `data-palette` (or equivalent) on `document.documentElement` so both layouts inherit.
- Map each palette onto existing CSS variables in `index.css` (`--background`, `--foreground`, `--card`, `--primary`, `--sidebar`, `--board`, `--devtrack-bar`, and optional `--*-image` gradient tokens for large surfaces).
- Gradient palettes MUST keep readable contrast on bar/sidebar/board text. Aurora, Ember, and Lagoon may keep the original suggested stops (teal→violet, amber→rose, cyan→green). Twilight, Citrus, Magma, and Glacier MUST map to distinct CSS gradients with readable contrast; exact stops are implementation, not a remaining product question.
- Read/write only the catalog id in localStorage under `devtrack.uiPalette`. Invalid/missing → Forest. Do not PATCH profile. Do not clear on logout.
- Accessible selector on the authenticated top app bar (`aria-label` such as `Color palette`). Native `<select>` or buttons. Do not add DropdownMenu. Guest-bar selector is not required.

Cover helper: unchanged Q-039. Do not reuse project-cover swatches as the whole-UI catalog.

State:

- Selected task remains in-destination state (`selectedTaskId`).
- Palette id is React state mirrored to localStorage; not session context.
- Loading, empty, success, validation/error, unauthenticated, forbidden, archived-conflict states stay.

Do not store session material in `localStorage` / `sessionStorage`. Palette id is the only allowed product localStorage key from this feature.

## 7. Files

Expected files (implementation may split slightly; do not add a `specs/` implementation tree):

| File | Responsibility |
| --- | --- |
| `frontend/src/projects/ProjectDetail.tsx` | Restore Back to projects in the header action row |
| `frontend/src/routes/ProjectsHome.tsx` | Constrain card grid to ~14–18rem, left-aligned |
| `frontend/src/projects/ProjectCard.tsx` | Keep covers; optional explicit pointer cursor |
| `frontend/src/tasks/KanbanBoard.tsx` | Compact ~16–20rem columns; DragOverlay / transform; pointer cursor on cards |
| `frontend/src/layout/AuthenticatedLayout.tsx` | Palette selector on authenticated top bar (Q-042); keep DevTrack → `/projects` |
| `frontend/src/layout/GuestLayout.tsx` | Inherit document palette; still no product sidebar |
| `frontend/src/theme/uiPalettes.ts` (or equivalent) | Q-041 catalog ids, labels, Forest default, `devtrack.uiPalette` read/write |
| `frontend/src/theme/UiPaletteProvider.tsx` (or equivalent) | Apply `data-palette` on the document root |
| `frontend/src/index.css` | Per-palette CSS variables and optional gradients |
| `frontend/src/App.tsx` / `main.tsx` | Mount palette provider above routes |
| `frontend/src/frontend-deps.test.ts` | Still forbid extra CSS/DnD frameworks and `@dnd-kit/sortable` |
| `frontend/src/App.test.tsx`, `ProjectDetail.test.tsx`, other page tests | Restore Back asserts; allow palette key; still forbid session tokens |

Backend files: **no changes**.

Do not add `@dnd-kit/sortable` to `frontend/package.json` (Q-043).

## 8. Dependencies and Config

| Change | Justification |
| --- | --- |
| None expected | `DragOverlay` ships in existing `@dnd-kit/core`. Palettes are CSS tokens + a small frontend module. |

No new env vars. No Docker/Compose changes. No Prisma/config changes.

Do not add: `@dnd-kit/sortable`, second DnD library, second CSS framework, `next-themes`, image-upload SDK, full shadcn catalog, DropdownMenu (not required).

## 9. Security and Failures

- Keep `credentials: 'include'` on every product `fetch`.
- Modals MUST still call owner-only APIs; hiding a form is not authorization.
- Archived parent: disable header/column `+` and edit writes; archive chrome still offers unarchive; Back still works; DnD stays disabled/non-durable as in 006.
- Failed create/update/move: existing user-visible error/conflict; do not keep a false success state.
- 401: existing `onUnauthenticated` → login. Palette localStorage MAY remain.
- Dialog dismiss must not persist partial edits.
- Corrupt palette storage: default Forest; do not crash.
- Do not log or display secrets, hashes, or stack traces.

## 10. Testing

Map to frontend tests (backend only if T016 finds a real gap — expected: none):

| Area | Tests |
| --- | --- |
| `/projects` grid | Cards for listed projects; empty state; compact constrained grid (AC-021); click navigates; `credentials: 'include'`; archived omitted |
| Covers | Initials from name; no `coverColor` in client DTOs |
| Sidebar | Compact names; no always-visible create form; `+` opens Dialog; create POST; list refresh |
| Board header | Name + short description; **Back to projects present** next to Edit/Archive; DevTrack still goes to `/projects`; Back navigates to `/projects`; edit modal PATCH; archive/unarchive from chrome |
| Filters | Compact controls above board; existing query params |
| Add-task | No always-visible form; header `+` create; column `+` pre-fills status; archived cannot create |
| Task detail | Dialog; columns still in document; close; PATCH/DELETE; status select remains |
| Cards | Title, priority, optional due date; pointer cursor |
| Columns | Remaining height kept; compact width (classes / max-width), not full-main thirds |
| DnD | Existing Kanban tests still pass; overlay present while dragging (or transform applied); no sortable package |
| Palettes | Catalog is the Q-041 set; selecting one from the authenticated bar updates tokens and writes `devtrack.uiPalette`; reload keeps it; logout does not clear it; invalid/missing → Forest; guest pages coherent; no profile PATCH |
| Storage | Session tokens still absent; palette key allowed; rewrite `localStorage.length === 0` helpers |
| Deps | Dialog allowed; no second CSS framework; `@dnd-kit/core` only; no `@dnd-kit/sortable` |
| Chrome/guest | Sidebar on product destinations; guest has none; profile keeps compact sidebar; no probe UI |

Prefer Testing Library roles/names. Back control: role `link` or `button` with name `/back to projects/i`. Palette selector: stable accessible name.

## 11. Sequence

1. T014 inspect polish surfaces (read-only) and T015 wait for explicit approval of this Draft.
2. T016 confirm no backend/API/schema/profile change (read-only unless a real gap — do not invent one).
3. Restore Back to projects; rewrite tests that forbid it.
4. Constrain project-card grid.
5. Narrow Kanban columns; keep remaining height.
6. Task pointer cursor + DragOverlay / transform; keep Q-034; do not add `@dnd-kit/sortable` (Q-043).
7. Palette catalog (Q-041) + CSS tokens + document-root apply + `devtrack.uiPalette` + authenticated top-bar selector + guest stored-or-Forest.
8. Tests, typecheck, AC walkthrough, independent review, memory.

Do not start implementation while artifacts are Draft. Do not add DnD libraries. Do not migrate. T026 marks polish Verified only with T023–T025 evidence.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Tests lock “no Back to projects” | Rewrite in T017/T022; AC-006 now requires the control |
| `localStorage.length === 0` fails after palette persist | Replace with “no session material; palette key allowed” |
| Palette catalog bikeshedding | Q-041 catalog is decided (12 named palettes, extra gradients included) |
| Gradient contrast | Keep text/card tokens solid enough to read; test Forest + at least one gradient |
| DragOverlay vs Dialog focus | Overlay lives on the board DndContext; do not make Dialog content draggable |
| Adding sortable “to make animation work” | Q-043 decided: do not add sortable; DragOverlay is the path |
| Accidental schema “help” for palettes or covers | Spec/plan forbid User palette, `coverColor`, and migrations |
| Opening `specs/008-*` | This folder is `007-workspace-ui`; amend in place |
| Audit ID collision | Never `specs/005-audit/` |

Alternatives considered and rejected: persisted `coverColor`; profile theme field; `next-themes`; `@dnd-kit/sortable` for overlay animation; keeping full-width `grid-cols-3`; keeping “no Back to projects”.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001, AC-002, AC-003 | `ProjectsHome` card grid | Frontend grid/navigation tests |
| AC-004 | `projectCover` + card | Cover tests; inspect DTOs/Prisma |
| AC-005 | Compact `ProjectsPage` + Dialog | Sidebar/create-modal tests |
| AC-006, AC-007, AC-008, AC-020 | Compact `ProjectDetail` header + Back link | Board-header / Back tests |
| AC-009, AC-010 | `TasksPanel` + `KanbanBoard` layout | Filter/layout tests |
| AC-011, AC-012 | Create-task Dialog + column `+` | Create-task tests |
| AC-013 | `TaskDetail` in Dialog | Detail-modal tests |
| AC-014, AC-025 | Kanban card metadata + cursor | Card tests |
| AC-015, AC-019 | No backend change; keep DnD/client | Inspect + existing DnD/auth tests |
| AC-016, AC-023 | Guest layouts + palette default | Guest/profile + palette tests |
| AC-017 | Dialog copy + deps test | `frontend-deps.test.ts` |
| AC-018 | Executed typecheck/tests | T023 report |
| AC-021 | Constrained `ProjectsHome` grid | Compact-card tests |
| AC-022 | Palette catalog + localStorage | Palette tests |
| AC-024 | Compact `KanbanBoard` columns | Column-width tests |
| AC-026 | `DragOverlay` / transform | Overlay + existing drop tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes — Q-041–Q-044 decided
- Approved for task breakdown: Yes
- Approved for implementation: Yes (polish T014–T026)
- Independent review: Original 007 pass PASS WITH NON-BLOCKING FINDINGS. Polish T025 PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Informational: live contrast not audited in review; AC-018 not re-executed by reviewer. Low: some project-cover slots retint with the theme tokens (still name-derived, no stored coverColor).
- Verified: Yes; coordinator re-ran frontend typecheck (exit 0) and `npm test` (16 files / 133 tests passed, Node 22.13.0); live browser pass recorded in `spec.md` / `tasks.md`; no migrations; FR-006 / Q-037 Back supersession and Q-041–Q-044 decided; dashboard, members, and audit remain unimplemented
