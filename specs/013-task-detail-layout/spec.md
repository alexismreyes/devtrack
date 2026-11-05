# Feature Specification: Task Detail Layout

- **ID:** 013-task-detail-layout
- **Status:** Verified
- **Created:** 2026-11-05
- **Related features:** 007-workspace-ui through 012-task-labels (Verified); visual amend of TaskDetail before checklists (**F**); reference `templates/card.png`

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product questions **Q-094–Q-101** in section 15 are **Decided** (answers recorded below). Implementation may proceed on T001–T012 only. Do **not** implement checklists (**F**), attachments, assignees, covers, or app-wide audit (**C**). Do not write `specs/005-audit/`. Do not change `constitution.md`. Frontend-focused: reuse Verified comments, activity, label assignment (`PUT` replace-set), and catalog CRUD contracts; **no** schema/migration unless unavoidable (none expected). New documented peer dependency allowed for this feature: shadcn Popover + `@radix-ui/react-popover` (Q-101). Keep Verified authz and public HTTP contracts intact.

## 1. Problem

Verified TaskDetail is a single stacked column inside a Dialog: nested Card chrome, inline label checkboxes with an explicit Save labels button, separate Comments and Activity sections, and dense field chrome. That layout does not match the Trello-like card composition in `templates/card.png` (main column + right “Comments & activity”, Labels action opening a search/checkbox/edit/create popover, assigned chips on the card body).

Collaborators already have working APIs for comments, activity, labels, and catalog CRUD. They need a clearer TaskDetail composition before checklists (**F**) are specified.

## 2. Goals

- Restructure TaskDetail (still hosted in the existing project-detail Dialog) into a **two-column card layout** from `md` breakpoint up, stacking **main then side** below `md` (Q-098).
- Put **assigned label chips** on the left/main column; open assignment via a **Labels** action that reveals a **popover** with search, checkboxes, edit affordance, and create-new-label (Q-094, Q-095, Q-097).
- Persist label assignment with the existing `PUT /api/tasks/:taskId/labels` replace-set when the Labels popover **closes** via outside click or Done/close control (if any), with local optimistic checkbox UI while open (Q-094, Q-099). **Escape discards** uncommitted toggles. Prefer **apply-on-close** for non-Escape dismissals because there is no Save labels button.
- Keep **board-header Labels Dialog** for catalog CRUD **and** expose catalog create/edit inside the TaskDetail Labels popover (Q-095).
- Merge the right column into one panel **“Comments & activity”**: comment compose on top; live comments and activity **interleaved by time, newest-first**, omitting `COMMENT_ADDED` activity rows to avoid duplicates with live comments (Q-096, Q-100).
- Action row for this feature: **Labels only** — no fake Dates / Checklist / Attachment placeholders (Q-097).
- Reduce stacked visual saturation (nested Card-in-Dialog density) while keeping DevTrack identity (not Trello branding).
- Reuse existing APIs and authz; no new domain; no Prisma migration expected; no constitution change; leave **F** out of scope.

## 3. Non-Goals

- Checklists / sub-items (`proposed-features.md` **F**) — do not implement UI or API.
- Attachments, covers, watchers, members-on-card assignees UI, invite flows.
- Fake or disabled Dates / Checklist / Attachment action buttons in the action row.
- Changing Verified public HTTP contracts for comments, activity, labels catalog, or label assignment (paths, DTOs, status codes, authz).
- Emitting activity events for label changes (still Q-089).
- New backend domain, generic repository, microservices, or Prisma schema/migration (unless a blocker is discovered and re-approved).
- npm dependencies beyond the Decided Q-101 Popover peer (`@radix-ui/react-popover` + copied shadcn `popover`).
- Dashboard, Members Dialog, Kanban DnD, board filter, or card-face label chip behavior beyond what TaskDetail layout needs.
- Changing `constitution.md`. App-wide audit (**C**); do not write `specs/005-audit/`.
- Colorblind-mode toggle from the reference image (out of scope).
- Spanish copy from the reference; product UI remains English unless a later decision says otherwise.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR viewing a task, I want a Trello-like TaskDetail layout with main fields and a right “Comments & activity” panel, so that reading and commenting feel organized without leaving the board Dialog.

### User Story US-002

As an OWNER or EDITOR, I want a Labels action that opens a searchable checkbox popover and applies my selection when it closes, so that I can assign labels without a separate Save labels button.

### User Story US-003

As an OWNER or EDITOR, I want to create or edit catalog labels from the TaskDetail Labels popover while still using the board-header Labels Dialog, so that catalog management matches both surfaces.

### User Story US-004

