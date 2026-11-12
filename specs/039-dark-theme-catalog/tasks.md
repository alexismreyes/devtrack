# Tasks: Dark Theme Catalog Refresh

- **Feature ID:** 039-dark-theme-catalog
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. **Stop if artifacts are Draft.**

Locked: remove 7 old darks; add 12 guide palettes (PascalCase); keep lights/gradients + Forest default/fallback; existing uiPalettes architecture only; no second ThemeProvider; no full glass/chart matrix unless trivial; hex OK / match house CSS style. No notes/**C**/constitution/catalog until confirm.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect `uiPalettes.ts`, `index.css` palette blocks, eyecandy/previews, and theme tests. Confirm guide architecture will not be copied. Do not change product code.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-231–Q-236 Decided. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 N/A — frontend-only. Record evidence.

### Phase 3 — Frontend

- [x] T004 Update `UI_PALETTE_IDS` / `UI_PALETTES`: remove seven darks; add twelve new ids/labels; keep lights/gradients; Forest default.
- [x] T005 Replace CSS `[data-palette]` + eyecandy/preview tokens using plan appendix colors mapped to existing variables.
- [x] T006 Update/fix frontend tests for AC-001–AC-004 (incl. removed-id → Forest).

### Phase 4 — Verification

- [x] T007 Run targeted theme tests; record results.
- [x] T008 Run typecheck and relevant full suite on Node 22; record results.
- [x] T009 Verify AC-001–AC-007; confirm no second ThemeProvider; non-goals held.
- [x] T010 Independent review; resolve blockers.
- [x] T011 Update `memory.md`; propose catalog patch; wait for confirm before `implemented-features.md`.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection |
| T002 | T001 | Approved |
| T003 | T002 | N/A |
| T004 | T002 | Catalog TS |
| T005 | T004 | CSS/eyecandy |
| T006 | T004, T005 | FE tests |
| T007 | T006 | Command log |
| T008 | T007 | Command log |
| T009 | T008 | AC checklist |
| T010 | T009 | Reviewer |
| T011 | T010 | Memory |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004–T006, T009 | 12 new palettes — catalog/CSS/provider tests pass |
| AC-002 | T004–T006, T009 | 7 removed — catalog/CSS asserts pass |
| AC-003 | T004, T006, T009 | Lights kept — catalog asserts pass |
| AC-004 | T004, T006, T009 | Forest fallback — storage/provider tests pass |
| AC-005 | T001, T009 | No ThemeProvider — existing UiPaletteProvider only |
| AC-006 | T003, T009 | Scope — frontend-only; no notes/**C**/constitution/catalog |
| AC-007 | T002 | Approval gate — artifacts Approved before implement |

## Completion report

- Completed tasks: T001–T011
- Inspection (T001): `frontend/src/theme/uiPalettes.ts`, `UiPaletteProvider`, `UiPaletteSelector`, `frontend/src/index.css` `[data-palette]` + previews/eyecandy, theme tests. Guide ThemeProvider architecture not copied.
- T003: no backend/Prisma/API changes (frontend-only).
- Tests executed (Node.js `v22.22.3`):
  - Targeted: `uiPalettes` / `UiPaletteProvider` / `uiEyecandy` / `popoverTheme` / `App` — 5 files / 39 passed
  - Full frontend `vitest run` — 35 files / 355 passed
  - `npm run typecheck` — exit 0
- Actual results: all listed checks passed; no migrations; hex tokens per Q-236
- Known issues: live contrast not audited (informational, same as prior theme work)
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS (informational). Blocking: no. Failed ACs: none.
- Memory updated: yes (T011); catalog propose only — wait for confirm before `implemented-features.md`
- Remaining work: none (Verified); catalog patch awaits user confirm
