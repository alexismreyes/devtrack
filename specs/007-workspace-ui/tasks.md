# Tasks: Workspace UI

- **Feature ID:** 007-workspace-ui
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks, and only after an explicit request to implement. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

Feature artifacts are **Verified** (original T001–T013 plus polish T014–T026). Do not create `specs/008-*` or `specs/005-audit/` for this polish.

T001–T013 below remain the **original 007 pass** (completed, historically recorded). They do **not** include this polish. New work is T014 onward.

Recorded decisions still in force:

- **Q-036:** `/projects` main is a project-card grid. Cover is color + initials derived from the project name. No image upload, no `coverColor`, no migration.
- **Q-037:** Compact sidebar names + create `+` modal. Project update is a modal. Archive/unarchive from board chrome. Add-task modal from board-header `+` and column `+`. Task detail is a modal; board stays visible. **Superseded:** “Remove always-visible Back to projects.” Restore it next to Edit/Archive; keep DevTrack → `/projects`.
- **Q-038:** Compact header and compact filters; columns use remaining main height; task cards show title, priority, optional due date; copied shadcn Dialog allowed; no second CSS framework.
- **Q-039 / Q-040:** Applied (hash palette + initials; header `+` omits `status`; stay on current destination after create-project; action buttons, not DropdownMenu).
- **Q-041:** **Decided.** Catalog: solids Forest (default), Ocean, Sunset, Violet, Midnight; gradients Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier. Persist palette id in localStorage only. No API/schema.
- **Q-042:** **Decided.** Selector on the authenticated top bar. Apply on document root. Guests use stored-or-Forest. Do not clear on logout. Key `devtrack.uiPalette`.
- **Q-043:** **Decided.** Do not add `@dnd-kit/sortable`. Use `@dnd-kit/core` `DragOverlay` / `transform`.
- **Q-044:** **Decided.** Project cards about 14–18rem, Kanban columns about 16–20rem, left-aligned, not full-main stretch.
- Q-006, Q-007, Q-009, Q-015, Q-017 stay deferred. No dashboard aggregates, members, audit, rank, coverColor, or profile palette field.

Backend phase is confirmation-only. Do not scaffold empty domain layers. No API or schema change.

## Checklist

### Phase 1 — Preparation (original 007 pass)

- [x] T001 Inspect the current implementation: `ProjectsHome` empty select Card, `ProjectsPage` always-visible create form, `AuthenticatedLayout` app-name link to `/projects`, `ProjectDetail` always-visible update form and “Back to projects”, `TasksPanel` always-visible create-task form and inline `TaskDetail`, `KanbanBoard` title-only cards and no column `+`, `frontend/src/api/client.ts` (`credentials: 'include'`), copied shadcn list (`button`, `input`, `label`, `card`, `textarea`), `frontend-deps.test.ts` exact UI allowlist, and tests that lock empty-main / always-on forms. Record what to extend rather than replace. Do not change code in this task.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved. Reconfirm: same 005 destinations; cookie `devtrack_session` and `credentials: 'include'`; owner-only; archived `409`; soft-delete; Q-034 status-only DnD; `@dnd-kit/core` only; no new domain; no generic repository; no microservices; no `coverColor`/migration; Dialog allowed; Q-006, Q-007, Q-009, Q-015, Q-017 deferred; later audit MUST NOT use ID `005`. Reconfirm Q-036–Q-038 decided and Q-039–Q-040 recommendations. Stop if artifacts are Draft.

### Phase 2 — Backend (original 007 pass; confirm existing contract)

- [x] T003 Confirm existing project and task HTTP contracts already cover this presentation (list/create/update/archive, task list/create/update/soft-delete, PATCH `{ status }`, owner-only `403`, unauthenticated `401`, archived `409`). Confirm Prisma `Project`/`Task` have no cover/rank/image fields. Do not add endpoints, a `workspace` module, a generic repository, or a migration. Do not `migrate reset` or delete volumes.

### Phase 3 — Frontend (original 007 pass)