As a VIEWER (or any task reader), I want to see assigned chips, read the interleaved comments/activity panel, and open Labels in a read-only fashion where mutations are disabled, so that frontend hiding is not treated as authorization.

### User Story US-005

As a developer, I want this feature to reuse Verified `tasks` APIs and stay frontend-scoped, so that comments, activity, and labels contracts and authz remain intact before checklists (**F**).

## 5. Functional Requirements

- **FR-001:** TaskDetail MUST remain inside the existing project-detail task Dialog (board stays mounted). The Dialog content MUST present a **card-like** TaskDetail composition modeled on `templates/card.png` without copying Trello branding or Spanish strings.
- **FR-002:** From viewport **`md` and up**, TaskDetail MUST use **two columns**: main (title, action row, assigned label chips, description and existing editable fields) and side (**Comments & activity**). Below `md`, columns MUST **stack main then side** (Q-098).
- **FR-003:** The action row MUST include **Labels** only for this feature. MUST NOT add placeholder Dates, Checklist, or Attachment actions (Q-097). Existing due date / status / priority fields MAY remain as main-column editors (not action-row placeholders).
- **FR-004:** Assigned labels MUST remain visible as chips on the main column (reuse `LabelChips` or equivalent). Empty assignment MUST show a clear empty state (no chips), not invent placeholders.
- **FR-005:** Activating Labels MUST open a shadcn/Radix Popover (Q-101) containing: search filter over the project catalog, a checkbox list of labels, an edit affordance per label for writers, and a create-new-label affordance for writers (Q-095). VIEWER / non-writers MUST see the catalog without mutation controls.
- **FR-006:** While the Labels popover is open, checkbox toggles MAY update **local optimistic** selection only. Closing via outside click or Done/close control (if any) MUST trigger a single `PUT /api/tasks/:taskId/labels` replace-set with the selected ids when the actor can write and the selection differs from the last persisted set (Q-094, Q-099). **Escape** MUST discard uncommitted toggles and restore the last persisted selection without PUT. There MUST NOT be a separate “Save labels” button in TaskDetail for this flow.
- **FR-007:** Catalog create and edit MUST be available in the TaskDetail Labels popover **and** the existing board-header Labels Dialog MUST remain for catalog CRUD (Q-095). Delete MAY remain in the board-header Dialog only unless already exposed in-popover without expanding scope; create + edit in-popover are required. Catalog mutations MUST reuse existing project label APIs and authz.
- **FR-008:** The right column MUST be one panel titled **“Comments & activity”** (or equivalent accessible heading). Comment compose MUST sit at the top of that panel. Below compose, live comments and non-`COMMENT_ADDED` activity events MUST render as one timeline **interleaved by `createdAt`, newest-first** (Q-096, Q-100). `COMMENT_ADDED` activity rows MUST be omitted to avoid duplicates with live comments. Loading / empty / error states MUST remain understandable for both sources.
- **FR-009:** Comment create/edit/soft-delete rules MUST stay as Verified `010-task-comments` (author edit; author or effective OWNER soft-delete; plain text; archived write rules). Activity remains read-only as Verified `011-task-activity`.
- **FR-010:** Visual chrome MUST reduce stacked saturation versus the current nested Card-inside-Dialog density (e.g. flatten redundant Card wrapper or equivalent), while remaining usable with existing whole-UI palettes. Labels floating panel MUST use copied shadcn Popover + `@radix-ui/react-popover` (Q-101). MUST NOT introduce a second CSS framework or Trello branding.
- **FR-011:** Frontend MUST call existing APIs with `credentials: 'include'`. MUST NOT store a bearer token in JS. Backend resource-level authz remains authoritative; UI disablement is not authorization.
- **FR-012:** This feature MUST NOT change Verified public HTTP contracts for comments, activity, labels catalog, or assignment. MUST NOT add Prisma schema/migrations unless a later Approved amendment requires it. MUST NOT implement checklists (**F**) or app-wide audit (**C**). MUST NOT change `constitution.md`.
- **FR-013:** Critical layout and Labels popover behaviors MUST be covered by frontend tests (Testing Library). No backend test expansion is required unless a contract accidentally changes (regression only).
- **FR-014:** Existing task field save/delete (title, description, due date, status, priority) MUST remain available to writers in the main column; soft-delete task MUST remain available where Verified UI already allows it. Archived / VIEWER write disablement MUST continue to match Verified rules.

### Permission mapping (unchanged; UI must respect)

| Operation | Authorization |
| --- | --- |
| Read task, comments, activity, label chips, catalog list | Task read |
| Assign labels (`PUT` replace-set) | Task write |
| Catalog create/update/(delete) | Task write |
| Create comment | Task write |
| Edit comment | Author only |
| Soft-delete comment | Author or effective OWNER |
| Archived parent mutations | Same as Verified (`ownerUserId` → 409; other members → 403) |

