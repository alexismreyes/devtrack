# Feature Specification: Workspace UI

- **ID:** 007-workspace-ui
- **Status:** Verified
- **Created:** 2026-10-31
- **Reopened:** 2026-10-31 (polish batch; amend in place — do not create `specs/008-*`)
- **Related features:** 001-foundation (Verified), 002-authentication (Verified), 003-projects (Verified), 004-tasks (Verified), 005-frontend-shell (Verified), 006-kanban (Verified)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified** (original T001–T013 plus polish T014–T026). This ID remains **007-workspace-ui**. `specs/008-*` was not created for this polish. Later audit MUST NOT use feature ID `005` and MUST NOT be written as `specs/005-audit/`. Q-006, Q-007, Q-009, Q-015, and Q-017 stay deferred. Dashboard, collaboration, and audit remain unimplemented. Do not invent schema or API fields.

The original 007 pass (T001–T013) remains historically recorded. The polish batch (T014–T026) is verified with T023–T025 evidence.

Q-036, Q-038, Q-039, and Q-040 remain in force except where this polish **supersedes** them. The original FR-006 / Q-037 clause **“remove Back to projects” is superseded**: an explicit Back to projects control is on the project-detail board header action row, and the DevTrack application-name link still goes to `/projects`. Q-041–Q-044 are **Decided** for this polish.

## 1. Problem

Verified `005-frontend-shell` and `006-kanban` already give users routed destinations, cookie auth, owner-only projects, a left project sidebar, and a status-column board with `@dnd-kit/core` status-only drag-and-drop. The original 007 pass replaced the empty `/projects` main, always-visible forms, and crowded board chrome with a project-card grid, compact sidebar, Dialogs, and remaining-height columns.

That original 007 presentation still has polish gaps: the compact board header has no explicit Back to projects control (users must use the app name); `/projects` cards stretch too wide; Kanban status columns stretch across the whole main area; task cards lack a pointer hover and a proper drag overlay; the whole UI has a single baked-in color scheme with no user-selectable palettes (including gradients).

Users need those presentation fixes on the **same** verified capabilities — without new domains, APIs, cover-image storage, dashboard counts, members, audit, rank, a profile field for theme, or a new feature folder.

## 2. Goals

- Use the `/projects` main area for a grid of the caller’s listed (non-archived) projects as visual cards, instead of an empty select-or-create placeholder.
- Derive each project card’s visual cover from the project name (color + initials). No image upload, no `coverColor` field, no migration.
- Constrain the `/projects` grid so cards are **narrower, Trello-like card size** of about **14–18rem** (still a grid, still name-derived covers, left-aligned). Cards MUST NOT stretch to fill large fractions of the main area.
- Make the left sidebar compact project names plus a control to create a project. Create-project is a modal, not a permanent sidebar form.
- On `/projects/:projectId`, hide the always-visible project update form. Open it as a modal when the owner chooses to edit. Keep archive/unarchive available from compact board chrome (actions), not a huge always-on form.
- Restore an explicit **Back to projects** control in the compact project-detail header action row, next to **Edit project** and **Archive project** (or Unarchive). Keep the DevTrack application-name link to `/projects`. This **supersedes** the original 007 “remove Back to projects” rule.
- Hide the always-visible add-task form. A `+` opens a create-task modal from the board header **and** from the bottom of each column. Column `+` pre-fills that column’s `status`.
- Open task detail as a modal so the board stays visible behind it. Nested task-detail URLs remain not required.
- Make Kanban columns the primary focus of project detail (full remaining main height). This is presentation, not dashboard aggregates.
- Reduce Kanban status **column width** to about **16–20rem**, left-aligned, so the three columns do not stretch across the whole main area.
- Compact filter controls above the board, not a large form block.
- Task cards show title plus existing priority and optional due date (no new fields). Task cards MUST use a pointer/hand hover cursor like project cards. Drag-and-drop MUST use a proper overlay/transform animation via `@dnd-kit/core` `DragOverlay` / transform, without `@dnd-kit/sortable`. Keep Q-034 status-only moves.
- Offer user-selectable **whole-UI color palettes** from the Q-041 catalog (solids Forest default, Ocean, Sunset, Violet, Midnight; gradients Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier). Persist the palette id in **localStorage only** under `devtrack.uiPalette`. No profile API, no schema, no migration. Guest pages MUST still look coherent (apply the stored palette or Forest). Do not clear on logout.
- Keep 005 destinations, cookie auth, owner-only rules, archived `409`, soft-delete, Q-034 status-only DnD, and `@dnd-kit/core` only. Do not add `@dnd-kit/sortable` (Q-043).

## 3. Non-Goals