- [x] T004 Copy the shadcn Dialog primitive under `frontend/src/components/ui/dialog.tsx` and add only `@radix-ui/react-dialog` as its peer. Update `frontend-deps.test.ts` so Dialog is allowed and extra CSS frameworks, `@dnd-kit/sortable`, and extra DnD libraries remain forbidden. Do not import the full catalog. Do not add DropdownMenu. Do not restyle product screens in this task beyond what the primitive needs.
- [x] T005 Compact the authenticated left sidebar to project names plus a create `+` (or equivalent accessible control). Move create-project into a Dialog using existing `POST /api/projects` fields and `credentials: 'include'`. Remove the always-visible sidebar create form. Keep owner-only default-excludes-archived listing and selected-project indication. After success, refresh the list and stay on the current destination (Q-040). Profile still shows this sidebar. Do not add `includeArchived`. Do not change guest chrome.
- [x] T006 Replace `/projects` empty “Select a project” main with a grid of listed project cards. Each card shows a name-derived color-initials cover (Q-036 / Q-039) and the project name; activating a card navigates to `/projects/:projectId`. Empty owner list shows an empty grid/empty state, not the old select-or-create placeholder, while the sidebar `+` remains the create control. Reuse `GET /api/projects` (no new API). Do not persist `coverColor`. Do not hide the sidebar.
- [x] T007 Compact project-detail chrome: project name, short description, edit action, archive/unarchive actions. Remove the always-visible update form and the always-visible “Back to projects” control (app name already goes to `/projects`). Open project update in a Dialog via existing `PATCH`. Keep archived detail URL behavior. Do not add dashboard counts. Do not add a new destination. *(Original pass only. Polish T017 restores Back to projects.)*
- [x] T008 Refine the board: compact status/priority filters above the board; columns remain the only task layout and use the remaining main height; task cards show title, existing priority, and due date when present; remove the always-visible add-task form; board-header `+` opens create-task Dialog (omit `status` unless chosen → API default `TODO`); column-bottom `+` opens the same Dialog with that column’s `status` pre-filled; `TaskDetail` opens in a Dialog so columns stay visible; keep create/update/soft-delete/archived `409` and Q-034/Q-035 DnD (`@dnd-kit/core` only). Do not add `@dnd-kit/sortable`, rank, or nested task URLs.
- [x] T009 Add/update frontend tests for AC-001–AC-017: grid vs empty-main, covers without persisted color, compact sidebar + create modal, compact header without Back, edit modal, archive/unarchive from chrome, compact filters, remaining-height columns still present, header/column `+` create (including `IN_PROGRESS` pre-fill), task-detail modal with board still in the document, card priority/due date, credentials, no token storage, no Trello branding, Dialog allowed in deps. Rewrite tests that currently require “Select a project” / choose-from-sidebar empty main, always-visible create/edit/add-task forms, or always-visible “Back to projects”. Keep DnD and guest/chrome asserts from 005/006 except where this spec supersedes them. *(Original pass only. Polish T022 rewrites Back and localStorage asserts.)*

### Phase 4 — Verification (original 007 pass)

- [x] T010 Run `frontend` `npm run typecheck` and `npm test`. Run backend checks only if T003 changed backend tests (expected: no). Report actual results. Do not run `prisma migrate reset` or delete Docker volumes. Do not claim checks passed without running them.
- [x] T011 Verify acceptance criteria AC-001–AC-019 against the spec. Record any unmet criterion. Confirm no migration, no `coverColor`, no `005-audit` folder, and `@dnd-kit/core` without `@dnd-kit/sortable`.
- [x] T012 Obtain independent review and resolve blocking findings with a new implementation pass if needed. Do not treat implementer claims as proof.
- [x] T013 Update `memory.md` (and only docs that changed) from verified state. Record Q-036–Q-038 as decided and Q-039–Q-040 as applied recommendations. Keep Q-006, Q-007, Q-009, Q-015, and Q-017 deferred. Keep dashboard, collaboration, and audit marked unimplemented. Do not write `005-audit` artifacts. Do not mark tasks complete without evidence.

### Phase 5 — Preparation (polish batch)

- [x] T014 Inspect the current original-007 implementation for this polish only: `ProjectDetail` header actions (Edit/Archive, no Back), DevTrack `Link` to `/projects`, `ProjectsHome` `sm:grid-cols-2 xl:grid-cols-3`, `KanbanBoard` `grid-cols-3` stretch and `opacity-50` drag (no `DragOverlay`), task-card cursor, `index.css` single `:root` tokens, `GuestLayout`, tests that forbid Back to projects, and tests that assert `localStorage.length === 0`. Record files to extend. Do not change code in this task.
- [x] T015 Confirm `spec.md`, `plan.md`, and `tasks.md` are Approved for this polish. Reconfirm: amend 007 in place (no `specs/008-*`); restore Back to projects next to Edit/Archive; keep DevTrack → `/projects`; compact ~14–18rem project cards (Q-044); whole-UI palettes from the Q-041 catalog in localStorage only under `devtrack.uiPalette` (no profile API/schema/migration); selector on authenticated top bar; apply on document root; guests stored-or-Forest; do not clear on logout (Q-042); narrower ~16–20rem Kanban columns, left-aligned (Q-044); task pointer cursor + `@dnd-kit/core` DragOverlay/transform; Q-034 status-only; no `@dnd-kit/sortable` (Q-043); destinations, cookie auth, Dialogs, compact sidebar, card grid, no `coverColor`, no dashboard aggregates, no members, no audit ID `005`; Q-006/007/009/015/017 deferred. Stop if artifacts are Draft.

