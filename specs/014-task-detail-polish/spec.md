# Feature Specification: Task Detail Polish

- **ID:** 014-task-detail-polish
- **Status:** Verified
- **Created:** 2026-11-05
- **Related features:** 013-task-detail-layout (Verified); 010-task-comments, 011-task-activity, 012-task-labels (Verified); visual polish of TaskDetail / Labels UI before checklists (**F**); references `templates/card.png`, `templates/tag_modal_issue.png`, `templates/tagcolors.png`

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product questions **Q-102–Q-104** in section 15 are **Decided** (answers recorded below). Implementation may proceed on T001–T013 only. Do **not** reopen Verified `013-task-detail-layout` as Draft (Q-104). Do **not** implement checklists (**F**), attachments, assignees, covers, or app-wide audit (**C**). Do not write `specs/005-audit/`. Do not change `constitution.md`. Frontend-focused polish: reuse Verified comments, activity, and labels contracts; **no** schema/migration; **no** API contract changes expected.

## 1. Problem

Verified `013-task-detail-layout` delivered the two-column TaskDetail, Labels Popover, and interleaved Comments & activity panel, but several UX gaps remain:

- After task Save (and comment create), new activity events do not appear in the right timeline until the Dialog is reopened — field-change status text under the form is not a substitute for the side-panel timeline (`memory.md` known issue from 011).
- Comment Edit / Delete use bulky `Button` spacing instead of compact text links.
- Labels Popover appears translucent / wrong because `PopoverContent` uses `bg-popover` / `text-popover-foreground` while palette CSS never defines `--popover` / `--popover-foreground` (or `@theme` mappings), so the surface fails to paint opaquely across palettes (`templates/tag_modal_issue.png`).
- Label create/edit still uses a native `<select>` for the nine Decided color tokens instead of a swatch grid with a checkmark on the selected token (`templates/tagcolors.png`).

Collaborators need these polish fixes before checklists (**F**) are specified.

## 2. Goals

- After successful **task Save** and after successful **comment create**, reload activity so the right-panel timeline updates live in the open Dialog; for consistency, also reload activity after successful comment **edit** and **delete** (Q-102). Keep the comments list in sync as already done for comment mutations.
- Present comments and non-`COMMENT_ADDED` activity in a readable, Trello-like timeline with clearer spacing so activity is clearly part of the side panel, not only form status text below main fields.
- Replace comment Edit / Delete (and in-edit Cancel when appropriate) bulky outline/destructive buttons with smaller text-link affordances that preserve authz and disabled states.
- Define `--popover` / `--popover-foreground` (and `@theme` `--color-popover` / `--color-popover-foreground` so `bg-popover` / `text-popover-foreground` resolve) across all whole-UI palettes so the Labels Popover surface is opaque and readable.
- Replace color `<select>` with a swatch grid of the existing nine Decided tokens (`RED` `ORANGE` `YELLOW` `GREEN` `TEAL` `BLUE` `PURPLE` `PINK` `GRAY`) with a checkmark on the selected swatch in LabelsPopover create/edit; apply the same picker in board LabelsDialog if it still uses `<select>` (Q-103). No freeform/30-color expansion; no schema change.
- Stay frontend-only; reuse Verified APIs and authz; leave **F** out of scope; leave `constitution.md` unchanged; keep this work in folder `014-task-detail-polish` (Q-104).

## 3. Non-Goals

- Checklists / sub-items (`proposed-features.md` **F**) — do not implement UI or API.
- Attachments, covers, watchers, members-on-card assignees UI, invite flows.
- Fake or disabled Dates / Checklist / Attachment action buttons.
- Changing Verified public HTTP contracts for comments, activity, labels catalog, or label assignment.
- Emitting activity events for label changes (still Q-089) or for comment edit/delete (still 011: no emit).
- Expanding the label color catalog beyond the nine Decided tokens; freeform hex; 30-color grids from third-party references beyond the nine tokens.
- New backend domain, generic repository, microservices, Prisma schema/migration, or npm dependency beyond what is already Verified for 013 (Popover peer already present).
- Reopening or rewriting Verified `013-task-detail-layout` artifacts as Draft (Q-104).
- Changing `constitution.md`. App-wide audit (**C**); do not write `specs/005-audit/`.
- Redesigning the whole TaskDetail two-column shell from 013 beyond timeline spacing / comment actions / Labels color UX / popover opacity.
- Spanish copy or Trello branding from reference images; product UI remains English with DevTrack identity.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR editing a task, I want new activity to appear in the right “Comments & activity” timeline after I Save the task or add a comment, so that I can see field changes and timeline updates without closing the Dialog.