## 6. Acceptance Criteria

### Scenario AC-001: Two-column layout at md+

- Given an authenticated member opens TaskDetail on a viewport at `md` or wider
- When the task finishes loading successfully
- Then the main column (title / Labels action / chips / fields) and the “Comments & activity” side column are presented side by side

### Scenario AC-002: Stacked layout below md

- Given TaskDetail is open below the `md` breakpoint
- When the task finishes loading successfully
- Then the main column appears first and the “Comments & activity” panel appears below it

### Scenario AC-003: Labels action only

- Given TaskDetail is open
- When the action row is inspected
- Then a Labels control is present
- Then Dates, Checklist, and Attachment action placeholders are absent

### Scenario AC-004: Assigned chips on main column

- Given a task with one or more assigned labels
- When TaskDetail loads successfully
- Then those labels appear as chips on the main column without requiring the Labels popover to be open

### Scenario AC-005: Labels popover contents

- Given an OWNER or EDITOR opens the Labels popover
- When the catalog has loaded
- Then they can search/filter labels, toggle checkboxes, use an edit affordance, and create a new label
- Then VIEWER (or non-writer) opening Labels sees the catalog without mutation controls

### Scenario AC-006: Apply assignment on popover close

- Given an OWNER or EDITOR changes checkbox selection in the open Labels popover
- When the popover closes via outside click or Done/close control (if any) (Q-099)
- Then the client issues `PUT /api/tasks/:taskId/labels` with the selected `labelIds` when the set changed
- Then chips and task state reflect the persisted result (or show an error without silently claiming success)
- When the writer presses Escape instead
- Then uncommitted toggles are discarded, the last persisted selection is restored, and no apply PUT is issued for that discard

### Scenario AC-007: Optimistic toggles while open

- Given the Labels popover is open
- When the writer toggles checkboxes
- Then the UI reflects the selection immediately without requiring a per-toggle PUT
- Then a per-toggle PUT MUST NOT be required for correctness of this feature

### Scenario AC-008: Catalog parity surfaces

- Given an OWNER or EDITOR
- When they manage labels
- Then catalog create/edit is available from the TaskDetail Labels popover
- Then the board-header Labels Dialog remains available for catalog CRUD

### Scenario AC-009: Comments & activity panel

- Given TaskDetail loaded with comments and activity
- When the side panel is shown
- Then its heading identifies Comments & activity
- Then comment compose appears at the top (for writers; VIEWER sees compose disabled or hidden consistently with Verified comments UI rules)
- Then live comments and non-`COMMENT_ADDED` activity entries appear in one list ordered by `createdAt` newest-first
- Then `COMMENT_ADDED` activity rows are omitted (Q-100)

### Scenario AC-010: Contracts and non-goals held

- Given this feature is implemented
- When public API contracts and product scope are reviewed
- Then comments, activity, and labels HTTP contracts are unchanged
- Then no checklist/attachment/assignee/dates-action UI from Non-Goals is present
- Then no Prisma migration was added for this feature (unless a separately Approved amendment exists)
- Then `constitution.md` is unchanged

### Scenario AC-011: Reduced stacked saturation

- Given TaskDetail is open inside the existing Dialog
- When the visual structure is compared to the pre-amend nested Card stack
- Then redundant nested Card chrome is reduced or removed so the dialog content reads as one card composition rather than Card-in-Card saturation

### Scenario AC-012: Authz and archived behavior preserved

- Given VIEWER, archived project, or 401/403/409 responses from existing APIs
- When the user interacts with Labels, comments, or task fields
- Then UI disablement and error surfaces continue to match Verified rules; backend remains authoritative

## 7. Business Rules

- Label assignment remains replace-set semantics owned by `tasks` — owning domain: `tasks`.
- Comments and activity rules remain as Verified `010` / `011` — owning domain: `tasks`.
- Apply-on-close for Labels popover selection on outside click / Done/close; Escape discards (Q-094, Q-099).
- Interleave timeline newest-first; omit `COMMENT_ADDED` activity rows (Q-096, Q-100).
- No checklists (**F**) in this feature.

## 8. Data

No new persisted business concepts. Reuse existing task, comment, activity, project label catalog, and task↔label assignment data. No new uniqueness, lifecycle, or deletion rules.

## 9. API and Integrations

Reuse only (no contract changes expected):

- `GET` / `PATCH` / `DELETE` task
- `GET` / `POST` / `PATCH` / `DELETE` task comments
- `GET` task activity
- `GET` / `POST` / `PATCH` / `DELETE` project labels
- `PUT` task labels replace-set `{ labelIds }`