### Phase 6 — Backend (polish batch; confirm no change)

- [x] T016 Confirm existing project, task, and profile HTTP contracts already cover this polish and that palette persistence does not need an API or Prisma field. Confirm Prisma `Project`/`Task`/`User` have no cover/rank/image/palette fields. Do not add endpoints, a theme module, a generic repository, or a migration. Do not `migrate reset` or delete volumes.

### Phase 7 — Frontend (polish batch)

- [x] T017 Restore an explicit **Back to projects** control in the compact project-detail header action row next to **Edit project** and **Archive project** (or Unarchive). Prefer a React Router `Link` to `/projects`. Keep the DevTrack application-name link to `/projects`. Do not add a destination. Do not reintroduce always-visible edit forms. Rewrite tests that currently require Back to be absent so they no longer lock the original-007 “no Back” UX.
- [x] T018 Constrain the `/projects` card grid so cards are narrower, Trello-like size (Q-044: about 14–18rem / auto-fill + max-width, left-aligned, not full-main stretch). Keep CSS grid, name-derived covers, visible names, and card navigation. Do not persist `coverColor`. Do not hide the sidebar.
- [x] T019 Reduce Kanban status column width so `TODO` / `IN_PROGRESS` / `DONE` do not stretch as equal thirds of the whole main area (Q-044: about 16–20rem, left-aligned row of three). Keep remaining-height column scrolling, column `+`, compact filters, and Q-034 DnD.
- [x] T020 Give task cards a pointer/hand hover cursor comparable to project cards. Add a proper drag overlay/transform animation using `@dnd-kit/core` `DragOverlay` and/or `useDraggable` `transform`. Keep Q-034 status-only moves and existing sensors/drop tests. Do not add `@dnd-kit/sortable` (Q-043). Do not add a second DnD library. Fading the source card alone is not sufficient.
- [x] T021 Implement user-selectable whole-UI palettes as the documented Q-041 catalog: solids Forest (default), Ocean, Sunset, Violet, Midnight; gradients Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier. Apply via document-root CSS variables (optional gradient tokens on large surfaces). Persist only the catalog id in localStorage under `devtrack.uiPalette` (Q-042). Missing/unknown → Forest. Do not PATCH profile, set a cookie, or migrate. Guest login/register MUST look coherent (stored palette or Forest). Put a compact accessible selector on the authenticated top app bar (native select or buttons; DropdownMenu still not required). Guest-bar selector is not required. Do not add `next-themes` or a second CSS framework. Do not clear the palette on logout.

### Phase 8 — Verification (polish batch)