- New destinations, nested task-detail URLs, or changing guest login/register, authenticated root → projects, profile, or not-found routing.
- Removing the left project sidebar from authenticated product destinations, or requiring a mobile sidebar collapse/drawer.
- Image upload, cover-image storage, a persisted `coverColor` (or equivalent) field, or any Prisma migration.
- Persisting UI palette on the user profile, in a cookie, or in the database.
- New project or task fields, statuses, priorities, assignees, comments, labels, attachments, members, or audit events.
- Dashboard aggregates (pending, completed, overdue counts). This board-height work is not that feature.
- Collaboration, membership, invitations, or `project-members`.
- App-wide CRUD audit logging. Later audit MUST NOT use ID `005` and MUST NOT be written as `specs/005-audit/`. This ID is `007-workspace-ui`. Do not create `specs/008-*`.
- A `position` / `rank` field, rank migration, move endpoint, or a second DnD library (Q-034 / Q-035 remain). `@dnd-kit/sortable` MUST NOT be added (Q-043).
- Changing HTTP contracts, DTOs, status codes, cookie session behavior, CORS, or `credentials: 'include'`.
- An `includeArchived` sidebar or grid filter. Archived recovery stays on the existing project-detail URL.
- Hard-delete, restore/un-delete, moving a task to another project, or changing soft-delete.
- A second CSS framework, a theme library (for example `next-themes`), the full shadcn catalog, or Trello trademarks/logos/copyrighted assets.
- Changing name-derived project-card covers into user-picked per-project colors (Q-036 / Q-039 stay). Whole-UI palettes are separate from cover derivation.
- Production images or CI/deployment (Q-006, Q-009), probe retention (Q-007), password complexity (Q-015), rate limiting / lockout (Q-017).
- Treating hidden UI, modals, or client-only layout as authorization.

## 4. Actors and User Stories

### User Story US-001

As an authenticated owner, I want `/projects` to show a grid of my project cards in the main area, so that I can open a project without wasting the workspace on “Select a project”.

### User Story US-002

As an authenticated owner, I want each project card to show a color-and-initials cover derived from the project name, so that the grid is visually scannable without image uploads or new stored fields.

### User Story US-003

As an authenticated owner, I want a compact left sidebar of project names plus a `+` that opens create-project in a modal, so that navigation stays thin and create is not a permanent sidebar form.

### User Story US-004

As an authenticated owner on a project board, I want a compact header with the project name, short description, and edit/archive/unarchive actions, so that the Kanban columns can use the remaining height.

### User Story US-005

As an authenticated owner, I want project edit in a modal and archive/unarchive from board chrome, so that a huge always-on update form does not dominate the board.

### User Story US-006

As an authenticated owner, I want to add a task from a board-header `+` or from a `+` at the bottom of a column, so that create-task is a modal and column `+` starts with that column’s status.

### User Story US-007

As an authenticated owner, I want task detail in a modal with the board still visible, so that I can edit or soft-delete a task without replacing the columns.

### User Story US-008

As an authenticated owner, I want compact filters above the board and task cards that show title, priority, and optional due date, so that I can scan work without a large form block or new fields.

### User Story US-009

As a guest or another user, I want existing authz, destinations, and cookie session behavior unchanged, so that this feature is presentation-only.

### User Story US-010

As an authenticated owner on a project board, I want an explicit Back to projects control in the compact header action row next to Edit project and Archive project, so that I can return to the grid without relying only on the application name. The DevTrack name in the top bar MUST still go to `/projects`.

### User Story US-011

As an authenticated owner on `/projects`, I want project cards to stay a compact Trello-like size in a grid, so that they do not stretch across large fractions of the main area.

### User Story US-012

As a user of this browser, I want to choose a whole-UI color palette from a documented built-in collection that includes solid and gradient options, so that the product looks vibrant and my choice survives reloads in this browser only.

### User Story US-013

As an authenticated owner on a project board, I want the three status columns to stay compact rather than stretching across the whole main area, so that the board reads as a Kanban instead of three full-width panes.

### User Story US-014

As an authenticated owner, I want task cards to show a pointer cursor on hover and a proper drag overlay while moving, so that dragging feels like moving a card, not only fading the source. Status-only moves remain (Q-034).

## 5. Functional Requirements

