# Implementation Plan: UI Refinements

- **Feature ID:** 016-ui-refinements
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Spec section 15 **Q-125–Q-129** are **Decided**. Implementation may proceed on T001–T014 only. Decided scope: frontend polish for items 1–4 plus fixed-enum friendly presentation (Q-125 = 1+3). Custom statuses remain **out of implementable scope** (future separate feature). Do **not** invent custom-status persistence. Do **not** reopen Verified `015`. Do **not** implement **G** / **C** / hide-checked / item assign/due / Markdown redesign. Do not change `constitution.md`.

## 1. Summary

Frontend-only polish after Verified checklists:

1. Replace Checklist-button focus-to-inline-create with a dedicated create **Dialog** (Q-126); **remove** inline primary create form; keep `TaskChecklistsPanel` stacked lists; reuse Verified create checklist client + activity reload.
2. Checklist blocks: `bg-card` with border against Dialog (Q-129).
3. Reduce TaskDetail form label weight/size vs values.
4. Replace `UiPaletteSelector` native `<select>` with a circle + scheme-preview picker over the existing `UI_PALETTES` catalog; keep `UiPaletteProvider` / `devtrack.uiPalette` localStorage behavior.
5. Fixed-enum friendly presentation: display map `TODO → To do`, `IN_PROGRESS → In progress`, `DONE → Done` on TaskDetail status control + Kanban column headers only (Q-127 / Q-128); light badge/header chrome allowed; **no** Prisma/`TaskStatus` / Kanban column-count / dashboard formula changes. Custom statuses → separate future feature folder.

No backend/Prisma work expected.

## 2. Current State

Inspected 2026-11-05:

- `TaskDetail.tsx`: action-row **Labels** (`LabelsPopover`) + **Checklist** button increments `checklistFocusRequestId`; `TaskChecklistsPanel` scrolls/focuses inline “New checklist name” form; checklists stack in main column below fields.
- `TaskChecklistsPanel.tsx`: inline create form for writers; checklist `<li>` blocks lack a strong contrasting wrapper vs Dialog.
- TaskDetail form `Label` wrappers use default label sizing for title/description/due/status/priority.
- `theme/UiPaletteSelector.tsx`: native `<select aria-label="Color palette">` with `text-devtrack-bar-foreground`; options inherit poor contrast on many OS/palette combinations.
- `theme/uiPalettes.ts` + `UiPaletteProvider.tsx`: catalog ids + localStorage `devtrack.uiPalette`; Forest default; logout does not clear.
- `LabelColorSwatchPicker.tsx`: radiogroup swatch pattern to emulate for palette previews (different data: palette CSS tokens, not label colors).
- `KanbanBoard.tsx`: fixed `COLUMN_STATUSES = TODO / IN_PROGRESS / DONE`; headers show raw enum strings.
- Prisma `enum TaskStatus { TODO IN_PROGRESS DONE }`; dashboard pending/completed derived from those values.
- Verified `015` migration `20261105140000_task_checklists` exists; catalog 015 may still be unapplied — irrelevant to this frontend polish plan.
- Dialog + Popover peers already present; no DropdownMenu.

## 3. Domain Boundaries

- Owning domain for checklist behavior: **`tasks`** (no backend module changes expected for polish).
- Palette: **frontend-only**; no domain.
- Custom statuses: **not in this plan’s implementable scope** (Q-125 split); if later specified, would remain `tasks`-owned with explicit ports — not designed here.
- Invariants: checklist authz/activity emission unchanged; palette local-only; fixed three statuses with display-only friendly labels.
- Cross-domain interfaces: none new.
- Dependency direction: frontend → existing HTTP APIs only.
- Controller/service/repository/DTO/routes: **no changes expected**.

## 4. API Contract

No new endpoints and no intentional contract changes.

| Method / path | Auth | Notes |
| --- | --- | --- |
| `POST /api/tasks/:taskId/checklists` | session + task write | Existing create; body `{ name }` |
| `GET /api/tasks/:taskId/checklists` | session + task read | Existing list; refresh after create |
| Activity GET after create | session + task read | Existing `015` reload after `CHECKLIST_ADDED` |
| `PATCH /api/tasks/:id` `{ status }` | session + task write | Unchanged enum values if presentation-only |

If implementation discovers a needed contract change, **stop** and amend artifacts before coding.

Custom-status HTTP: **not defined**.

## 5. Persistence

- Prisma model changes: **none**
- Migration implications: **none**
- Repository / transactions: **none**
- Compatibility risks: UI must remain compatible with fixed `TaskStatus` and checklist DTOs
- Custom statuses would require additive schema design in a **separate** feature — do not invent here

## 6. Frontend

### Create-checklist Dialog (Q-126)

- **Dialog** (Decided): Checklist button sets open state; Dialog contains name `Input` (default `"Checklist"` ok to match today’s default), Create + Cancel; on success call existing `createTaskChecklist`, merge into panel list (lift state or callback/`onCreated`), close Dialog, keep activity reload via existing `onActivityMaybeChanged`.
- **Remove** inline primary create form in `TaskChecklistsPanel` so the action-row control is the sole create entry point.
- Preserve VIEWER/archived disablement; do not add Dates/Attachment placeholders.
- Nested Dialog (TaskDetail + create): verify focus trap / dismiss carefully.

### Checklist contrast (Q-129)

- Wrap each checklist block (`<li>` or inner container) with `bg-card` + border + padding/radius; assert via `data-testid` or stable class in tests.
- Verify text remains readable on solids and gradients.

