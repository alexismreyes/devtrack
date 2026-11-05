# Feature Specification: UI Refinements

- **ID:** 016-ui-refinements
- **Status:** Verified
- **Created:** 2026-11-05
- **Related features:** 015-task-checklists (Verified in repo; catalog may still be unapplied); 014-task-detail-polish, 013-task-detail-layout, 012-task-labels, 007-workspace-ui (Verified); deferred **G** attachments / covers; later **C** app-wide audit

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Material product questions **Q-125–Q-129** in section 15 are **Decided**. Implementation may proceed on T001–T014 only. Do **not** reopen Verified `015-task-checklists` (or earlier Verified folders) as Draft for this polish. Do **not** implement attachments (**G**), checklist-item assign/due, hide-checked, Markdown description redesign, or app-wide audit (**C**). Do not write `specs/005-audit/`. Do not change `constitution.md`.

**Decided scope:** This folder covers **frontend polish** for checklist create UX (Dialog; remove inline primary create), checklist block contrast (`bg-card` + border), TaskDetail field-label typography, the app-bar Color palette selector (items 1–4), and **friendly presentation of the fixed `TaskStatus` enum** (`To do` / `In progress` / `Done` on TaskDetail status control + Kanban column headers only). **User-defined custom statuses** are deferred to a **separate** future feature folder — do **not** invent persistence, authz, Kanban, or dashboard rules here.

## 1. Problem

After Verified task checklists (`015`) and prior TaskDetail polish, several UX gaps remain before attachments (**G**):

1. Adding a checklist still uses an **inline create form** in the main column; the action-row **Checklist** button only focuses that form. Users want a dedicated create surface (modal / Labels-like affordance) while checklists continue to render stacked in the TaskDetail main column.
2. Checklist blocks do not visually contrast enough against the TaskDetail Dialog surface.
3. TaskDetail form field labels (`Task title`, `Task description`, etc.) read too large/heavy relative to the values.
4. The app-bar **Color palette** control is a native `<select>` whose option text is often unreadable (light/white text on similar option backgrounds). Users want a **circle + color-scheme preview** picker (analogous to the Labels color swatch picker), still backed by localStorage `devtrack.uiPalette` — not task Labels.
5. Status words `TODO` / `IN_PROGRESS` / `DONE` feel simplistic; users want friendlier presentation **and** the ability to add more statuses. Custom statuses collide with the fixed Prisma/`TaskStatus` enum, Kanban three-column contract, dashboard pending/completed definitions, and activity payloads — that is a large product change, not polish.

## 2. Goals

- Open a **Dialog** create-checklist surface from the existing action-row **Checklist** button; remove the inline primary create form; keep checklist lists stacked in the TaskDetail main column; reuse Verified checklist APIs and authz (Q-126 = Dialog).
- Give each rendered checklist block a contrasting `bg-card` + border surface vs the TaskDetail Dialog (Q-129).
- Make TaskDetail form field labels smaller/thinner so values dominate.
- Replace the app-bar Color palette native select with a readable circle + palette-preview picker for the existing Q-041 catalog; persist only `devtrack.uiPalette` in localStorage (no profile API / Prisma field).
- Include fixed-enum friendly presentation in 016 (`To do` / `In progress` / `Done` on TaskDetail status control + Kanban column headers); defer true custom statuses to a separate future feature (Q-125 = 1+3) — **do not invent** custom-status rules.
- Stay inside frontend polish; no schema/migration; no `constitution.md` change; leave **G** / **C** / hide-checked / item assign/due / Markdown redesign out.

## 3. Non-Goals

- Attachments, card covers, file storage (`proposed-features.md` **G**).
- Checklist-item assignees, checklist-item due dates, hide-checked toggles, Markdown description redesign.
- App-wide CRUD audit (**C**); do not write `specs/005-audit/`.
- Reopening Verified `015-task-checklists` (or 013/014) as Draft for polish that belongs here.
- Changing Verified public HTTP contracts for checklists, comments, activity, labels, tasks, or dashboard **as part of polish items 1–4**.
- Inventing custom-status persistence, project- vs user-scoped catalogs, migration strategy, Kanban dynamic columns, dashboard redefinition, or activity payload rules before a dedicated Approved feature (or Decided answers that explicitly authorize a separate folder).
- Expanding the whole-UI palette **catalog** beyond the existing Q-041 ids; no `next-themes`; no profile/cookie/Prisma palette field.
- Changing Labels color tokens or LabelColorSwatchPicker contracts.
- Spanish copy or Trello branding; product UI remains English with DevTrack identity.
- Changing `constitution.md`. New backend domain, generic repository, or microservices.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR on a writable task, I want the Checklist action-row button to open a dedicated create surface (like Labels), so that adding a checklist feels intentional and does not rely on focusing an inline form.