- **FR-001:** Required destinations remain those verified in `005-frontend-shell`: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`; guest root → register; authenticated root → projects; unknown paths (including `/system/probes`) → not-found. This feature MUST NOT add a destination. Authenticated chrome (top app bar + left project sidebar) MUST remain on product destinations. Guest login/register MUST remain without a product sidebar or board.
- **FR-002:** On `/projects` (no project selected, including after login/register and authenticated app-root redirect), the main area MUST present a grid of the caller’s listed non-archived projects as cards. The empty/select-or-create “Select a project” main from `005-frontend-shell` MUST NOT remain. The left sidebar MUST stay visible. The main MUST NOT become a second stacked full-page list that hides the sidebar. Clicking a project card MUST navigate to `/projects/:projectId` for that project. The grid MUST reuse verified project-list rules (owner-only, default excludes archived, `GET /api/projects`, `credentials: 'include'`). There MUST NOT be an `includeArchived` grid filter.
- **FR-003:** Each project card MUST show a visual cover of **color + initials derived from the project name** (Q-036). The cover MUST NOT use image upload, object storage, or a persisted `coverColor` (or equivalent) field. Color and initials MUST be computed in the frontend. A name change MAY change the derived cover; that MUST NOT require a migration. Cards MUST also present the project **name** so the grid is operable without relying on initials alone. Optional description MAY appear truncated on the card; no new description field. Whole-UI palettes (FR-018) MUST NOT replace this name-derived cover with a per-project stored color.
- **FR-004:** The left sidebar’s primary content MUST be a compact list of listed project **names** (still owner-only, default excludes archived) plus an obvious `+` (or equivalent named control) to create a project. The permanent in-sidebar create-project form MUST NOT remain always visible. Create-project MUST open as a modal using existing fields (`name`, optional `description`) and `POST /api/projects` with `credentials: 'include'`. After a successful create, the new project MUST be selectable from the sidebar and MUST appear in the `/projects` grid when that destination is showing. This feature MUST NOT auto-invent a new list API. Profile MUST keep the compact sidebar.
- **FR-005:** On `/projects/:projectId`, the always-visible project update form (name/description fields always on the page) MUST NOT remain. Choosing **edit** MUST open the existing update fields in a modal (`PATCH /api/projects/:id` with existing name/description). Archive and unarchive MUST remain available from compact board chrome actions (not from a huge always-on form) using the existing archive/unarchive APIs. An archived project opened via its detail URL MUST still offer unarchive even if it is absent from the sidebar and `/projects` grid. Writes on archived projects remain disabled as in `003`/`004`.
- **FR-006:** The compact project-detail header action row (the compact chrome the user called “within the project card”) MUST include an explicit **Back to projects** control **next to** **Edit project** and **Archive project** (or Unarchive when archived). Activating it MUST navigate to `/projects` (existing destination). The DevTrack application name in the top app bar MUST remain a link to `/projects`. Sidebar selection and the `/projects` grid remain additional navigation. This **supersedes** the original 007 FR-006 / Q-037 rule that removed Back to projects.
- **FR-007:** Project-detail chrome MUST be compact: loaded project **name**, **short description** (or the existing empty-description presentation), and actions (Back to projects, edit, archive or unarchive). Kanban columns MUST be the primary remaining main-area content and MUST use the remaining main height after that compact chrome and compact filters (Q-038). This MUST NOT add dashboard counts, charts, or aggregate APIs.
- **FR-008:** Optional `status` and/or `priority` filters MUST remain and MUST stay the existing `GET /api/projects/:projectId/tasks` query params from `004-tasks`. Filter controls MUST be compact and sit **above the board**, not as a large form block. Filtered results still group by persisted `status` as in `006-kanban`.
- **FR-009:** The always-visible add-task form MUST NOT remain. A `+` (or equivalent named control) in the **board header** MUST open a create-task modal. A `+` at the **bottom of each column** MUST open the same create-task modal with that column’s `status` pre-filled. Create still uses `POST /api/projects/:projectId/tasks` with existing fields (`title`, optional `description`, optional `dueDate`, optional `status`, optional `priority`) and `credentials: 'include'`. Header `+` MUST NOT invent a new default beyond existing API default `TODO` when `status` is omitted (Q-040 recommendation). Column `+` MUST send that column’s `status`. Create MUST remain disabled or otherwise non-successful while the parent project is archived (`409` if attempted). Soft-delete, nested detail update, and Q-034/Q-035 DnD MUST remain.
- **FR-010:** Opening a task card MUST show `TaskDetail` in a **modal** so the board remains visible behind it. Task detail MUST NOT replace the column layout as a full-page swap. Nested in-destination state remains allowed; a `/tasks/:id` URL is still not required. Close (explicit close, and Dialog dismiss) MUST return to the board without requiring a new destination. Status change via the detail form remains a valid non-drag path.
- **FR-011:** Each task card MUST show the task **title**, existing **priority**, and **due date when present**. Cards MUST NOT invent new fields. Description MAY remain omitted from the card face (detail modal shows it). Cards remain draggable under Q-034/Q-035 (`@dnd-kit/core`; same-column drop is a no-op; cross-column drop PATCHes `{ status }`). Task cards MUST show a pointer/hand cursor on hover, comparable to project cards. While dragging, the UI MUST show a proper drag overlay or equivalent transform animation via `@dnd-kit/core` `DragOverlay` and/or `useDraggable` `transform`. Fading the source card alone is not sufficient. `@dnd-kit/sortable` MUST NOT be added (Q-043).
- **FR-012:** Modals required by this feature MUST use a copied shadcn **Dialog** primitive if an overlay is required (Q-038). Radix `@radix-ui/react-dialog` MAY be added as the documented peer that Dialog needs. A second CSS framework MUST NOT be added. The full shadcn catalog MUST NOT be imported. DropdownMenu is **not** required; compact action controls in board chrome are enough. Original DevTrack identity remains (not a Trello clone; no trademarks/logos/assets).
- **FR-013:** This feature MUST NOT change backend modules, HTTP contracts, DTOs, status codes, Prisma schema, or migrations. Existing domains remain `system`, `auth`, `users`, `projects`, and `tasks`. No new domain. No generic repository. No microservices. No `project-members`. No `position`/`rank`. No cover-image or `coverColor` column. No palette/theme column on `User` or any other model.
- **FR-014:** HTTP-only session cookie `devtrack_session`, 7-day absolute expiry, logout revoke of that session, CORS origin with credentials, public `GET /health` and `GET /ready`, and authenticated probe HTTP MUST remain as verified. Frontend fetches MUST keep `credentials: 'include'`. The frontend MUST NOT store a bearer token or session id in JS storage. Palette persistence MAY use a dedicated localStorage key for the palette id only (FR-018). Frontend layout MUST NOT replace backend owner checks. Owner-only, archived-parent `409` on writes, and task soft-delete remain as verified.
- **FR-015:** Critical presentation behavior MUST be tested: `/projects` card grid (not empty select-or-create); derived covers without persisted color; compact narrower cards; compact sidebar without always-on create form; create-project modal; compact board header with Back to projects next to Edit/Archive (and DevTrack still → `/projects`); edit modal; archive/unarchive from chrome; compact filters; remaining-height columns that do not stretch the full main width; add-task modal from header `+` and column `+` with pre-filled status; task-detail modal with board still present; task cards show title, priority, optional due date, pointer cursor, and drag overlay; whole-UI palettes with localStorage-only persistence and guest coherence; DnD/authz/archived/soft-delete/credentials unchanged; Dialog (if copied) allowed in deps tests; no second CSS framework; no `@dnd-kit/sortable`; no Trello branding; no new API/schema. Typecheck MUST stay strict TypeScript. Tests that currently lock “no Back to projects” or `localStorage.length === 0` MUST be rewritten so they assert the restored Back control and still forbid session tokens while allowing the palette key `devtrack.uiPalette`.
- **FR-016:** The `/projects` card grid MUST keep CSS grid layout and name-derived covers, and MUST constrain card size so cards are compact (Trello-like), not stretched to fill `1/2` or `1/3` of the main width. Use `auto-fill` plus a max card width of about **14–18rem**, left-aligned, not full-main stretch (Q-044). Tests assert constrained layout, not one magic pixel.
- **FR-017:** The three Kanban status columns MUST remain `TODO` / `IN_PROGRESS` / `DONE`, MUST keep remaining-height scrolling inside the column, and MUST use a compact column width of about **16–20rem** in a left-aligned row of three so they do not stretch as equal thirds of the whole main area (Q-044). Unused main space MAY remain. Tests assert constrained layout, not one magic pixel.
- **FR-018:** The product MUST provide this documented built-in catalog of whole-UI color palettes (Q-041): solids **Forest** (default), **Ocean**, **Sunset**, **Violet**, **Midnight**; gradients **Aurora**, **Ember**, **Lagoon**, **Twilight**, **Citrus**, **Magma**, **Glacier**. The user MUST be able to select one from a compact accessible selector on the **authenticated** top app bar (Q-042). Apply the chosen palette on the document root so guest and authenticated chrome inherit it. The selected palette id MUST persist in **localStorage only** under `devtrack.uiPalette` (this browser) and MUST survive reload and logout. It MUST NOT be written to the profile API, cookies, or Prisma. Missing or unknown stored ids MUST fall back to **Forest**. Guest login/register (and other guest chrome) MUST still look coherent: apply the stored palette if valid, otherwise Forest. A guest-bar selector is not required. Palettes MUST reuse existing CSS custom properties (and optional gradient background tokens) rather than a second CSS framework.

## 6. Acceptance Criteria

### Scenario AC-001: Projects home is a card grid

- Given an authenticated owner on `/projects` with at least one listed (non-archived) project
- When the destination renders after the project list loads
- Then the main area shows a grid of project cards for those listed projects, the empty “Select a project” / choose-from-sidebar placeholder is not shown, the left sidebar remains visible, and the main is not a stacked full-page list that hides the sidebar

### Scenario AC-002: Empty project grid

- Given an authenticated owner with no listed (non-archived) projects
- When `/projects` renders
- Then the main area is an empty grid/empty-projects state (not the old select-or-create copy that only tells the user to use the sidebar as the sole content), the compact sidebar remains visible with its create `+`, and no second always-visible create form fills the main

### Scenario AC-003: Project card navigates to detail

- Given the `/projects` grid shows a listed project
- When the owner activates that card
- Then they navigate to `/projects/:projectId` for that project and the board destination loads as in `006-kanban`

### Scenario AC-004: Derived color-initials cover

- Given a listed project with a name
- When its card renders on `/projects`
- Then the card shows a visual cover with initials derived from that name and a color derived from that name, and the project name is also shown
- Then inspecting APIs, Prisma, and DTOs shows no `coverColor`, image URL, or new cover field and no new migration

### Scenario AC-005: Compact sidebar and create modal

- Given an authenticated user on an authenticated product destination
- When the sidebar renders
- Then it lists compact project names (default excludes archived) and exposes a create `+` (or equivalent), and the permanent always-visible sidebar create form is not present
- When they activate create and submit valid existing fields
- Then `POST /api/projects` is used with `credentials: 'include'`, the modal can close on success, and the new project is listed in the sidebar (and in the `/projects` grid when that page is shown)

### Scenario AC-006: Compact board header with Back to projects

- Given an authenticated owner on `/projects/:projectId` for a project they can open
- When the destination renders after the project loads
- Then chrome shows the project name, a short description (or the existing empty-description presentation), and actions for Back to projects, edit, and archive (or unarchive if archived)
- Then Back to projects is in the same compact header action row as Edit project and Archive project (or Unarchive)
- Then the application name (DevTrack) still navigates to `/projects`

### Scenario AC-007: Project edit is a modal

- Given an active owned project on project detail
- When the owner has not chosen edit
- Then the name/description update form is not always visible on the board
- When they choose edit, change name/description, and save
- Then existing `PATCH /api/projects/:id` is used with `credentials: 'include'` and the compact header reflects the updated name/description after success

### Scenario AC-008: Archive and unarchive from board chrome

- Given an owned project on its detail URL
- When the owner uses archive (active) or unarchive (archived) from board chrome actions
- Then the existing archive/unarchive APIs run with `credentials: 'include'`, and verified archive behavior remains (sidebar/grid default-omit archived; detail URL still opens for the owner; task writes conflict `409` while archived)

### Scenario AC-009: Compact filters above the board

- Given project detail with mixed tasks
- When the owner uses status and/or priority filters
- Then the controls sit compactly above the board (not a large always-on create/filter form block), the existing list query is used, and columns show only matching listed tasks

### Scenario AC-010: Columns use remaining main height

- Given project detail has loaded
- When the layout is inspected
- Then the three `TODO` / `IN_PROGRESS` / `DONE` columns remain the primary task layout, occupy the remaining main height under compact header and filters, and there is still no list/board toggle and no dashboard aggregate widgets

### Scenario AC-011: Add-task modal from board header

- Given an active owned project
- When the owner has not opened create-task
- Then the always-visible create-task form is not on the page
- When they activate the board-header `+` and submit existing create fields
- Then `POST /api/projects/:projectId/tasks` runs with `credentials: 'include'` and the new task appears in the column for its persisted `status` (API default `TODO` if status is omitted)

### Scenario AC-012: Column `+` pre-fills status

- Given an active owned project and the `IN_PROGRESS` column
- When the owner activates the `+` at the bottom of that column and submits a valid title without changing status
- Then create is called with `status` `IN_PROGRESS` (that column’s status) and on success the card appears in `IN_PROGRESS`

### Scenario AC-013: Task detail modal keeps the board visible

- Given listed tasks on the board
- When the owner opens a card
- Then task detail appears in a modal, the three status columns remain visible (not replaced by a full-page-only detail), and close returns to the board without a new URL
- When they update or soft-delete through that modal
- Then existing task PATCH/DELETE behavior remains, including archived `409` and status-select as a non-drag path

### Scenario AC-014: Task cards show existing metadata

- Given a listed task with priority `HIGH` and a due date, and another listed task with no due date
- When the board renders
- Then both cards show title and priority, the dated card shows its due date, and the undated card does not invent a due date

### Scenario AC-015: DnD, authz, and contracts unchanged

- Given this feature’s board
- When the owner drags across columns, drops on the same column, or a write fails (`409` archived, `403`, network)
- Then Q-034/Q-035 behavior remains: cross-column drop PATCHes `{ status }` with `credentials: 'include'`; same-column drop sends no PATCH and no rank; failed drop is not kept as success; `@dnd-kit/core` is used; `@dnd-kit/sortable` is absent (Q-043)
- When APIs, Prisma, and modules are inspected
- Then there is no new endpoint, no new domain, no `coverColor`/rank/image/palette field, no migration, and cookie auth is unchanged

### Scenario AC-016: Guest and other destinations

- Given a guest on login/register, or an authenticated user on profile or not-found
- When those destinations render
- Then guest screens have no product sidebar, grid, or board; profile keeps the compact sidebar; `/projects` grid is not required on profile; probe UI remains absent; routing guards remain as in 005
- Then guest screens still look coherent under the stored palette or the default (FR-018)

### Scenario AC-017: Dialog primitive and identity

- Given copied UI primitives after this feature
- When `frontend/package.json` and `frontend/src/components/ui/` are inspected
- Then shadcn Dialog may be present with `@radix-ui/react-dialog` if used; no second CSS framework; no full catalog dump; Trello trademarks/logos/assets are absent; original DevTrack identity remains

### Scenario AC-018: Automated checks

- Given the frontend test suite and typecheck
- When they are run
- Then tests covering AC-001–AC-017 and AC-019–AC-026 pass, tests that locked “no Back to projects” or empty `localStorage` as a session-token proxy no longer lock the pre-polish UX incorrectly, `credentials: 'include'` is still asserted, session tokens are still not stored in JS storage, and `frontend` `npm run typecheck` passes

### Scenario AC-019: Existing slices remain

- Given verified `001`–`006` behavior outside this presentation
- When this feature is implemented
- Then register, login, logout, own-profile, owner-only projects, task field rules, health/ready, probe HTTP, and Kanban persistence remain; later audit artifacts are not created as `005-audit`; `specs/008-*` is not created

### Scenario AC-020: Back to projects navigates home

- Given an authenticated owner on `/projects/:projectId`
- When they activate Back to projects
- Then they navigate to `/projects` and the card grid destination is shown
- Then no new route was added

### Scenario AC-021: Project cards stay compact in a grid

- Given `/projects` with listed projects
- When the grid renders
- Then cards remain a CSS grid with name-derived covers and visible names
- Then cards are constrained to about 14–18rem (auto-fill, left-aligned) and do not stretch as equal halves or thirds of the full main width (Q-044)

### Scenario AC-022: Whole-UI palette selection and persistence

- Given the documented built-in palette catalog (Forest, Ocean, Sunset, Violet, Midnight, Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier)
- When the user selects a palette other than Forest from the authenticated top-bar selector
- Then whole-UI surfaces (at least page, app bar, sidebar, and board tokens) update to that palette
- Then the chosen palette id is stored in localStorage only under `devtrack.uiPalette`
- Then reload keeps the same palette
- Then logout does not clear that key
- Then no profile `PATCH`, cookie write, or Prisma field is used for the palette

### Scenario AC-023: Palette default, invalid storage, and guests

- Given missing localStorage, or an unknown stored palette id
- When the app renders
- Then Forest is applied and the UI does not crash
- Given a guest on login or register
- When those pages render
- Then they use the stored palette if valid, otherwise Forest, and still have no product sidebar

### Scenario AC-024: Kanban columns stay compact

- Given project detail has loaded
- When the board layout is inspected
- Then three status columns remain
- Then they stay about 16–20rem in a left-aligned row of three and do not stretch as equal thirds of the whole main area (Q-044)
- Then remaining-height column scrolling remains

### Scenario AC-025: Task card pointer cursor

- Given a listed task card on the board
- When the pointer hovers the card (or the computed cursor is inspected)
- Then the cursor is pointer/hand, comparable to a project card

### Scenario AC-026: Drag overlay animation without sortable

- Given a listed task card and `@dnd-kit/core`
- When the owner starts a drag
- Then a drag overlay (or equivalent live transform) is shown so the card appears to move, not only the source fading
- When they complete a cross-column drop
- Then Q-034 still PATCHes `{ status }` only
- Then `@dnd-kit/sortable` is not added (Q-043)

## 7. Business Rules

- Navigation identity remains the URL destination — owning concern: frontend
- `/projects` main is a card grid of the default owner list, not an empty instruction — owning concern: frontend
- Project cover color and initials are derived presentation of `name`, not persisted data — owning concern: frontend
- Whole-UI palette is a browser presentation preference in localStorage, not account data — owning concern: frontend
- Default project list excludes archived; no `includeArchived` — owning domain: `projects`
- Only the owner may create/update/archive/unarchive projects or mutate tasks — owning domains: `projects`, `tasks`
- Archived parent: view/list allowed; writes conflict `409` — owning domains: `projects`, `tasks`
- Task column membership is persisted `status`; Q-034 status-only DnD — owning domain: `tasks`
- Soft-deleted tasks are not listed — owning domain: `tasks`
- Authentication is not authorization — owning domains: `auth`, `projects`, `tasks`
- Visual identity is original DevTrack, not a Trello clone — owning concern: frontend
- No dashboard aggregates, members, audit, rank, or image storage in this feature

## 8. Data

No new business concept. No new persistence in PostgreSQL.

The UI continues to read existing public DTOs:

- **Project** (`PublicProjectDto`): `id`, `ownerUserId`, `name`, `description`, `createdAt`, `archivedAt`
- **Task** (`PublicTaskDto`): `id`, `projectId`, `title`, `description`, `status`, `priority`, `dueDate`, `createdAt`

Cover color and initials are computed from `name` in the frontend. They MUST NOT be stored on Project.

Whole-UI palette id MUST be stored in localStorage under the dedicated key `devtrack.uiPalette` (Q-042). That key MUST store only a catalog id string. It MUST NOT store session material, tokens, emails, or passwords.

Session material stays in the HTTP-only `devtrack_session` cookie.

Probe list retention remains deferred (Q-007).

## 9. API and Integrations

No new endpoints and no contract changes.

The workspace continues to call the verified client helpers against `VITE_API_URL`:

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/users/me`, `PATCH /api/users/me`
- `GET/POST /api/projects`, `GET/PATCH /api/projects/:id`, archive/unarchive
- `GET/POST /api/projects/:projectId/tasks` (optional `status`/`priority` query on GET)
- `GET/PATCH/DELETE /api/tasks/:id` (PATCH `{ status }` remains the DnD persistence path)
- Probe HTTP remains unused as product UI
- Public `GET /health` and `GET /ready` remain unused as product chrome