### Field label typography

- In TaskDetail writable form, style field labels smaller/thinner (e.g. `text-xs font-normal text-muted-foreground` or shared class) without shrinking inputs/selects incorrectly.
- Do not change comment composer / checklist item labels unless needed for consistency inside the same form region (prefer TaskDetail task-field labels only).

### Palette preview picker

- Rebuild `UiPaletteSelector` as a button/trigger showing current palette preview + accessible name; open Popover (or Dialog) with a radiogroup of circular previews.
- Preview rendering: map each `UiPaletteId` to a small CSS preview (solid fill or mini gradient) derived from documented token samples or dedicated preview classes in `index.css` — must not scrape unsafe HTML. Reuse catalog from `uiPalettes.ts`.
- On select: `setPalette(id)` existing path; close surface; keep tests for storage key and fallback.
- Update `UiPaletteSelector` / provider / App tests that currently `selectOptions` the native select.

### Fixed-enum status presentation (in scope)

- Add display map `TODO → To do`, `IN_PROGRESS → In progress`, `DONE → Done` (Q-127) used by **Kanban column headers** and **TaskDetail status** `<select>` option labels only (Q-128); values remain enum.
- Optional light badge/chip styling on headers/control — keep DnD droppable ids as enum strings.
- Do **not** change column count, `isTaskStatus`, dashboard client assumptions, card face, filters, or create-flow status strings in 016.

### Explicitly out of scope visuals / product

- No attachments **G**, no checklist item assign/due, no hide-checked, no Markdown redesign, no audit **C**, no custom status admin UI.

## 7. Files

Expected touch set (adjust only as T001 confirms):

| File | Responsibility |
| --- | --- |
| `frontend/src/tasks/TaskDetail.tsx` | Checklist Dialog open state; field label classes; status display labels |
| `frontend/src/tasks/TaskDetail.test.tsx` | Create-via-Dialog; label classes; status copy |
| `frontend/src/tasks/TaskChecklistsPanel.tsx` | Remove inline create; `bg-card`+border wrapper; accept external create / refresh |
| `frontend/src/tasks/TaskChecklistsPanel.test.tsx` | Contrast structure; create path changes |
| `frontend/src/tasks/CreateChecklistDialog.tsx` (or equivalent) | Dedicated create Dialog |
| `frontend/src/theme/UiPaletteSelector.tsx` | Preview picker UI |
| `frontend/src/theme/UiPaletteSelector.test.tsx` (and/or provider/App tests) | Selection + storage + a11y |
| `frontend/src/index.css` | Optional palette preview helper classes |
| `frontend/src/tasks/KanbanBoard.tsx` (+ tests) | Friendly column headers |
| `frontend/src/tasks/statusDisplay.ts` (or equivalent) | Fixed-enum label map |

Backend files: **none**.

## 8. Dependencies and Config

- New packages: **none expected**. Prefer existing Dialog/Popover + lucide if a checkmark/chevron is needed.
- Env / Docker: none.
- Justify any new dependency in an artifact amend before adding.

## 9. Security and Failures

- Preserve checklist authz error handling and unauthenticated redirect hooks.
- Palette picker: safe CSS-only previews; no `dangerouslySetInnerHTML` of user content.
- Failed checklist create: keep Dialog open with error; do not clear unrelated checklists.

## 10. Testing

| Area | Approach |
| --- | --- |
| Create Dialog | Testing Library: open from Checklist button, submit name, assert POST + list update |
| Authz | VIEWER/archived cannot create |
| Contrast | Assert `bg-card` + border wrapper test id / class on checklist blocks |
| Labels typography | Assert label class on TaskDetail fields |
| Palette | Select preview → storage key + `data-palette`; catalog length; Forest fallback |
| Status | Friendly labels on TaskDetail + Kanban headers; PATCH/DnD still enum |
| Non-goals | No attachment UI; no custom-status admin; schema enum unchanged |

No backend suite expansion expected.

## 11. Sequence

1. Confirm explicit user **Approve** (stop while Draft).
2. Checklist create Dialog + panel cleanup + tests.
3. Checklist `bg-card`+border contrast + tests.
4. TaskDetail field label typography + tests.
5. Palette preview picker + tests.
6. Fixed-enum status presentation + Kanban/TaskDetail tests (required).
7. Targeted + full frontend typecheck/test; independent review; memory update; propose catalog patch (wait for user confirm).

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Scope creep into custom statuses inside 016 | Q-125 Decided split; plan refuses schema invention |
| Palette preview hard to mirror gradients | Dedicated small preview classes per id; still localStorage id only |
| Dialog-in-Dialog (TaskDetail Dialog + create Dialog) | Nested Dialog carefully; verify focus trap / dismiss |
| `bg-card` contrast weak on some palettes | Assert readability; amend token only via Approved artifact change if needed |
| Scope creep into **G** / Markdown / hide-checked / card-face status pass | Non-goals + AC-010 + Q-128 |

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001–AC-003 | Create Dialog + panel | Frontend tests |
| AC-004 | `bg-card` + border block surface | Frontend test / inspection |
| AC-005 | Label typography | Frontend test |
| AC-006–AC-007 | UiPaletteSelector | Frontend tests |
| AC-008 | statusDisplay + Kanban/TaskDetail | Frontend tests |
| AC-009–AC-010 | Scope discipline | Reviewer / schema inspection |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown / implementation: Yes