### User Story US-002

As a collaborator reading the side panel, I want comments and activity in a clearly spaced shared timeline, so that the feed is easy to scan like a card activity stream.

### User Story US-003

As a comment author (or OWNER for delete), I want compact Edit / Delete text links, so that comment actions do not dominate the timeline with bulky buttons.

### User Story US-004

As an OWNER or EDITOR opening Labels, I want an opaque Labels popover and a swatch color picker with a checkmark on the selected token, so that catalog create/edit matches the intended Labels UX on both the popover and board Labels Dialog.

### User Story US-005

As a developer, I want this polish scoped to frontend-only `014` without contract or schema changes, so that Verified comments/activity/labels authz and APIs stay intact before checklists (**F**).

## 5. Functional Requirements

- **FR-001:** After a successful **task Save** (`PATCH` task fields) while TaskDetail remains open, the client MUST reload task activity (`GET /api/tasks/:taskId/activity`) and refresh the right-panel timeline (still omitting `COMMENT_ADDED` per Q-100). Form success status text MAY remain but MUST NOT be the only place field-change feedback appears when activity reload succeeds (Q-102).
- **FR-002:** After a successful **comment create**, the client MUST keep the comments list in sync (as today) **and** MUST reload activity so the side timeline stays consistent with the server (Q-102). After successful comment **edit** or **delete**, the client MUST keep comments in sync (as today) and MUST reload activity for consistency even though those mutations do not emit new activity events (Q-102).
- **FR-003:** The right panel MUST continue to show one “Comments & activity” timeline of live comments + non-`COMMENT_ADDED` activity, newest-first. Timeline item spacing and visual separation MUST be clearer / more readable (Trello-like density) than the current tight list so comments and activity read as one feed. Activity entries MUST appear in that side-panel timeline, not only as main-column form status text.
- **FR-004:** Comment Edit and Delete affordances in the timeline (when authorized) MUST be smaller text links (or equivalent link-styled controls), not bulky default `Button` spacing for those idle actions. In-edit Save MAY remain a compact button; Cancel edit SHOULD also be a text link or equally compact control so Edit mode does not reintroduce bulky dual-button chrome. Authz, disabled-while-busy, and archived rules MUST stay as Verified `010`.
- **FR-005:** Theme CSS MUST define `--popover` and `--popover-foreground` for `:root` / every `data-palette` catalog entry, and MUST map them in `@theme inline` (e.g. `--color-popover` / `--color-popover-foreground`) so Tailwind `bg-popover` and `text-popover-foreground` resolve. Labels `PopoverContent` MUST render an opaque, readable surface across palettes (including gradients). Prefer deriving popover colors from existing card/surface tokens unless a palette needs a distinct opaque surface.
- **FR-006:** LabelsPopover create and edit color controls MUST use a **swatch grid** of exactly the nine Decided tokens (`RED` `ORANGE` `YELLOW` `GREEN` `TEAL` `BLUE` `PURPLE` `PINK` `GRAY`). The selected swatch MUST show a visible checkmark (or equivalent clear selected indicator). MUST NOT use a freeform color input or expand beyond those nine tokens. MUST NOT change Prisma/schema or HTTP color contracts (Q-103).
- **FR-007:** Board-header LabelsDialog MUST use the same swatch-grid color picker wherever it currently uses a color `<select>` for create/edit, so catalog color UX is consistent (Q-103).
- **FR-008:** Frontend MUST call existing APIs with `credentials: 'include'`. MUST NOT store a bearer token in JS. Backend resource-level authz remains authoritative.
- **FR-009:** This feature MUST NOT change Verified public HTTP contracts for comments, activity, or labels. MUST NOT add Prisma schema/migrations. MUST NOT implement checklists (**F**) or app-wide audit (**C**). MUST NOT change `constitution.md`. Work MUST live under `specs/014-task-detail-polish/` and MUST NOT reopen Verified 013 as Draft (Q-104).
- **FR-010:** Critical behaviors (activity reload triggers, opaque popover tokens, swatch selection, text-link comment actions, timeline still omitting `COMMENT_ADDED`) MUST be covered by frontend tests (Testing Library). No backend test expansion is required unless a contract accidentally changes.