`PATCH /api/users/me` MUST NOT gain a palette/theme field.

HTTP schemas stay in the verified `002`–`004` plans. Do not add request/response fields. Do not add `includeArchived`. Do not add a move endpoint or rank field.

## 10. Security

- Authentication remains the HTTP-only `devtrack_session` cookie. Frontend keeps `credentials: 'include'` on every `fetch`.
- Authorization remains resource-level in the backend. Hidden forms, modals, and disabled `+` controls are not access control.
- CSRF posture is unchanged (`SameSite=Lax`, CORS origin allowlist with credentials, JSON bodies).
- Responses and UI MUST NOT display secrets, hashes, or stack traces.
- No new secrets, env vars, or cookie flags.
- Derived covers MUST NOT leak other users’ projects; the grid still uses the owner-only list.
- localStorage MAY hold only the palette catalog id. Tests MUST still forbid bearer tokens, session ids, and password material in `localStorage` / `sessionStorage`.
- An attacker who can write localStorage can only change this browser’s palette. That MUST NOT grant project or task access.

## 11. Non-Functional

- Usable desktop workspace: compact sidebar, compact card grid, compact board header/filters, remaining-height compact columns. No invented performance budgets. Mobile collapse is still not required.
- Educational clarity: presentation-only change; reuse existing API client; copied Dialog source stays reviewable under `frontend/src/components/ui/`; palette catalog is named data plus CSS tokens, not a theme framework.
- Maintainable presentation: screens stay under `frontend/src/` (`layout/`, `projects/`, `tasks/`, `routes/`, optional `theme/`). Do not add a parallel app tree or a backend `workspace` domain.
- Local Compose remains Vite/tsx dev servers (Q-006 deferred).
- Dialog accessibility: copied shadcn Dialog MUST keep a title (visible or sr-only) and standard dismiss (Escape / close control).
- Palette selector MUST have an accessible name. Gradient palettes MUST keep readable contrast on chrome text.