### User Story US-002

As a collaborator viewing TaskDetail, I want each checklist block to sit on a contrasting background, so that checklists are easy to separate from the Dialog chrome and surrounding fields.

### User Story US-003

As a collaborator editing task fields, I want field labels to be smaller and thinner than the values, so that title, description, due date, status, and priority read cleanly.

### User Story US-004

As any user with product chrome, I want the Color palette control to show readable circle + scheme previews for each catalog palette, so that I can pick a theme without unreadable native `<option>` text.

### User Story US-005

As a collaborator, I want status presentation that is friendlier than raw `TODO` / `IN_PROGRESS` / `DONE` strings on TaskDetail and Kanban headers so that board and TaskDetail status UX match product expectations without changing Kanban/dashboard contracts. (True custom statuses remain a separate future feature.)

## 5. Functional Requirements

### Checklist create Dialog (item 1)

- **FR-001:** The existing TaskDetail action-row **Checklist** control MUST open a dedicated create-checklist **Dialog** (Q-126). Writers MAY create a checklist from that Dialog using the Verified create API (`POST` checklist with required `name`). VIEWER and archived disablement MUST match Verified `015`.
- **FR-002:** After successful create, the new checklist MUST appear in the stacked main-column checklist list without requiring TaskDetail close; activity reload behavior for `CHECKLIST_ADDED` MUST remain as Verified `015`.
- **FR-003:** Checklist lists MUST continue to render stacked in the TaskDetail main column (not Kanban columns; not card face). The previous inline “New checklist name” create form in the main column MUST be **removed** (no secondary inline primary create). Item add/edit/delete/check within each block remains in the main column as today.
- **FR-004:** Frontend MUST call existing checklist APIs with `credentials: 'include'`. MUST NOT store a bearer token in JS. Backend resource-level authz remains authoritative.

### Checklist block contrast (item 2)

- **FR-005:** Each rendered checklist block in the main column MUST use `bg-card` with a border (plus padding/radius as needed) so it visibly contrasts with the TaskDetail Dialog content surface across whole-UI palettes (solids and gradients) (Q-129). Contrast MUST NOT rely on illegible text. Do not invent a new palette system.

### TaskDetail field label typography (item 3)

- **FR-006:** Labels for TaskDetail main-column field controls (title, description, due date, status, priority — and any analogous writable field labels in that form) MUST render smaller and thinner/lighter than the field values so values dominate. Readable contrast vs background MUST be preserved. Do not change validation or save payloads.

### Color palette picker (item 4)

- **FR-007:** The app-bar **Color palette** control (`UiPaletteSelector`, `aria-label="Color palette"`) MUST NOT rely on a bare native `<select>` of palette name strings as the primary chooser when that yields unreadable option text.
- **FR-008:** The control MUST present each catalog palette with a **circular (or clearly swatch-like) preview** of that palette’s color scheme plus an accessible name (visible label and/or `aria-label`). Selecting a preview MUST call the existing palette setter and persist only to localStorage key `devtrack.uiPalette` with the existing Q-041 catalog ids. Missing/unknown ids still fall back to Forest. Logout still MUST NOT clear the key. Guests still use stored-or-Forest.
- **FR-009:** MUST NOT add a User/profile palette API, cookie, or Prisma field. MUST NOT expand the catalog ids beyond the existing list unless a separate Approved feature says so. Prefer Popover / Dialog / radiogroup patterns already used in the app (e.g. Labels swatches) over a second CSS framework.

### Status presentation vs custom statuses (item 5)

- **FR-010:** This feature MUST NOT implement user-defined custom statuses, MUST NOT change Prisma `TaskStatus`, MUST NOT change Kanban column count/contracts, and MUST NOT change dashboard pending/completed definitions (Q-125 split).
- **FR-011:** The UI MUST show friendly fixed-enum presentation on the **TaskDetail status control** and **Kanban column headers only** (Q-128): labels `To do` / `In progress` / `Done` (Q-127), with clearer visual treatment (e.g. badge/chip styling) allowed, while still submitting/persisting `TODO` | `IN_PROGRESS` | `DONE`. Raw enum strings MAY remain in tests/API.
- **FR-012:** Custom-status CRUD/schema/API is excluded from this folder; only a short non-goal / pointer to a future folder is required. A stub folder MUST NOT be invented until the user asks to specify it.
- **FR-013:** Critical polish behaviors (create Dialog open/create, checklist `bg-card` contrast structure, field-label typography, palette preview selection + localStorage id, and fixed-enum status presentation) MUST be covered by frontend tests (Testing Library). No backend test expansion unless a contract accidentally changes.