### Permission mapping (unchanged; UI must respect)

| Operation | Authorization |
| --- | --- |
| Read task, comments, activity, Labels popover | Task read |
| Save task fields / assign labels / catalog mutate | Task write |
| Create comment | Task write |
| Edit comment | Author only |
| Soft-delete comment | Author or effective OWNER |
| Archived parent mutations | Same as Verified (`ownerUserId` → 409; other members → 403) |

## 6. Acceptance Criteria

### Scenario AC-001: Activity reloads after task Save

- Given TaskDetail is open with a writable task
- When the writer successfully Saves field changes that produce a `TASK_FIELDS_CHANGED` (or equivalent) activity event
- Then the client reloads activity without closing the Dialog
- Then the new activity entry appears in the right-panel timeline (with `COMMENT_ADDED` still omitted from display)

### Scenario AC-002: Activity reloads after comment create

- Given TaskDetail is open
- When the writer successfully creates a comment
- Then the comments list updates as today
- Then the client reloads activity for the open task
- Then the new live comment appears in the interleaved timeline (and any `COMMENT_ADDED` activity row remains omitted from display per Q-100)

### Scenario AC-003: Activity reloads after comment edit/delete

- Given TaskDetail is open
- When the authorized user successfully edits or soft-deletes a comment
- Then the comments list stays in sync as today
- Then the client reloads activity for consistency

### Scenario AC-004: Readable shared timeline

- Given comments and activity are loaded
- When the side panel is shown
- Then comments and non-`COMMENT_ADDED` activity share one newest-first timeline with clearer spacing/separation than the pre-polish dense list
- Then activity is visible in that side panel timeline, not only as main-column form status text

### Scenario AC-005: Comment action text links

- Given a comment the actor may edit and/or soft-delete
- When the comment is not in edit mode
- Then Edit and/or Delete appear as compact text links (not bulky default Button chrome)
- Then VIEWER / unauthorized actors still lack those controls
- Then busy/archived disablement still prevents mutations

### Scenario AC-006: Opaque Labels popover

- Given any whole-UI palette from the Verified catalog
- When the Labels popover is open
- Then `bg-popover` resolves via defined `--popover` / theme mapping
- Then the popover surface is opaque enough to read label names, search, and controls over the dialog/board behind it

### Scenario AC-007: Swatch color picker (LabelsPopover)

- Given a writer creates or edits a label in the Labels popover
- When choosing a color
- Then a grid of the nine Decided token swatches is shown
- Then the selected token shows a checkmark (or equivalent clear selected state)
- Then no native color `<select>` is required for that control
- Then submitting still sends one of the nine Decided token strings over the existing API

### Scenario AC-008: Swatch color picker (LabelsDialog)

- Given a writer creates or edits a label in the board Labels Dialog
- When choosing a color
- Then the same nine-token swatch grid behavior as AC-007 applies (no color `<select>`)

### Scenario AC-009: Contracts and non-goals held

- Given this feature is implemented
- When public API contracts and product scope are reviewed
- Then comments, activity, and labels HTTP contracts are unchanged
- Then no checklist/attachment/assignee UI from Non-Goals is present
- Then no Prisma migration was added for this feature
- Then `constitution.md` is unchanged
- Then `013-task-detail-layout` remains Verified (not rewritten as Draft)
- Then work artifacts live under `014-task-detail-polish`

### Scenario AC-010: Authz and archived behavior preserved

- Given VIEWER, archived project, or 401/403/409 responses from existing APIs
- When the user interacts with task Save, comments, or Labels
- Then UI disablement and error surfaces continue to match Verified rules; backend remains authoritative
- Then failed activity reload after a successful mutation MUST NOT silently undo the successful comments/task local update; surface a non-blocking activity error/status when practical

## 7. Business Rules