## 12. Dependencies

- Existing features: Verified `001-foundation`, `002-authentication`, `003-projects`, `004-tasks`, `005-frontend-shell`, `006-kanban`. Original 007 pass (T001–T013) is in the repo and is the baseline for this polish.
- Architectural constraints: constitution v2.1.0; `prompt.md` stack; additional dependencies require an explicit documented decision.
- Already decided and still in force: React Router 7, Tailwind CSS 4, copied shadcn primitives currently `button`, `input`, `label`, `card`, `textarea`, `dialog`, documented peers, `@dnd-kit/core`.
- **Allowed by this feature:** copied shadcn Dialog plus `@radix-ui/react-dialog` (already present). `@dnd-kit/core` `DragOverlay` / transform (already in that package). No second CSS framework. No `@dnd-kit/sortable` (Q-043). No image-upload library. No `next-themes` or equivalent theme package.

## 13. Failures and Edge Cases

- Empty owner list: empty grid + compact sidebar create `+`; not an API error.
- Duplicate project names: allowed; cards distinct by `id`; derived covers MAY collide visually.
- Non-Latin or single-token names: initials still render (see Q-039 recommendation); do not persist a cover.
- Archived detail URL: board visible; create/edit/add-task writes disabled or fail `409`; unarchive remains in chrome; Back to projects still navigates to `/projects`.
- Unknown project id: existing not-found/error on detail; grid still shows the default list.
- 401: existing logout/login behavior; do not show owner data as authorized. Palette in localStorage MAY remain (browser preference).
- 403: existing forbidden state; do not invent a new authz model.
- Create-task on archived project: no durable create; `409` if attempted.
- Modal dismiss with unsaved fields: discard local form state; do not PATCH.
- Same-column drop: no PATCH (Q-034).
- Path `/system/probes`: not-found, no probe UI.
- Missing or corrupt palette localStorage value: default palette; do not crash.
- Do not `prisma migrate reset` or delete `pgdata`.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-016, AC-019 | Routing/chrome tests |
| FR-002 | AC-001, AC-002, AC-003 | Projects-home grid tests |
| FR-003 | AC-004 | Cover tests; inspect Prisma/DTOs |
| FR-004 | AC-005 | Sidebar + create-modal tests |
| FR-005, FR-006, FR-007 | AC-006, AC-007, AC-008, AC-020 | Board-header / Back / edit-modal / archive tests |
| FR-008 | AC-009 | Filter tests |
| FR-007, FR-017 | AC-010, AC-024 | Layout + compact-column tests |
| FR-009 | AC-011, AC-012 | Create-task modal tests |
| FR-010 | AC-013 | Task-detail modal tests |
| FR-011 | AC-014, AC-025, AC-026 | Card metadata, cursor, overlay tests |
| FR-012, FR-015 | AC-017, AC-018 | Deps tests; typecheck + tests |
| FR-013, FR-014 | AC-015, AC-019 | Inspect APIs/Prisma; credentials asserts |
| FR-016 | AC-021 | Compact card-grid tests |
| FR-018 | AC-022, AC-023, AC-016 | Palette + localStorage + guest tests |

