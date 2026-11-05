# Tasks: Task Detail Polish

- **Feature ID:** 014-task-detail-polish
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Decided Q-102–Q-104. Frontend-focused. No backend/Prisma work expected. Do not implement checklists (**F**), attachments, assignees, or color-catalog expansion. Do not change `constitution.md`. Do not reopen Verified `013-task-detail-layout` as Draft. Keep Verified comments/activity/labels HTTP contracts intact.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect `TaskDetail.tsx` (Save / comment mutation paths and `loadActivity`), `CommentsActivityPanel.tsx` (timeline + Edit/Delete buttons), `LabelsPopover.tsx`, `LabelsDialog.tsx`, `labelColors.ts`, `components/ui/popover.tsx`, `index.css` palette/`@theme` tokens, related tests, and references `templates/card.png`, `templates/tag_modal_issue.png`, `templates/tagcolors.png`. Record files to change. Confirm missing `--popover` tokens and color `<select>` usage. Confirm no schema/API need. Do not change product code in this task.
  - Evidence (2026-11-05): Confirmed `onSave` / comment mutations did not call `loadActivity`; CommentsActivityPanel used `gap-3` + outline/destructive Buttons; LabelsPopover/LabelsDialog used color `<select>` over nine `LABEL_COLORS`; `popover.tsx` already `bg-popover`; `index.css` lacked `--popover` / `@theme` `--color-popover*`; templates present; no schema/API change needed. Touch set matched plan §7.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-102–Q-104 Decided (activity reload after Save + comment create/edit/delete; nine-token swatch only; new `014` folder). Confirm non-goals (**F**, no migration, no constitution edit, no 013 reopen, no API contract change). **Stop if artifacts are Draft.**
  - Evidence (2026-11-05): All three artifacts Status **Approved**; Q-102–Q-104 Decided; non-goals held.

### Phase 2 — Backend

- [x] T003 Not applicable — no domain/API/Prisma changes planned. Record “N/A — frontend-only; contracts reused” as evidence when Approved work starts. If a contract gap is discovered, stop and amend artifacts instead of inventing API changes.
  - Evidence (2026-11-05): N/A — frontend-only; contracts reused. No backend/Prisma changes.

### Phase 3 — Frontend

- [x] T004 Add `--popover` / `--popover-foreground` to `:root` and every `data-palette` block in `frontend/src/index.css`, and map `--color-popover` / `--color-popover-foreground` in `@theme inline` so `bg-popover` / `text-popover-foreground` resolve to an opaque readable surface across the Verified palette catalog (AC-006 / FR-005). Prefer deriving from card/surface tokens. Do not add a second CSS framework.
  - Evidence (2026-11-05): `--popover` / `--popover-foreground` mirrored from card tokens in `:root` + all 12 palettes; `@theme` maps `--color-popover*`. Covered by `popoverTheme.test.ts`.
- [x] T005 In `TaskDetail.tsx`, after successful task Save and after successful comment create/edit/delete, call existing `loadActivity` while keeping comments list sync for comment mutations (Q-102). On activity reload failure, do not roll back successful local task/comment updates; surface activity error/status (AC-001–AC-003, AC-010).
  - Evidence (2026-11-05): `await loadActivity()` after successful Save and comment create/edit/delete. TaskDetail tests assert activity GET + failed-reload keeps Save.
- [x] T006 Polish `CommentsActivityPanel`: clearer Trello-like timeline spacing/separation for interleaved comments + non-`COMMENT_ADDED` activity (AC-004); replace idle Edit/Delete bulky buttons with compact text-link controls; keep Cancel edit compact; preserve authz/disabled/busy behavior (AC-005). Continue omitting `COMMENT_ADDED`.
  - Evidence (2026-11-05): Timeline items use `py-4` + `border-b`; Edit/Delete/Cancel use `variant="link"` compact controls; COMMENT_ADDED still omitted. Panel + TaskDetail tests.
- [x] T007 Add shared nine-token `LabelColorSwatchPicker` (or equivalent) with checkmark on selected token; replace color `<select>` in LabelsPopover create/edit and LabelsDialog create/edit (Q-103 / AC-007 / AC-008). Reuse `LABEL_COLORS` / chip classes. No schema or freeform colors.
  - Evidence (2026-11-05): New `LabelColorSwatchPicker.tsx`; selects removed from LabelsPopover + LabelsDialog; swatch click payloads asserted in tests.
- [x] T008 Add/update frontend tests for AC-001–AC-010 as applicable (activity GET after Save/comment mutations; timeline omit `COMMENT_ADDED`; text-link actions; popover token presence or opaque class resolution; swatch selection payloads; LabelsDialog parity; VIEWER/archived disablement; no **F** UI).
  - Evidence (2026-11-05): Targeted Vitest on Node 22.22.3 (`C:\nvm4w\nodejs`): 6 files / 36 tests passed (`TaskDetail`, `CommentsActivityPanel`, `LabelsPopover`, `LabelsDialog`, `LabelColorSwatchPicker`, `popoverTheme`). `npm run typecheck` passed.

### Phase 4 — Verification

