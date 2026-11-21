# Tasks: Dark Theme Retune

- **Feature ID:** 033-dark-theme-retune
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Spec **Q-205–Q-207** Decided (user locks). Frontend-only. ADD `VioletNight` / `CyanEdge` / `Graphite`; KEEP Obsidian, Noir, Dusk and other catalog entries. No Prisma/API. No notes/**C**/constitution/`implemented-features.md` edits (catalog propose only until user confirm).

Locked: add three dark solids — Violet Night + Cyan Edge (template-inspired, not pixel clone) + Graphite (black + light/dark gray eyecandy); keep existing catalog.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect `uiPalettes.ts`, `index.css` palette/preview blocks, `UiPaletteSelector`, and related theme tests. Record files to change and label-typing approach. Confirm no schema/API need. Do not change product code in this task.
  - Evidence: Touch `uiPalettes.ts` (label: string; +3 ids), `index.css` (tokens + previews + eyecandy), `UiPaletteSelector.tsx` (show display label), tests `uiPalettes` / `uiEyecandy` / `UiPaletteProvider` / `popoverTheme` / `App.test`. No schema/API.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-205–Q-207 Decided (user locks). Confirm non-goals and that 032 is not in scope. **Stop if artifacts are Draft.**
  - Evidence: All three Status: Approved; Q-205–Q-207 Decided; 032 Verified and out of scope; non-goals held.

### Phase 2 — Backend

- [x] T003 Not applicable — no domain/API/Prisma changes planned. Record “N/A — frontend-only” as evidence when Approved work starts. If a contract gap appears, **stop** and amend artifacts.
  - Evidence: N/A — frontend-only; no contract gap.

### Phase 3 — Frontend

- [x] T004 Add catalog ids `VioletNight`, `CyanEdge`, and `Graphite` (`kind: "solid"`) with display labels “Violet Night” / “Cyan Edge” / “Graphite”; allow label string ≠ id if needed; keep Obsidian/Noir/Dusk and all other entries (AC-001, AC-002 / Q-205–Q-206).
- [x] T005 Add `[data-palette]` CSS tokens and `.ui-palette-preview` swatches for all three new ids; violet/cyan inspired by DarkThemes refs (not pixel clone); Graphite black + gray eyecandy (AC-003 / Q-207).
- [x] T006 Confirm selector lists/applies new palettes and localStorage persistence rules remain Forest-fallback (AC-001, AC-004).
- [x] T007 Add/update frontend tests for AC-001–AC-005 as practical (catalog +3, CSS presence, persistence smoke, keep existing dark ids).

### Phase 4 — Verification

- [x] T008 Run targeted frontend theme/palette tests; record commands and actual results.
  - Command (Node 22.22.3): `npx vitest run src/theme/uiPalettes.test.ts src/theme/uiEyecandy.test.ts src/theme/UiPaletteProvider.test.tsx src/popoverTheme.test.ts` → 4 files / 16 passed.
- [x] T009 Run frontend `npm run typecheck` and relevant `npm test` on Node 22; record results.
  - Node 22.22.3: `npm run typecheck` exit 0; `npm test` → 34 files / 336 passed.
- [x] T010 Verify AC-001–AC-006 against the spec. Confirm no migration/API/constitution drift; Obsidian/Noir/Dusk kept; inspired-not-clone held.
  - AC-001: catalog + selector + Violet Night persistence smoke.
  - AC-002: Obsidian/Noir/Dusk + prior solids/gradients remain in `UI_PALETTE_IDS`.
  - AC-003: CSS `[data-palette]` + preview + eyecandy/popover for all three new ids.
  - AC-004: Forest fallback + localStorage id persistence unchanged.
  - AC-005: frontend-only; no Prisma/API/constitution/`implemented-features`; inspired tokens from DarkThemes refs.
  - AC-006: artifacts Approved; Q-205–Q-207 Decided.
- [x] T011 Obtain independent review and resolve blocking findings.
  - Verdict: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none.
  - Low: `UiPaletteSelector` trigger `aria-label` is only “Color palette”; truncated “Violet Night” / “Cyan Edge” rely on visible text (options expose full labels).
  - Informational: live contrast vs templates not audited (NFR-allowed); Graphite vs Noir differentiated; reviewer did not re-run T008/T009 (Ask/readonly).
- [x] T012 Update `memory.md` from verified state. Record Q-205–Q-207. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file.
  - Evidence: `memory.md` updated; next approved work none; catalog propose only (032 + 033).

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-205–Q-207 Decided |
| T003 | T002 | N/A evidence |
| T004 | T002 | Catalog ids + labels (+3) |
| T005 | T004 | CSS tokens/previews (×3) |
| T006 | T004, T005 | Selector + persistence |
| T007 | T004, T005, T006 | Frontend test results |
| T008 | T007 | Command log |
| T009 | T008 | Command log |
| T010 | T009 | AC checklist |
| T011 | T010 | Reviewer verdict |
| T012 | T011 | Memory updated; catalog only after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T006, T007, T010 | Three new palettes selectable + stored |
| AC-002 | T004, T007, T010 | Obsidian/Noir/Dusk + others kept |
| AC-003 | T005, T007, T010 | CSS tokens/previews (×3) |
| AC-004 | T006, T007, T010 | Persistence/fallback |
| AC-005 | T003, T010 | Frontend-only / non-goals / inspired-not-clone |
| AC-006 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T012
- Tests executed: targeted theme suite; `npm run typecheck`; `npm test` (Node 22.22.3)
- Actual results: targeted 4 files / 16 passed; typecheck exit 0; full frontend suite 34 files / 336 passed
- Known issues: Low residual — selector trigger aria-label does not include current spaced label; live contrast not audited
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none.
- Memory updated: yes (T012). Catalog propose only — wait for user confirm before `implemented-features.md`.
- Remaining work: none for 033; next approved work none