## 15. Open Questions

### Resolved for this feature (decided)

- **Q-036:** `/projects` main content and project-card cover. Owner: product + frontend. Status: **Decided**. Use the main area for a grid of project cards. Cover is **color + initials derived from the project name**. No image upload, no `coverColor` field, no migration. Compact Trello-like card size is added by FR-016; cover derivation is unchanged.
- **Q-037:** Forms vs modals and compact chrome. Owner: product + frontend. Status: **Decided**, except the Back-to-projects clause. Compact sidebar names + create `+` modal. Project update is a modal, not always visible. Archive/unarchive stay on board chrome actions. Add-task is a modal from board-header `+` and per-column `+` (column `+` pre-fills that column’s `status`). Task detail is a modal; the board stays visible. **Superseded:** “Remove always-visible Back to projects because the app name navigates to `/projects`.” Restore Back to projects next to Edit/Archive; keep the app-name link (FR-006).
- **Q-038:** Board presentation and Dialog. Owner: product + frontend. Status: **Decided**. Compact header (name, short description, actions) and compact filters above the board. Columns are the primary remaining-height focus (presentation, not dashboard aggregates). Compact column **width** is added by FR-017. Task cards show title, existing priority, and optional due date. Copied shadcn Dialog is allowed if required. No second CSS framework. No new domain.
- **Q-041:** Built-in whole-UI palette catalog. Owner: product + frontend. Status: **Decided**. Catalog (more gradient-heavy options added on top of the original recommended set), with **Forest** as the default matching the current DevTrack tokens:
  - Solids: **Forest** (default), **Ocean**, **Sunset**, **Violet**, **Midnight**
  - Gradients: **Aurora**, **Ember**, **Lagoon**, **Twilight**, **Citrus**, **Magma**, **Glacier**
  Document the catalog in frontend code. Persist only the palette id in localStorage. No profile API, no schema, no migration. Gradient palettes style large surfaces (page, app bar, sidebar, board) with CSS gradients while keeping text/card contrast readable.
