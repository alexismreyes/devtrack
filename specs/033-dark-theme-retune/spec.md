# Feature Specification: Dark Theme Retune

- **ID:** 033-dark-theme-retune
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** Verified `023-ui-eyecandy` (Obsidian/Noir/Dusk); Verified `007-workspace-ui` / `016-ui-refinements` (palette catalog + localStorage); Approved `032-kanban-column-dnd-polish` (prior sequential FE polish); reference images `templates/DarkThemes/darkViolet.png`, `templates/DarkThemes/darkCyan.png`

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Material product locks **Q-205–Q-207** are **Decided** (section 15). Implementation may proceed on the approved task list only after 032 (delivery order 032 → 033). Frontend-only: **add three new dark palettes** (Violet Night + Cyan Edge from templates, plus Graphite grayscale eyecandy) and **keep** existing Obsidian, Noir, Dusk (and all other catalog entries). Do **not** invent task notes. Do **not** reopen **H** beyond unrelated 032 polish. Do **not** implement **C** or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms. No Prisma/API.

This ID is **033-dark-theme-retune**.

## 1. Problem

Verified `023` added dark solids Obsidian, Noir, and Dusk. Users still want richer dark looks inspired by `templates/DarkThemes/darkViolet.png` and `templates/DarkThemes/darkCyan.png`, plus a third grayscale eyecandy dark that mixes blacks with light and dark grays. Existing dark (and light/gradient) catalog entries must remain selectable; this feature adds three new whole-UI palettes rather than replacing the 023 set.

## 2. Goals

- **ADD** three new dark whole-UI palettes total: two inspired by the reference templates plus one grayscale eyecandy (Q-205).
- Catalog ids/labels: **`VioletNight` / “Violet Night”** (from `darkViolet.png`), **`CyanEdge` / “Cyan Edge”** (from `darkCyan.png`), and **`Graphite` / “Graphite”** (black + light/dark gray eyecandy) (Q-206).
- **KEEP** existing **Obsidian**, **Noir**, **Dusk**, and all other current catalog entries (solids + gradients) (Q-205).
- Persist selection only via existing `devtrack.uiPalette` localStorage rules (invalid/missing → Forest; logout does not clear).
- Provide CSS tokens + selector previews so all three new palettes apply on the document root like other entries.

## 3. Non-Goals

- Removing, renaming, or retuning Obsidian/Noir/Dusk as replacements (keep them).
- Prisma / API / User palette field / cookie persistence.
- Task notes; **H** reopen; app-wide audit (**C**); `specs/005-audit/`.
- Changing `constitution.md`.
- Editing `implemented-features.md` in this batch.
- Kanban column DnD polish (owned by `032`).
- New CSS frameworks, `next-themes`, or second theme systems.
- Pixel-perfect clone of the trading-dashboard template layouts (colors/atmosphere only; Q-207).

## 4. Actors and User Stories

### User Story US-001

As a user of Color palette, I want three new dark themes — violet and cyan inspired by the template images, plus a grayscale Graphite eyecandy — so I can choose richer dark looks.

### User Story US-002

As a user who already uses Obsidian, Noir, or Dusk, I want those options to remain available, so my saved preference and choices are not removed.

### User Story US-003

As a guest or authenticated user, I want the new palettes to follow the same localStorage persistence rules as today, so theme behavior stays predictable.

## 5. Functional Requirements

- **FR-001:** The documented `UI_PALETTE_IDS` / `UI_PALETTES` catalog MUST gain exactly **three** new **dark** entries: ids **`VioletNight`**, **`CyanEdge`**, and **`Graphite`** (Q-205, Q-206).
- **FR-002:** Display labels MUST be **“Violet Night”**, **“Cyan Edge”**, and **“Graphite”** in the palette selector (Q-206). Catalog typing MAY allow `label` as a display string distinct from id if needed.
- **FR-003:** Existing entries including **Obsidian**, **Noir**, **Dusk**, Forest…Midnight solids, and all gradients MUST remain in the catalog and selectable (Q-205).
- **FR-004:** Each new palette MUST define the same class of CSS variables used by existing palettes (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, sidebar/board/devtrack-bar, eyecandy surface image, etc.) under `[data-palette="…"]`, plus `.ui-palette-preview` swatches.
- **FR-005:** Visual direction MUST be **inspired, not pixel-clone** (Q-207): Violet Night → deep violet/navy with magenta/cyan accent cues from `darkViolet.png`; Cyan Edge → near-black navy with cyan/teal accents from `darkCyan.png`; Graphite → blacks mixed with light and dark grays, polished eyecandy (cool neutral chrome, readable contrast). Exact oklch values are implementation detail within that direction.
- **FR-006:** Persistence remains localStorage key `devtrack.uiPalette` only; invalid/missing → Forest; logout does not clear (Q-041/Q-042 unchanged).
- **FR-007:** Kind for all three new entries MUST be **`solid`** dark palettes (not gradient catalog kind), unless a later Approved change says otherwise (Q-206).
- **FR-008:** MUST remain frontend-only: no Prisma, migrations, or API contract changes. MUST NOT change `constitution.md`. MUST NOT implement notes/**C**/032 scope.
- **FR-009:** Frontend tests MUST cover catalog presence, selectable persistence for the new ids, keep Obsidian/Noir/Dusk, and CSS token/preview presence as practical.

