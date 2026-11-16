# Implementation Plan: Dark Theme Retune

- **Feature ID:** 033-dark-theme-retune
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Spec **Q-205–Q-207** Decided (user locks). Implementation may proceed on the approved task list only after 032 (delivery order 032 → 033). Frontend-only additive dark palettes. ADD three: `VioletNight`, `CyanEdge`, `Graphite`. Keep Obsidian/Noir/Dusk and all other catalog entries. No Prisma/API. No notes/**C**/constitution/`implemented-features.md` edits. Do not implement 032 Kanban polish here.

## 1. Summary

Add three dark solid palettes — `VioletNight` (“Violet Night”), `CyanEdge` (“Cyan Edge”), and `Graphite` (“Graphite”) — the first two inspired by `templates/DarkThemes/darkViolet.png` and `darkCyan.png`, the third a black + light/dark gray eyecandy. Wire catalog ids, CSS tokens, previews, and selector labels. Leave existing catalog entries intact and keep localStorage-only persistence.

## 2. Current State

Inspected 2026-11-10:

- `frontend/src/theme/uiPalettes.ts` — ids Forest…Glacier including dark solids Obsidian, Noir, Dusk; `label` typed as `UiPaletteId` (label === id today); storage `devtrack.uiPalette`.
- `frontend/src/index.css` — per-`[data-palette]` token blocks + `.ui-palette-preview` swatches; eyecandy surface images.
- `frontend/src/theme/UiPaletteSelector.tsx` — maps `UI_PALETTES`; shows `item.label`; trigger truncates id/label.
- Tests: `uiPalettes.test.ts`, `uiEyecandy.test.ts`, `UiPaletteProvider.test.tsx`, `popoverTheme.test.ts` (palette/popover counts).
- References present: `templates/DarkThemes/darkViolet.png`, `templates/DarkThemes/darkCyan.png`.

## 3. Domain Boundaries

- Owning concern: **frontend presentation** (theme catalog).
- Other domains: none.
- Cross-domain interfaces: none.
- Controllers/services/repos: unchanged.

## 4. API Contract

None. No endpoint changes.

## 5. Persistence

- Prisma model changes: **none**
- Migration implications: **none**
- Client persistence: existing localStorage key only

## 6. Frontend

### Catalog

- Append `VioletNight`, `CyanEdge`, and `Graphite` to `UI_PALETTE_IDS` / `UI_PALETTES` as `kind: "solid"`.
- Change `UiPaletteDefinition.label` to `string` (or equivalent) so labels can be `"Violet Night"` / `"Cyan Edge"` / `"Graphite"` while ids stay PascalCase for `data-palette` + storage (Q-206).
- Keep Obsidian, Noir, Dusk and all other entries.

### CSS tokens + previews

- Add `[data-palette="VioletNight"]`, `[data-palette="CyanEdge"]`, and `[data-palette="Graphite"]` token sets mirroring the structure of Obsidian/Noir/Dusk (background, foreground, card, popover, primary, muted, sidebar, board, bar, eyecandy surface).
- Violet Night: deep violet/navy base; magenta/violet primary accents; optional cyan secondary cue — **inspired** by `darkViolet.png`, not a pixel clone (Q-207).
- Cyan Edge: near-black navy base; cyan/teal primary accents — **inspired** by `darkCyan.png`, not a pixel clone (Q-207).
- Graphite: black / near-black base with light and dark gray surfaces and chrome; cool neutral eyecandy; readable foreground (no template image).
- Add `.ui-palette-preview[data-preview-palette="…"]` entries for all three.
- Ensure opaque `--popover` / `--popover-foreground` remain defined (014 pattern).

### Selector / tests

- Selector automatically lists new entries via `UI_PALETTES`.
- Update catalog/count/token tests for +3 palettes.
- Smoke: selecting a new id sets `document.documentElement.dataset.palette` and localStorage.

## 7. Files

Expected touch set (inspect may refine):

- `frontend/src/theme/uiPalettes.ts` — ids, definitions, label typing
- `frontend/src/index.css` — palette tokens + preview swatches
- `frontend/src/theme/UiPaletteSelector.tsx` — only if label typing/display needs adjustment
- Tests: `uiPalettes.test.ts`, `uiEyecandy.test.ts`, `UiPaletteProvider.test.tsx`, `popoverTheme.test.ts` (and any hard-coded count asserts)

## 8. Dependencies and Config

- New packages: **none**
- Env / Docker / Prisma: **none**

## 9. Security and Failures

- Client-only theme storage unchanged.
- Invalid ids still fall back to Forest.

## 10. Testing

- Frontend: catalog contains three new ids + keeps Obsidian/Noir/Dusk; labels/aria; CSS blocks + previews present; persistence smoke for at least one new id.
- Backend: N/A.

## 11. Sequence

1. Inspect theme catalog/CSS/tests (T001).
2. Approval gate (T002).
3. Catalog ids + label typing (+3).
4. CSS tokens + previews for all three.
5. Tests + typecheck + review + memory (propose catalog; wait for confirm).

## 12. Risks

- Contrast regression on vivid accents — mitigate by following existing dark solid token patterns and spot-check text/controls.
- Label type change may touch selector/tests — keep narrow.
- Graphite too close to Obsidian/Noir/Dusk — differentiate with clearer black↔gray surface steps and cooler chrome.
- Alternatives considered (rejected): replace Obsidian/Noir/Dusk (superseded by Q-205 keep); spaced localStorage ids (awkward; use PascalCase ids + display labels); Charcoal Mist / Black Steel for third (superseded by Graphite).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Catalog + selector + provider | Frontend tests |
| AC-002 | Keep existing ids | Catalog tests |
| AC-003 | index.css tokens/previews (×3) | CSS tests |
| AC-004 | Storage rules unchanged | Provider tests |
| AC-005 | Scope gate + inspired-not-clone | Review |
| AC-006 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (documented)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
