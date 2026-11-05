# Tasks: UI Refinements

- **Feature ID:** 016-ui-refinements
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Approved**. Spec **Q-125–Q-129** are **Decided**. Decided scope: frontend polish items 1–4 + fixed-enum friendly presentation (Q-125 = 1+3); custom statuses excluded (separate future feature). Create = Dialog, remove inline primary create (Q-126). Labels = `To do` / `In progress` / `Done` on TaskDetail status + Kanban headers only (Q-127 / Q-128). Checklist contrast = `bg-card` + border (Q-129). Do not implement **G** / **C** / hide-checked / item assign/due / Markdown redesign. Do not reopen Verified `015` as Draft. Do not change `constitution.md`. No Prisma/API contract changes.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect `TaskDetail.tsx` (Checklist button / `checklistFocusRequestId` / form labels / status select), `TaskChecklistsPanel.tsx` (inline create + block markup), `LabelsPopover` / `LabelsDialog` patterns, `UiPaletteSelector.tsx` / `UiPaletteProvider.tsx` / `uiPalettes.ts`, `LabelColorSwatchPicker.tsx`, `KanbanBoard.tsx` column headers, related tests, and Dialog nesting constraints. Record files to change. Confirm no schema/API need. Do not change product code in this task.
  - **Evidence:** Touch set matched plan — `TaskDetail.tsx`, `TaskChecklistsPanel.tsx`, new `CreateChecklistDialog.tsx`, `statusDisplay.ts`, `UiPaletteSelector.tsx`, `index.css` preview classes, `KanbanBoard.tsx`, and related tests. No Prisma/API contract gap.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-125–Q-129 **Decided** (1+3; Dialog; `To do`/`In progress`/`Done`; TaskDetail+Kanban headers only; `bg-card`+border). Confirm non-goals (**G**, **C**, hide-checked, item assign/due, Markdown redesign, no constitution edit, no 015 reopen). **Stop if artifacts are Draft.**
  - **Evidence:** All three artifacts Status: Approved; Q-125–Q-129 Decided as briefed.

### Phase 2 — Backend

- [x] T003 Not applicable — no domain/API/Prisma changes planned. Record “N/A — frontend-only; contracts reused” as evidence when Approved work starts. If a contract gap or custom-status requirement appears, **stop** and amend artifacts / split feature instead of inventing API or schema.
  - **Evidence:** N/A — frontend-only; contracts reused (`POST/GET` checklists, `PATCH` status enum unchanged).

### Phase 3 — Frontend

- [x] T004 Implement create-checklist **Dialog** opened from the action-row **Checklist** button (Q-126). Wire Verified create API, list refresh, and activity reload hooks. **Remove** the inline primary create form in `TaskChecklistsPanel`. Preserve VIEWER/archived disablement (AC-001–AC-003).
  - **Evidence:** `CreateChecklistDialog.tsx`; Checklist opens Dialog; inline create removed; VIEWER/archived disable Checklist; TaskDetail create+activity tests pass.
- [x] T005 Apply `bg-card` with border (plus padding/radius as needed) to each checklist block (Q-129 / AC-004). Keep stacked main-column layout; do not embed on Kanban.
  - **Evidence:** checklist `<li>` uses `bg-card` + `border` + `rounded-lg` + `p-3`; `data-testid=checklist-block-*` asserted in tests.
- [x] T006 Restyle TaskDetail writable form field labels smaller/thinner than values while preserving readability (AC-005). Do not change save payloads.
  - **Evidence:** field label spans use `text-xs font-normal text-muted-foreground` (`data-testid=task-field-label`).
- [x] T007 Replace app-bar Color palette native `<select>` with circle + scheme-preview picker over the existing Q-041 catalog; keep `devtrack.uiPalette` localStorage behavior, Forest fallback, and logout-does-not-clear (AC-006–AC-007). No profile/Prisma palette field; no catalog expansion.
  - **Evidence:** `UiPaletteSelector` Popover + radiogroup previews; `ui-palette-preview` CSS; provider/App tests updated.
- [x] T008 Add friendly labels `To do` / `In progress` / `Done` (Q-127) and visual treatment for **TaskDetail status control + Kanban column headers only** (Q-128); keep persisted/DnD values as `TODO` \| `IN_PROGRESS` \| `DONE` (AC-008). Do not expand to card face / filters / create flows / whole-app pass.
  - **Evidence:** `statusDisplay.ts`; TaskDetail options + Kanban `bg-muted` headers; DnD/PATCH values unchanged.
- [x] T009 Add/update frontend tests for AC-001–AC-010: create Dialog open/submit; authz; `bg-card`+border contrast structure; label typography; palette preview selection + storage; fixed-enum presentation on TaskDetail + Kanban headers; assert no custom-status admin / no **G** UI; schema enum untouched (AC-009).
  - **Evidence:** Targeted suites green (see Completion report). Prisma `TaskStatus` still three values (inspected).