- **Q-042:** Palette selector placement and storage key. Owner: product + frontend. Status: **Decided**. Apply the palette on the document root so guest and authenticated chrome inherit it. Put a compact accessible selector on the **authenticated** top app bar (native `<select>` or labeled buttons; DropdownMenu still not required). Guests use the stored palette if valid, otherwise Forest; a guest-bar selector is not required. Persist only the catalog id under `devtrack.uiPalette` (the already recommended key; keep this one documented key). Do not clear it on logout. Invalid/missing values → Forest.
- **Q-043:** Whether `@dnd-kit/sortable` is required for drag animation. Owner: frontend. Status: **Decided**. Not required. Use `@dnd-kit/core` `DragOverlay` and/or `useDraggable` `transform`. Do not add `@dnd-kit/sortable`. Keep Q-034 status-only moves.
- **Q-044:** Exact card and column widths. Owner: frontend. Status: **Decided**. Project cards: keep CSS grid; use `auto-fill` plus a max card width of about **14–18rem**, left-aligned, not full-main stretch (do not keep `sm:grid-cols-2 xl:grid-cols-3` stretching). Kanban columns: compact max width of about **16–20rem**, left-aligned row of three, remaining-height scroll inside the column. Unused main space MAY remain. Tests assert constrained layout (classes or equivalent), not one magic pixel.