- Activity list semantics remain Verified `011` — owning domain: `tasks`.
- Comments rules remain Verified `010` — owning domain: `tasks`.
- Label color tokens remain the nine Decided named tokens — owning domain: `tasks` (Q-083 / Q-103).
- Interleaved timeline still omits `COMMENT_ADDED` (Q-100).
- Live activity refresh after Save / comment create (and edit/delete for consistency) is client-side reload only (Q-102).
- No checklists (**F**) in this feature.
- New feature folder `014-task-detail-polish`; do not reopen Verified 013 (Q-104).

## 8. Data

No new persisted business concepts. Reuse existing task, comment, activity, project label catalog, and task↔label assignment data. No new uniqueness, lifecycle, or deletion rules. No schema change for colors.

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

- Timeline and popover remain usable on desktop and narrow viewports within the existing 013 responsive shell.
- Swatch buttons MUST be keyboard-operable and labeled (accessible name includes color token or “selected” state).
- Popover opacity fix MUST not break Dialog nesting / Escape discard behavior from Verified 013.
- Educational clarity: prefer a small shared swatch component over duplicated markup.
- No invented numeric performance targets.

## 12. Dependencies

- Existing features: `007-workspace-ui`, `010-task-comments`, `011-task-activity`, `012-task-labels`, `013-task-detail-layout` (Verified).
- Architectural constraints: modular monolith; `tasks` owns comments/activity/labels; frontend under `frontend/`; SDD Draft → Approve before implement.
- External dependencies: none new expected (`@radix-ui/react-popover` already Verified in 013).
- Visual references: `templates/card.png` (timeline composition), `templates/tag_modal_issue.png` (opaque Labels panel), `templates/tagcolors.png` (swatch + checkmark). References are composition guides, not pixel-perfect or branded clones.

## 13. Failures and Edge Cases

- Task Save succeeds but activity reload fails → keep saved task fields; show activity load error/status in the side panel without claiming the timeline is current.
- Comment create succeeds but activity reload fails → keep new comment in the list; show activity error/status without removing the comment.
- Comment edit/delete succeeds but activity reload fails → keep local comments sync; show activity error/status.
- Unchanged task Save that yields no new activity (no-op PATCH / 011 no-emit) → reload MAY still run; timeline MUST remain correct (no duplicate fabrication client-side).
- Labels popover open across palette switch mid-session → popover tokens follow `data-palette` on the document root.
- Soft-deleted task Dialog close paths remain as Verified; no requirement to refresh activity after Dialog unmount.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001 | Frontend tests (activity GET after Save) |
| FR-002 | AC-002, AC-003 | Frontend tests (activity GET after comment mutations) |
| FR-003 | AC-004 | Frontend tests / inspection |
| FR-004 | AC-005 | Frontend tests |
| FR-005 | AC-006 | CSS/theme assertion + component inspection |
| FR-006, FR-007 | AC-007, AC-008 | LabelsPopover / LabelsDialog tests |
| FR-008, FR-009 | AC-009, AC-010 | Contract non-regression + authz tests |
| FR-010 | AC-001–AC-010 | Vitest / Testing Library |

## 15. Open Questions

### Decided

- **Q-102:** Live activity refresh triggers. Owner: product + frontend. Status: **Decided** (option **1**). After task Save and after comment create (and preferably comment edit/delete for consistency), reload activity so the right timeline updates live; keep comments list in sync as already done for comment mutations. This spec treats edit/delete activity reload as **required** for consistency within option 1.
- **Q-103:** Color picker scope. Owner: product + frontend. Status: **Decided** (option **1**). Color picker is a swatch grid of the existing nine Decided tokens (`RED` `ORANGE` `YELLOW` `GREEN` `TEAL` `BLUE` `PURPLE` `PINK` `GRAY`); no freeform/30-color expansion; no schema change.
- **Q-104:** Feature folder. Owner: SDD. Status: **Decided** (option **1**). New feature folder `014-task-detail-polish` (do not reopen Verified 013 as Draft).

### Open (material)

None. Q-102–Q-104 are Decided. Remaining choices (exact spacing tokens, shared swatch component extraction, checkmark icon vs CSS) are implementation details for the plan and do not block product rules.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-102–Q-104 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