## 6. Acceptance Criteria

### Scenario AC-001: Three new dark palettes selectable

- Given the Color palette selector
- When the catalog is listed
- Then **Violet Night**, **Cyan Edge**, and **Graphite** are selectable options (ids `VioletNight`, `CyanEdge`, `Graphite`)
- Then choosing any of them applies `data-palette` on the document root and stores the id under `devtrack.uiPalette`

### Scenario AC-002: Existing dark (and other) entries kept

- Given the Color palette selector after this feature
- When the catalog is listed
- Then Obsidian, Noir, and Dusk remain selectable
- Then other previously existing catalog entries remain present

### Scenario AC-003: Tokens and previews

- Given CSS theme sources
- When inspected
- Then `[data-palette="VioletNight"]`, `[data-palette="CyanEdge"]`, and `[data-palette="Graphite"]` define required palette tokens
- Then preview swatches exist for all three ids

### Scenario AC-004: Persistence rules unchanged

- Given a selected new palette id
- When the page reloads
- Then the stored id is restored if valid
- When the stored id is missing/unknown
- Then Forest remains the fallback

### Scenario AC-005: Frontend-only / non-goals

- Given this feature
- When implemented
- Then no API/Prisma/constitution changes; Obsidian/Noir/Dusk not removed; violet/cyan are inspired not pixel clones; no notes/**C**/032 DnD work required here

### Scenario AC-006: Approval gate

- Given these artifacts are **Approved** (Q-205–Q-207 Decided)
- When implementation is requested
- Then work may proceed on the approved task list only

## 7. Business Rules

- Palette id persistence remains client-only — owning concern: frontend (no users/auth schema).
- Catalog is additive for this feature — do not delete existing ids.

## 8. Data

No new persisted server data. New catalog ids are code constants; selected id remains localStorage only.

## 9. API and Integrations

None. No HTTP contract changes.

## 10. Security

No authz changes. Do not introduce server-stored theme preferences.

## 11. Non-Functional

New dark palettes SHOULD keep readable contrast for text/controls similar to existing dark solids. Do not require a formal WCAG audit suite in this feature.

## 12. Dependencies

- Existing features: Verified 023 dark palettes; 007/016 palette plumbing; 014 opaque popover tokens pattern
- Prior sequential FE: Approved `032` (delivery order before 033)
- Architectural constraints: constitution Articles VII/IX; frontend-only
- External dependencies: none new
- Visual references: `templates/DarkThemes/darkViolet.png`, `templates/DarkThemes/darkCyan.png` (Violet Night / Cyan Edge only; Graphite has no template image)

## 13. Failures and Edge Cases

- Unknown stored id still falls back to Forest.
- Selector truncation: longer labels (“Violet Night”, “Cyan Edge”) MUST remain accessible via `aria-label` even if truncated in the trigger.
- Tests that hard-code palette counts MUST be updated for +3 entries.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-003 | AC-001, AC-002 | uiPalettes + selector tests |
| FR-004–FR-005 | AC-003, AC-005 | CSS/token tests + review |
| FR-006 | AC-004 | Provider/storage tests |
| FR-007–FR-009 | AC-005–AC-006 | Review + tests |

## 15. Open Questions

- **Q-205:** Dark catalog change shape? Owner: product + frontend. Status: **Decided** (user lock). **ADD** three new dark palettes total (Violet Night + Cyan Edge from templates + Graphite grayscale eyecandy); **KEEP** existing Obsidian, Noir, Dusk (and other catalog entries).
- **Q-206:** Exact catalog ids/labels/kind? Owner: product + frontend. Status: **Decided** (user lock). Ids **`VioletNight`**, **`CyanEdge`**, **`Graphite`**; display labels **“Violet Night”**, **“Cyan Edge”**, **“Graphite”**; kind **`solid`**. Allow `UiPaletteDefinition.label` to be a display string (not forced equal to id) so spaced labels work without awkward localStorage ids. (Rejected naming alternatives for the third: Charcoal Mist / Black Steel.)
- **Q-207:** Token fidelity to templates? Owner: product + frontend. Status: **Decided** (user lock). **Inspired, not pixel clone** for violet/cyan templates; Graphite is original grayscale eyecandy (blacks + light/dark grays). Use oklch tokens consistent with existing palette files.

Cross-cutting locks (record, not reopened): frontend-only; no Prisma/API; no notes/**H** reopen; no **C**; no constitution edit; no `implemented-features.md` until later confirm; do not remove Obsidian/Noir/Dusk; 032 owns Kanban column DnD polish.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-205–Q-207 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T012)
- Independent review: PASS WITH NON-BLOCKING FINDINGS (Low: selector trigger `aria-label` is only “Color palette”, truncated Violet Night/Cyan Edge rely on visible text; informational: live contrast not audited; reviewer did not re-run suites)
- Verified: Yes