### Phase 4 — Verification

- [x] T010 Run targeted frontend tests for TaskDetail / TaskChecklistsPanel / UiPaletteSelector / Kanban/status helpers; record commands and actual results.
  - **Evidence:** Node `v22.22.3` — `npm test -- --run src/tasks/TaskDetail.test.tsx src/tasks/TaskChecklistsPanel.test.tsx src/tasks/KanbanBoard.test.tsx src/tasks/statusDisplay.test.ts src/theme/UiPaletteProvider.test.tsx src/theme/uiPalettes.test.ts` → 6 files, 45 tests passed (~5.72s). Palette UX covered via provider/catalog + App suite in T011 (no standalone `UiPaletteSelector.test.tsx`).
- [x] T011 Run frontend `npm run typecheck` and full frontend `npm test` on Node 22; record commands and actual results. Backend suites optional smoke only if shared client types were touched (not expected).
  - **Evidence:** Node `v22.22.3` — `npm run typecheck` (`tsc --noEmit -p tsconfig.json`) passed; `npm test -- --run` → 26 files, 230 tests passed (~14.95s). Backend smoke skipped (no shared client/API contract touch).
- [x] T012 Verify AC-001–AC-010 against the spec using Decided Q-125–Q-129. Confirm non-goals, no Prisma migration for 016, `constitution.md` unchanged, `015` remains Verified, contracts unchanged.
  - **Evidence:** AC-001–AC-010 **pass** vs Q-125–Q-129 (Dialog create; VIEWER/archived; stacked + inline create removed; `bg-card`+border; field labels; palette radiogroup previews + localStorage/Forest/logout; `To do`/`In progress`/`Done` on TaskDetail+Kanban headers only; no custom-status schema/API/admin; non-goals held). No `*016*` Prisma migration; `TaskStatus` still TODO/IN_PROGRESS/DONE; `constitution.md` clean/unchanged; `015` artifacts Status Verified; no `specs/005-audit/`; no G/C/custom-status admin UI.
- [x] T013 Obtain independent review and resolve blocking findings.
  - Evidence: Independent reviewer **Pass with notes**. Blocking: no. Failed ACs: none. Non-blocking: nested Dialog focus/dismiss beyond unit tests; contrast asserts in TaskDetail.test not panel suite; reviewer did not re-run live suite.
- [x] T014 Update `memory.md` from verified state. Record answered Q-125–Q-129. Keep deferred **G** and later **C** visible. Note custom-status follow-up (separate future feature). Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file.
  - Evidence: `memory.md` updated; catalog patch proposed to user (not applied until confirm).

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-125–Q-129 Decided |
| T003 | T002 | N/A evidence note |
| T004 | T002 | Create-Dialog tests |
| T005 | T002 | Contrast assert (`bg-card`+border) |
| T006 | T002 | Label typography assert |
| T007 | T002 | Palette picker tests |
| T008 | T002 | Status presentation tests |
| T009 | T004, T005, T006, T007, T008 | Frontend test results |
| T010 | T009 | Command log |
| T011 | T010 | Command log |
| T012 | T011 | AC checklist |
| T013 | T012 | Reviewer verdict |
| T014 | T013 | Memory updated; catalog patch only after user confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T009, T012 | Create Dialog |
| AC-002 | T004, T009, T012 | VIEWER/archived |
| AC-003 | T004, T009, T012 | Stacked main column; inline create removed |
| AC-004 | T005, T009, T012 | `bg-card` + border contrast |
| AC-005 | T006, T009, T012 | Field labels |
| AC-006 | T007, T009, T012 | Palette previews |
| AC-007 | T007, T009, T012 | Catalog + localStorage |
| AC-008 | T008, T009, T012 | Fixed-enum presentation (required) |
| AC-009 | T003, T008, T012 | No custom statuses in 016 |
| AC-010 | T012, T013 | Non-goals / 015 untouched |

## Completion report

- Completed tasks: T001–T014
- Tests executed: Node 22.22.3 — targeted `npm test -- --run` (TaskDetail, TaskChecklistsPanel, KanbanBoard, statusDisplay, UiPaletteProvider, uiPalettes); `npm run typecheck`; full frontend `npm test -- --run`
- Actual results: targeted 6 files / 45 tests passed; typecheck passed; full suite 26 files / 230 tests passed
- AC-001–AC-010: all pass; no Prisma migration for 016; constitution unchanged; 015 remains Verified
- Known issues: Nested create Dialog focus/dismiss beyond unit tests; no standalone UiPaletteSelector.test.tsx
- Reviewer findings: Pass with notes; blocking no; failed ACs none
- Memory updated: yes (T014); `implemented-features.md` patch proposed, awaiting user confirm
- Remaining work: none for 016 (catalog apply after user confirm; custom statuses + **G** deferred)