- [x] T009 Run targeted frontend tests for TaskDetail / CommentsActivityPanel / LabelsPopover / LabelsDialog (and any new swatch file); record commands and actual results.
  - Evidence (2026-11-05): Node `v22.22.3` via `C:\nvm4w\nodejs`. `npm test -- --run src/tasks/TaskDetail.test.tsx src/tasks/CommentsActivityPanel.test.tsx src/tasks/LabelsPopover.test.tsx src/tasks/LabelsDialog.test.tsx src/tasks/LabelColorSwatchPicker.test.tsx src/popoverTheme.test.ts` → **6 files / 36 tests passed** (Vitest 5.0.5, ~5.1s).
- [x] T010 Run frontend `npm run typecheck` and full frontend `npm test` on Node 22; record commands and actual results. Backend suites optional smoke only if any shared client type was touched (not expected).
  - Evidence (2026-11-05): Node `v22.22.3`. `npm run typecheck` (`tsc --noEmit -p tsconfig.json`) → **passed**. Full `npm test -- --run` → **24 files / 215 tests passed** (~12.1s). Backend smoke not required (no shared client contract touch for 014).
- [x] T011 Verify AC-001–AC-010 against the spec using Decided Q-102–Q-104. Confirm no **F** UI, no Prisma migration, no constitution change, 013 remains Verified, contracts unchanged, nine tokens only, LabelsDialog uses swatches.
  - Evidence (2026-11-05): AC checklist (Q-102–Q-104 Decided):
    - **AC-001:** TaskDetail Save success → `await loadActivity()`; test asserts activity GET after Save.
    - **AC-002 / AC-003:** Comment create/edit/delete success → comments sync + `loadActivity()`; tests assert extra activity GETs.
    - **AC-004:** Shared timeline `py-4` + `border-b`; COMMENT_ADDED omitted (panel + TaskDetail tests).
    - **AC-005:** Idle Edit/Delete/Cancel use `variant="link"`; panel test covers compact links.
    - **AC-006:** `--popover` / `--popover-foreground` on `:root` + all palettes; `@theme` `--color-popover*`; `popoverTheme.test.ts` green.
    - **AC-007 / AC-008:** `LabelColorSwatchPicker` in LabelsPopover + LabelsDialog; 9 radios; no color `<select>`; payload tokens asserted.
    - **AC-009:** No **F**/checklist UI (tests query absent); no new Prisma migration for 014 (latest remains `20261105120000_task_labels` from 012); `constitution.md` clean/unmodified; `013-task-detail-layout` still **Verified**; artifacts under `specs/014-task-detail-polish/`; comments/activity/labels HTTP paths reused unchanged.
    - **AC-010:** Failed activity reload keeps Save + surfaces “activity unavailable”; archived/VIEWER disablement paths retained in TaskDetail tests.
    - Nine tokens only: `LABEL_COLORS` length 9 (`RED`…`GRAY`). Unmet ACs: **none**.
- [x] T012 Obtain independent review and resolve blocking findings.
  - Independent reviewer: **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. AC-001–AC-010 verified. Non-blocking: failed activity reload after comment mutations not explicitly tested (Save path is). Scope clean.
- [x] T013 Update `memory.md` from verified state. Record Q-102–Q-104 answers. Keep deferred **F** and later **C** visible. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file.
  - `memory.md` updated to Verified for `014-task-detail-polish`. Catalog patches for 012+013+014 proposed; `implemented-features.md` not edited pending user confirmation.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-102–Q-104 Decided |
| T003 | T002 | N/A evidence note |
| T004 | T002 | CSS/theme inspection or test |
| T005 | T002 | TaskDetail activity reload tests |
| T006 | T002 | CommentsActivityPanel tests / inspection |
| T007 | T002 | LabelsPopover / LabelsDialog swatch tests |
| T008 | T004, T005, T006, T007 | Frontend test results |
| T009 | T008 | Command log |
| T010 | T009 | Command log |
| T011 | T010 | AC checklist |
| T012 | T011 | Reviewer verdict |
| T013 | T012 | Memory updated; catalog patch only after user confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T005, T008, T011 | Activity after Save |
| AC-002 | T005, T008, T011 | Activity after comment create |
| AC-003 | T005, T008, T011 | Activity after comment edit/delete |
| AC-004 | T006, T008, T011 | Readable shared timeline |
| AC-005 | T006, T008, T011 | Comment text links |
| AC-006 | T004, T008, T011 | Opaque popover tokens |
| AC-007 | T007, T008, T011 | LabelsPopover swatches |
| AC-008 | T007, T008, T011 | LabelsDialog swatches |
| AC-009 | T003, T011, T012 | Non-goals / contracts / 014 folder |
| AC-010 | T005, T006, T008, T011 | Authz / failed reload |

## Completion report

- Completed tasks: T001–T013
- Tests executed (T009–T012 close-out, Node v22.22.3): frontend typecheck; frontend `npm test`
- Actual results (coordinator): frontend typecheck exit 0; frontend 24 files / 215 tests passed. AC-001–AC-010 met; unmet: none.
- Known issues: failed activity reload after comment mutations not explicitly tested (Save path covered)
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (`memory.md`); catalog patches for 012+013+014 proposed, awaiting user confirmation
- Remaining work: none for 014; deferred next product work is **F** (checklists)
