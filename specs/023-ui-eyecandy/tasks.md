# Tasks: UI Eyecandy

- **Feature ID:** 023-ui-eyecandy
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Frontend-only. **Locked:** Q-177 Decided — `Obsidian`, `Noir`, `Dusk`; Q-178 Decided — visual polish only. No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect checklist UI, `uiPalettes`, palette CSS tokens, DashboardPage cards, ProfilePage card. Do not change product code.
- [x] T002 Confirm artifacts **Approved** (Q-177/Q-178 already Decided: Obsidian/Noir/Dusk; visual-only). **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Not applicable — frontend-only. Record “N/A — no API/Prisma”.

### Phase 3 — Frontend

- [x] T004 Add dark palettes `Obsidian`, `Noir`, `Dusk` to catalog + CSS tokens (AC-003; Q-177).
- [x] T005 Extend pointer cursor on checklist interactive controls (AC-001).
- [x] T006 Apply checklist block background eyecandy (AC-002).
- [x] T007 Apply gradient eyecandy to dashboard cards and profile card (AC-004, AC-005).
- [x] T008 Add frontend tests for AC-001–AC-006 as practical.

### Phase 4 — Verification

- [x] T009 Run targeted frontend tests; record results.
- [x] T010 Run frontend typecheck and relevant `npm test` on Node 22; record results.
- [x] T011 Verify AC-001–AC-006; confirm no API/Prisma/constitution changes.
- [x] T012 Obtain independent review and resolve blocking findings.
  - Evidence: Independent review **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. Failed ACs: none. Informational: reviewer did not re-run T009/T010 suites (totals from prior implementer log). Low: `Card` still ships base `bg-card` under `EYECANDY_SURFACE_CLASS` (gradient via `--eyecandy-surface-image` still not bg-card-only). Low: create-checklist control relies on shared `Button` `cursor-pointer`, not an explicit 023 assert (still meets FR-001). AC-001–AC-006 verified by reviewer.
- [x] T013 Update `memory.md`. Propose catalog patch; **wait for user confirmation** before editing `implemented-features.md`.
  - Evidence: `memory.md` updated (Verified 023, Q-177/Q-178); catalog patch proposed in implementer return — `implemented-features.md` not edited. Catalog last confirmed through 018; 019–022 still awaiting catalog if not applied.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved |
| T003 | T002 | N/A note |
| T004 | T002 | Catalog + CSS |
| T005 | T002 | Cursor |
| T006 | T002 | Checklist surface |
| T007 | T002 | Dashboard/profile |
| T008 | T004–T007 | Test log |
| T009 | T008 | Command log |
| T010 | T009 | Command log |
| T011 | T010 | AC checklist |
| T012 | T011 | Reviewer verdict |
| T013 | T012 | Memory; catalog after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T005, T008, T011 | Cursor |
| AC-002 | T006, T008, T011 | Surface |
| AC-003 | T004, T008, T011 | Palettes |
| AC-004 | T007, T008, T011 | Dashboard |
| AC-005 | T007, T008, T011 | Profile |
| AC-006 | T003, T011–T012 | Non-goals |

## Completion report

- Completed tasks: T001–T013
- Tests executed (prior implementer T009/T010; Node `v22.22.3`):
  - Targeted: `uiPalettes`, `uiEyecandy`, `UiPaletteProvider`, `popoverTheme`, checklist eyecandy, Dashboard/Profile/TaskDetail (57 passed)
  - Full frontend `npm test`: 34 files / 296 tests passed
  - `npm run typecheck`: passed
- Actual results: all green on Node 22; AC-001–AC-006 met; frontend-only; no API/Prisma/constitution changes
- Known issues: Informational/Low non-blocking only (reviewer suite re-run deferred; Card base `bg-card` under eyecandy class; create-checklist cursor via shared Button). Catalog `implemented-features.md` awaiting user confirm (last confirmed through 018; 019–022 also pending if not applied).
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (T013)
- Remaining work: none for 023; next Approved work: `024-project-cover-on-create`