- [x] T022 Add/update frontend tests for AC-006 (amended), AC-016 guest coherence, and AC-020–AC-026: Back to projects present and navigates to `/projects`; DevTrack still → `/projects`; compact ~14–18rem card grid; compact ~16–20rem columns; pointer cursor; drag overlay; palette select/persist/default/invalid for the Q-041 catalog and `devtrack.uiPalette`; guest pages themed; logout does not clear the palette key. Rewrite `localStorage.length === 0` asserts so session tokens remain forbidden and `devtrack.uiPalette` is allowed. Keep credentials, no Trello branding, Dialog allowed, no `@dnd-kit/sortable`. Do not treat T009 as covering this polish.
- [x] T023 Run `frontend` `npm run typecheck` and `npm test`. Run backend checks only if T016 changed backend tests (expected: no). Report actual results. Do not run `prisma migrate reset` or delete Docker volumes. Do not claim checks passed without running them.
- [x] T024 Verify acceptance criteria AC-001–AC-026 against the spec, including amended AC-006 and new AC-020–AC-026. Record any unmet criterion. Confirm no migration, no `coverColor`, no User palette field, no `005-audit` folder, no `specs/008-*`, and `@dnd-kit/core` without `@dnd-kit/sortable`.
- [x] T025 Obtain independent review of this polish and resolve blocking findings with a new implementation pass if needed. Do not treat implementer claims as proof. Do not reuse the original 007 review as coverage of T017–T021.
- [x] T026 Update `memory.md` (and only docs that changed) from the **actual** polish state. Record FR-006 / Q-037 Back-to-projects supersession, Q-041–Q-044 as decided, and that T001–T013 remain the original 007 pass. Keep Q-006, Q-007, Q-009, Q-015, and Q-017 deferred. Keep dashboard, collaboration, and audit marked unimplemented. Do not write `005-audit` or `008-*` artifacts. Do **not** mark this polish Verified without T023–T025 evidence and re-approval.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes in the original 007 completion report |
| T002 | T001 | Original artifacts Approved |
| T003 | T002 | No new endpoint/schema; existing contracts sufficient |
| T004 | T002 | Dialog primitive present; deps test allowlist updated |
| T005 | T004 | Compact sidebar; create modal; no always-on sidebar form |
| T006 | T005 | `/projects` card grid; derived covers; empty-main tests rewritten |
| T007 | T004 | Original compact header; edit modal; Back removed in that pass |
| T008 | T004, T007 | Filters, remaining-height board, add-task/detail modals, card metadata, DnD kept |
| T009 | T005, T006, T007, T008 | Frontend tests match original 007 UX |
| T010 | T009 | Executed typecheck and test commands (original pass) |
| T011 | T010 | Original AC-001–AC-019 evidence |
| T012 | T011 | Original reviewer verdict |
| T013 | T012 | `memory.md` matched original verified repo |
| T014 | T013 | Polish inspection notes; no code change |
| T015 | T014 | Artifacts Approved for polish; Draft means stop |
| T016 | T015 | No new endpoint/schema/profile field |
| T017 | T015 | Back to projects next to Edit/Archive; DevTrack still → `/projects` |
| T018 | T015 | Constrained Trello-like card grid |
| T019 | T015 | Compact Kanban columns; remaining height kept |
| T020 | T015 | Pointer cursor; DragOverlay/transform; no `@dnd-kit/sortable` |
| T021 | T015 | Palettes + localStorage + guest default; no profile API |
| T022 | T017, T018, T019, T020, T021 | Frontend tests match polish ACs |
| T023 | T022 | Executed typecheck and test commands |
| T024 | T023 | AC-001–AC-026 evidence for polish |
| T025 | T024 | New reviewer verdict for polish |
| T026 | T025 | `memory.md` matches actual polish state; not marked Verified without evidence |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001, AC-002, AC-003 | T006, T009 (original); T018, T022 (polish size) | Grid/empty/navigation tests |
| AC-004 | T006, T009, T011 | Cover tests; inspect DTOs/Prisma |
| AC-005 | T005, T009 | Sidebar + create-modal tests |
| AC-006, AC-007, AC-008, AC-020 | T017, T022 (AC-006 amended; original T007 removed Back) | Header/Back/edit/archive tests |
| AC-009, AC-010 | T008, T009; T019 keeps height | Filter + column layout tests |
| AC-011, AC-012 | T008, T009 | Header/column create-task tests |
| AC-013, AC-014 | T008, T009 | Detail-modal + card metadata tests |
| AC-015, AC-019 | T003, T008, T016, T024 | Inspect contracts; DnD tests remain |
| AC-016 | T005, T009, T021, T022 | Guest/profile/chrome + palette coherence |
| AC-017 | T004, T009 | Deps/UI file allowlist |
| AC-018 | T010 (original); T023 (polish) | Executed typecheck and tests |
| AC-021 | T018, T022 | Compact card-grid tests |
| AC-022, AC-023 | T021, T022 | Palette + localStorage tests |
| AC-024 | T019, T022 | Compact column tests |
| AC-025, AC-026 | T020, T022 | Cursor + overlay tests |

## Completion report

### Original 007 pass (T001–T013) — historically complete; not this polish