### Permission mapping (unchanged)

| Operation | Authorization |
| --- | --- |
| Open TaskDetail / read checklists | Task read |
| Create checklist / mutate checklist items | Task write |
| Change Color palette | Local UI only (any chrome user; no server authz) |
| Change task status (fixed enum) | Task write (existing) |
| Archived parent mutations | Same as Verified (`ownerUserId` → 409; other members → 403) |

## 6. Acceptance Criteria

### Scenario AC-001: Checklist button opens create Dialog

- Given TaskDetail is open for a writable task
- When the user activates the action-row **Checklist** control
- Then a dedicated create-checklist **Dialog** opens
- Then the user can submit a name and create a checklist via the Verified API
- Then the new checklist appears stacked in the main column

### Scenario AC-002: VIEWER / archived cannot create via Dialog

- Given VIEWER or archived disablement as Verified `015`
- When TaskDetail is shown
- Then the create Dialog cannot perform a successful create (control absent, disabled, or errors match Verified authz)

### Scenario AC-003: Checklists remain stacked in main column

- Given one or more checklists on the task
- When TaskDetail is shown
- Then checklists render stacked in the main column (not on Kanban cards/columns)
- Then the create path is the dedicated Dialog (inline primary create form removed)

### Scenario AC-004: Checklist block contrast

- Given at least one checklist block is rendered
- When viewing TaskDetail across representative palettes
- Then each checklist block uses `bg-card` with a border (assertable via documented class/token / test id structure) against the Dialog surface

### Scenario AC-005: Field labels smaller/thinner

- Given the writable TaskDetail form
- When field labels are shown
- Then labels use smaller/thinner typography than the associated values/controls and remain readable

### Scenario AC-006: Palette preview picker

- Given authenticated (or guest) chrome with Color palette control
- When the user opens the palette picker
- Then each catalog palette is shown with a circular/swatch preview and accessible name
- When the user selects a palette
- Then `document.documentElement.dataset.palette` (or equivalent existing apply path) updates and `localStorage['devtrack.uiPalette']` stores that id
- Then native unreadable `<option>`-only selection is no longer the primary UX

### Scenario AC-007: Palette catalog and persistence unchanged

- Given the existing Q-041 catalog
- When picking palettes
- Then only existing ids are selectable
- Then logout does not clear `devtrack.uiPalette`
- Then missing/unknown stored ids fall back to Forest

### Scenario AC-008: Fixed-enum status presentation

- Given TaskDetail status control and Kanban column headers
- When statuses are shown
- Then product-facing labels are `To do` / `In progress` / `Done` with clearer visual treatment allowed
- Then PATCH/DnD still use `TODO` | `IN_PROGRESS` | `DONE`
- Then card face / filters / create flows / whole-app status string pass are out of 016 scope (Q-128)

### Scenario AC-009: Custom statuses excluded from 016 polish

- Given Q-125 Decided split (1+3)
- When 016 is implemented
- Then no custom-status schema/API/Kanban column generation ships in 016
- Then Prisma `TaskStatus` enum remains the three fixed values

### Scenario AC-010: Non-goals held

- Given this feature folder
- When work is verified
- Then no **G** attachments/covers, no item assign/due, no hide-checked, no Markdown redesign, no **C** audit, no `specs/005-audit/`, no `constitution.md` change, and Verified `015` artifacts remain Verified (not reopened as Draft)

## 7. Business Rules

- Checklist create/list/mutate rules remain owned by **`tasks`** as Verified in `015` — owning domain: `tasks`.
- Whole-UI palette id remains client-only localStorage — no domain ownership on the server.
- Fixed task statuses remain `TODO` | `IN_PROGRESS` | `DONE` until a separate Approved custom-status feature changes that contract — owning domain: `tasks`.
- Dashboard pending = `TODO`+`IN_PROGRESS`; completed = `DONE` remains unless a future Approved feature redefines it — owning domain: `tasks`.
- Do not invent custom-status uniqueness, defaults, reorder, or deletion rules in this folder.

## 8. Data

- Checklists / items: unchanged Verified concepts from `015`.
- UI palette: catalog id string in localStorage `devtrack.uiPalette` only.
- Task status: unchanged fixed enum (`TODO` | `IN_PROGRESS` | `DONE`); display-only friendly labels in UI; custom statuses out of scope (future separate feature).

## 9. API and Integrations

- Reuse Verified checklist nested REST under `/api/tasks/:taskId/checklists` (+ items) and activity reload after emitting creates.
- Reuse Verified `PATCH /api/tasks/:id` `{ status }` for fixed-enum status UI (values unchanged).
- No new endpoints.
- No palette HTTP API.
- Custom-status APIs: not defined here.