### Applied from the original 007 pass

- **Q-039:** Exact cover color and initials algorithm. Owner: frontend. Status: **Applied**. Deterministic hash of the project `name` into a small fixed DevTrack palette with readable contrast; initials from the first letter of the first two whitespace-separated tokens, else the first two characters, else one character; update when `name` changes. Tests assert a cover with initials, not a specific hex value.
- **Q-040:** Board-header `+` default status, and navigation after creating a project. Owner: product + frontend. Status: **Applied**. Header `+` omits `status` so the API default `TODO` applies. After successful create-project, close the modal, refresh the owner list, and **stay on the current destination** (do not auto-navigate to the new project). Compact header actions are buttons (plus the restored Back control); DropdownMenu was not added.

### Deferred (out of scope)

- **Q-006:** Dev vs production images. Owner: architecture. Status: Deferred.
- **Q-007:** Probe list retention. Owner: `system`. Status: Deferred.
- **Q-009:** CI and deployment. Owner: project. Status: Deferred.
- **Q-015:** Password complexity beyond non-empty. Owner: `auth`. Status: Deferred.
- **Q-017:** Rate limiting and account lockout. Owner: `auth`. Status: Deferred.

### Still in force from earlier features

- Q-016 / Q-028 / Q-029 / Q-030 / Q-032: routing, Tailwind + copied shadcn, no probe UI, left sidebar.
- Q-031: original DevTrack identity, not a Trello clone. Columns/DnD on project-detail remain as superseded by `006-kanban`.
- Q-033 / Q-034 / Q-035: columns replace the ungrouped list; status-only DnD; `@dnd-kit/core` only. Q-043 decides `@dnd-kit/sortable` is not added.
- Q-021: default list excludes archived; no `includeArchived`.
- Q-027: audit is later work, **not** ID `005`, **not** `006`, **not** this folder.

### Later product work (do not specify here)

- Dashboard aggregates.
- Project membership / `project-members`.
- App-wide CRUD audit logging (later feature ID, **not** `005`, **not** `006`, **not** `007`; do not write `specs/005-audit/`).
- Nested task-detail URLs.
- Responsive/mobile sidebar collapse.
- Persisted cover images or within-column rank.
- Syncing UI palette to a user profile.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-041–Q-044 decided; deferred Q-006, Q-007, Q-009, Q-015, Q-017 remain out of scope
- Approved for planning: Yes
- Approved for implementation: Yes (polish T014–T026)
- Independent review: Original 007 pass PASS WITH NON-BLOCKING FINDINGS (blocking: no; failed ACs: none). Polish T025 PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Informational: live contrast not audited in review; AC-018 not re-executed by reviewer. Low: some project-cover slots retint with the theme tokens (still name-derived, no stored coverColor). Coordinator independently re-ran (Node 22.13.0): `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 16 files / 133 tests passed. Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): `/projects` card grid + Color palette select (Forest default, switched to Aurora gradient); board shows Back to projects next to Edit/Archive; narrower left-aligned columns; Back navigates to `/projects`; palette remains Aurora.
- Verified: Yes (original T001–T013 and polish T014–T026). FR-006 / Q-037 Back-to-projects supersession and Q-041–Q-044 decided. Polish ACs AC-020–AC-026 and amended AC-006 met. Q-006, Q-007, Q-009, Q-015, Q-017 remain deferred. Dashboard, collaboration, and audit remain unimplemented. Later audit MUST NOT use ID `005`. `specs/008-*` and `specs/005-audit/` were not created. No migration, no `coverColor`, no User palette field. `@dnd-kit/core` only (no `@dnd-kit/sortable`).