- Completed tasks: T001–T013
- Tests executed: frontend `npm run typecheck` (Node 22.13.0); frontend `npm test` (Node 22.13.0). Re-run after the AC-010 shell-height fix with the same commands on Node 22.13.0. No backend changes. No `prisma migrate reset`. No volume delete. No migrations.
- Actual results: typecheck passed with no errors; `vitest run` 14 files / 118 tests passed (including after the shell-height fix)
- Independent review: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. That review does **not** cover T014–T026.
- Remaining-height follow-up: Medium finding that `AuthenticatedLayout` `min-h-screen` allowed a tall board to grow the page was then fixed to `h-svh overflow-hidden` so column `overflow-y-auto` is the overflow path (coordinator follow-up implementer). Typecheck re-ran exit 0; `npm test` 14 files / 118 tests passed (Node 22.13.0).
- Low (non-blocking): sidebar/grid still pathname-or-create-epoch keyed (`reloadKey={`${location.pathname}:${projectListEpoch}`}`); archive/rename can linger until navigation.
- Informational: Dialog CSS animate classes unused (no `tailwindcss-animate`); dismiss still works. Radix Dialog marks the board `aria-hidden` while task detail is open; columns stay mounted and visually behind the overlay.
- Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): `/projects` shows compact sidebar + card grid with SB cover (not Select a project); board has compact header Edit/Archive, no always-on forms, no Back to projects; Edit opens dialog; Add task opens dialog without status field; task click opens Task detail dialog with board behind; column + Add buttons present.
- Known issues: Dialog animate classes unused; sidebar/grid pathname-or-create-epoch linger on archive/rename; Radix `aria-hidden` on board while task modal open. Q-006, Q-007, Q-009, Q-015, Q-017 remain deferred. Dashboard, collaboration, and audit remain unimplemented. Later audit MUST NOT use ID `005`. `specs/005-audit/` was not created. No `coverColor` / `position` / `rank` field. `@dnd-kit/sortable` not added.
- Memory updated: yes (T013) for the original pass. T026 replaced that memory with the verified polish state.

### Polish batch (T014–T026) — Verified

- Completed tasks: T014–T026
- Tests executed: frontend `npm run typecheck` (Node 22.13.0); frontend `npm test` (Node 22.13.0). Coordinator independently re-ran the same commands on Node 22.13.0 after T025. No backend changes. No `prisma migrate reset`. No volume delete. No migrations.
- Actual results: typecheck passed with no errors; `vitest run` 16 files / 133 tests passed (implementer T023 and coordinator re-run)
- T014 inspection: `ProjectDetail` had Edit/Archive only; DevTrack already linked to `/projects`; `ProjectsHome` used stretching `sm:grid-cols-2 xl:grid-cols-3`; `KanbanBoard` used `grid-cols-3` and `opacity-50` with no `DragOverlay`; `index.css` still a single `:root` token set (T021); tests forbade Back; many tests used `localStorage.length === 0` (T022)
- T015: `spec.md` / `plan.md` / `tasks.md` were Approved for polish; Q-041–Q-044 decided; no `specs/008-*`
- T016: Prisma `User` / `Project` / `Task` and public DTOs have no cover/rank/image/palette fields; no API or schema change
- T017–T020: Back `Link` to `/projects` next to Edit/Archive; compact auto-fill 14–18rem card grid; 16–20rem left-aligned Kanban columns; task `cursor-pointer` + `@dnd-kit/core` `DragOverlay`; `@dnd-kit/sortable` not added
- T021: Q-041 catalog on `data-palette` document root; CSS variables plus gradient tokens on page/bar/sidebar/board; authenticated native select (`Color palette`); localStorage key `devtrack.uiPalette` only; missing/unknown → Forest; guests inherit stored-or-Forest; logout does not clear the key; no profile PATCH, cookie, or migration; no `next-themes`
- T022: AC-006/AC-016/AC-020–AC-026 coverage added; `localStorage.length === 0` rewritten to `expectNoSessionTokenStorage()` (session tokens forbidden; `devtrack.uiPalette` allowed)
- T023: typecheck exit 0; 16 files / 133 tests passed (Node 22.13.0)
- T024: AC-001–AC-026 met by tests plus inspection. No `coverColor`, no User palette field, no new migration, no `specs/005-audit/`, no `specs/008-*`, `@dnd-kit/sortable` absent
- T025 independent review: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Informational: live contrast not audited in review; AC-018 not re-executed by reviewer. Low: some project-cover slots retint with the theme tokens (still name-derived, no stored coverColor). Original 007 review was not reused as polish coverage.
- Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): `/projects` card grid + Color palette select (Forest default, switched to Aurora gradient); board shows Back to projects next to Edit/Archive; narrower left-aligned columns; Back navigates to `/projects`; palette remains Aurora.
- Known issues: live contrast not audited in T025; AC-018 not re-executed by reviewer (coordinator re-ran typecheck/tests); some project-cover slots retint with theme tokens (still name-derived, no stored coverColor). Q-006, Q-007, Q-009, Q-015, Q-017 remain deferred. Dashboard, collaboration, and audit remain unimplemented. Later audit MUST NOT use ID `005`. `specs/005-audit/` and `specs/008-*` were not created.
- Reviewer findings: polish T025 non-blocking only (informational contrast/AC-018; low cover retint)
- Memory updated: yes (T026) from this polish state, including FR-006 / Q-037 Back supersession and Q-041–Q-044
- Remaining work: none for 007. Do not start dashboard, collaboration, or audit without approved artifacts.