## 10. Security

- Session cookie auth unchanged; checklist mutations require task write; reads require task read.
- Palette picker is local UI state only; must not introduce XSS via unsanitized HTML in previews (use CSS tokens / safe class maps from the existing catalog).
- Do not weaken archived / VIEWER rules.

## 11. Non-Functional

- Palette and checklist surfaces MUST remain keyboard-accessible (open, select, dismiss) with visible focus.
- Palette option previews MUST remain readable on light and dark-ish catalog entries.
- Prefer existing Radix Dialog/Popover peers already in the app; justify any new npm dependency in the plan.

## 12. Dependencies

- Existing features: Verified `015` checklists UI/API; `014` LabelColorSwatchPicker pattern; `007`/`UiPaletteProvider` localStorage palette; `013` TaskDetail layout; `006` Kanban fixed columns.
- Architectural constraints: modular monolith; frontend → HTTP only; no generic repository; constitution Articles I–VIII.
- External dependencies: none new expected; optional Popover already present.

## 13. Failures and Edge Cases

- Checklist create 401 → existing unauthenticated handling; 403/409/404 → surface errors without corrupting the list.
- Palette localStorage quota / private mode → keep in-memory apply path as today; do not crash chrome.
- Opening create surface while mutations disabled → controls disabled / non-submittable.
- Empty checklist list → empty state remains; create still available to writers via the dedicated surface.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-004 | AC-001, AC-002, AC-003 | Frontend tests + inspection |
| FR-005 | AC-004 | Frontend test / class token assert |
| FR-006 | AC-005 | Frontend test / class assert |
| FR-007–FR-009 | AC-006, AC-007 | Frontend tests (`UiPaletteSelector` / provider) |
| FR-010–FR-012 | AC-008, AC-009 | Spec decision + tests / schema inspection |
| FR-013 | AC-001–AC-010 | Targeted frontend suite |
| Non-goals | AC-010 | Reviewer / inspection |

## 15. Decided Questions

### Q-125 — Custom statuses vs 016 polish

How should item 5 be scoped relative to this folder?

1. **Split:** `016-ui-refinements` = items 1–4 (+ optional fixed-enum friendly presentation per option 3). Custom user-defined statuses get a **separate** feature folder only when the user asks to specify it. No persistence rules invented now.
2. **Single Draft holding both:** Keep custom statuses described only as Open Questions inside this folder until split/persistence decisions exist; **do not Approve** 016 until either split (option 1) or a fully decided custom-status spec exists. Still do not invent persistence rules.
3. **Fixed-enum friendly presentation only in 016:** Ship eye-candy + user-friendly labels/badges for `TODO` / `IN_PROGRESS` / `DONE` in TaskDetail + Kanban (and optionally other status readouts) with **no** schema/API change; defer true custom statuses entirely.

**Decided:** Options **1 + 3** — split custom statuses to a future feature; include fixed-enum friendly presentation in 016.

**Status:** Decided (owner: user)

### Q-126 — Create-checklist surface shape

What UI pattern should the Checklist button open?

1. **Dialog modal** (board Labels Dialog–like): name field + Create / Cancel.
2. **Popover** (TaskDetail Labels Popover–like): compact anchored surface.
3. Dialog for create only; keep a secondary inline affordance in the panel (not recommended — duplicates paths).

**Decided:** Option **1** — Dialog modal; remove the inline primary create form from `TaskChecklistsPanel`.

**Status:** Decided (owner: user)

### Q-127 — Fixed-enum friendly copy

Exact user-facing labels for the three statuses?

1. `To do` / `In progress` / `Done`
2. `Todo` / `In progress` / `Done`
3. Keep API enums visible in UI

**Decided:** Option **1** — `To do` / `In progress` / `Done`.

**Status:** Decided (owner: user)

### Q-128 — Status visual treatment scope

Where must friendly status chrome appear in 016?

1. TaskDetail status control + Kanban column headers only
2. Also task card face / filters / create flows that show raw enums
3. Whole-app pass of every status string

**Decided:** Option **1** — TaskDetail status control + Kanban column headers only.

**Status:** Decided (owner: user)

### Q-129 — Checklist contrast token

Which surface treatment for checklist blocks?

1. `bg-muted` (or equivalent muted token) + padding/radius
2. `bg-card` with border against Dialog
3. Slightly tinted custom token added to all palettes (heavier; avoid unless needed)

**Decided:** Option **2** — `bg-card` with border against Dialog.

**Status:** Decided (owner: user)

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-125–Q-129 Decided)
- Approved for planning / implementation: Yes