HTTP schemas stay as Verified; details remain in those feature plans.

## 10. Security

- Session cookie `devtrack_session`; `credentials: 'include'`.
- Authentication distinct from authorization; resource checks stay on the backend.
- Frontend MUST NOT treat hidden controls as authz.
- Responses MUST NOT surface secrets or stack traces (unchanged envelope).

## 11. Non-Functional

- Layout usable on desktop and narrow viewports (md split / below-md stack).
- Labels popover must be keyboard-dismissible (Escape discards per Q-099) and not trap focus incorrectly relative to the parent Dialog (shadcn/Radix Popover per Q-101).
- Educational clarity: prefer existing patterns over new abstraction layers.
- No invented numeric performance targets.

## 12. Dependencies

- Existing features: `007-workspace-ui`, `009-collaboration`, `010-task-comments`, `011-task-activity`, `012-task-labels` (Verified).
- Architectural constraints: modular monolith; `tasks` owns comments/activity/labels; frontend under `frontend/`; SDD Draft → Approve before implement.
- External dependencies: new documented peer `@radix-ui/react-popover` plus copied shadcn `popover` primitive (Q-101 Option 2).
- Visual reference: `templates/card.png` (composition guide, not a pixel-perfect or branded clone).

## 13. Failures and Edge Cases

- Label PUT fails on close → show error; do not claim chips persisted; allow retry by reopening/closing or equivalent clear recovery.
- Catalog empty → popover shows empty + create (writers).
- Comments load fails but activity succeeds (or inverse) → panel shows partial timeline plus error for the failed source without blanking the whole TaskDetail.
- Unchanged selection on close → MUST NOT require a no-op PUT (MAY skip the request).
- Closing while a catalog create/edit subflow is mid-save → do not lose in-flight error reporting; prefer blocking dismiss or completing the mutation first (document in plan).
- Soft-deleted / missing task → existing not-found handling.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001, FR-002, FR-010 | AC-001, AC-002, AC-011 | Frontend layout tests / inspection |
| FR-003 | AC-003 | Frontend test |
| FR-004 | AC-004 | Frontend test |
| FR-005, FR-007 | AC-005, AC-008 | Frontend tests |
| FR-006 | AC-006, AC-007 | Frontend tests + client PUT assertion |
| FR-008, FR-009 | AC-009 | Frontend tests |
| FR-011, FR-012, FR-014 | AC-010, AC-012 | Contract non-regression + UI authz tests |
| FR-013 | AC-001–AC-012 | Vitest / Testing Library |

## 15. Open Questions

### Decided

- **Q-094:** Labels assign persistence timing. Owner: product + frontend. Status: **Decided** (option **2**). Checkbox assign batches/persists when the Labels popover closes (not each toggle). Local optimistic UI while open is OK; closing triggers replace-set PUT with selected ids. Prefer apply-on-close because there is no Save button. Escape/outside-click nuance → Q-099.
- **Q-095:** Catalog CRUD surfaces. Owner: product + frontend. Status: **Decided** (option **2**). Catalog create/edit available in TaskDetail Labels popover **and** keep board-header Labels Dialog for catalog CRUD.
- **Q-096:** Right column composition. Owner: product + frontend. Status: **Decided** (option **1**). One panel “Comments & activity”; comment compose on top; comments + activity interleaved by time newest-first (duplication rule → Q-100).
- **Q-097:** Action row scope. Owner: product + frontend. Status: **Decided** (option **1**). Action row only Labels for now; no fake Dates/Checklist/Attachment placeholders.
- **Q-098:** Responsive columns. Owner: product + frontend. Status: **Decided** (option **1**). Two columns from `md+`; stack main then side below `md`.
- **Q-099:** Apply-on-close vs discard for specific dismiss gestures. Owner: product + frontend. Status: **Decided** (option **2**). Outside click and Done/close control (if any) **apply** the checked set via replace-set PUT when changed and writable. **Escape discards** uncommitted toggles and restores the last persisted selection (no apply PUT for that discard).
- **Q-100:** Interleaved timeline vs `COMMENT_ADDED` activity duplication. Owner: product + frontend. Status: **Decided** (option **1**). Right panel shows live comments + activity interleaved by time; omit `COMMENT_ADDED` activity rows to avoid duplicates with live comments.
- **Q-101:** Labels floating panel primitive. Owner: frontend. Status: **Decided** (option **2**). Use copied shadcn Popover + `@radix-ui/react-popover` as an explicit documented peer dependency for this feature.

### Open (material)

None. Q-094–Q-101 are Decided.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-094–Q-101 Decided; Q-100 confirmed omit `COMMENT_ADDED`)
- Approved for planning: Yes
- Approved for implementation: Yes
