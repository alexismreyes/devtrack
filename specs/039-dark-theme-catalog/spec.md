# Feature Specification: Dark Theme Catalog Refresh

- **ID:** 039-dark-theme-catalog
- **Status:** Verified
- **Created:** 2026-11-11
- **Related features:** Verified `007`/`016`/`023`/`033` uiPalettes; palette guide `templates/THEME_IMPLEMENTATION_GUIDE.md.md` (colors only); delivery after `038`

These artifacts are **Approved**. Locks **Q-231–Q-236** Decided. REMOVE existing dark palette ids Midnight, Obsidian, Noir, Dusk, VioletNight, CyanEdge, Graphite. ADD 12 themes from the guide (kebab → PascalCase catalog ids + human labels). Keep light solids/gradients (Forest default, Ocean, Sunset, Violet, Aurora…). Integrate with existing `uiPalettes` + CSS variables + eyecandy + localStorage; unknown/removed stored ids → Forest. Do **not** replace architecture with a second ThemeProvider; do **not** require full glass/chart token matrix unless trivial. Extract colors from the guide. No notes/**C**/constitution/`implemented-features.md` until later confirm.

## 1. Problem

DevTrack’s dark catalog (Midnight + 023/033 darks) does not match the twelve curated dark palettes in the theme guide. Users want those twelve dark looks while keeping the existing light/gradient catalog and DevTrack palette architecture.

## 2. Goals

- **REMOVE** catalog ids: `Midnight`, `Obsidian`, `Noir`, `Dusk`, `VioletNight`, `CyanEdge`, `Graphite` (Q-231).
- **ADD** twelve dark palettes from the guide, mapped to PascalCase ids + human labels (Q-232).
- **KEEP** light solids/gradients: Forest (default), Ocean, Sunset, Violet, Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier (Q-233).
- Integrate with existing `uiPalettes`, `[data-palette]`, eyecandy surfaces, `devtrack.uiPalette` localStorage; unknown/removed → Forest (Q-234).
- Do not introduce a second ThemeProvider / guide architecture rewrite; do not require full glass/chart token matrix unless trivial (Q-235).

## 3. Non-Goals

- Replacing `UiPaletteProvider` with guide `ThemeProvider` tree.
- Mandatory glassmorphism for NeoGlass beyond existing token/eyecandy surface hooks unless trivial.
- Mandatory full chart-1..5 / shadow matrix unless already used by existing palettes (map what existing CSS variables need).
- Changing Forest as default to Midnight Aurora.
- Prisma/API User theme field; notes; **C**; constitution; catalog file until confirm.

## 4. Actors and User Stories

### User Story US-001

As a user of Color palette, I want twelve new dark themes from the guide, so I can pick modern dark looks.

### User Story US-002

As a user with a removed dark id stored, I want fallback to Forest, so the UI never breaks on unknown ids.

### User Story US-003

As a user of light/gradient themes, I want those options kept, so my non-dark preferences remain.

## 5. Functional Requirements

- **FR-001:** Catalog MUST remove the seven ids in Q-231 from `UI_PALETTE_IDS` / `UI_PALETTES` / CSS `[data-palette]` / previews / eyecandy defs.
- **FR-002:** Catalog MUST add exactly these twelve dark solid entries (guide kebab → id / label):

| Guide id | Catalog id | Label |
| --- | --- | --- |
| midnight-aurora | MidnightAurora | Midnight Aurora |
| obsidian-gold | ObsidianGold | Obsidian & Gold |
| cyberpunk-dreams | CyberpunkDreams | Cyberpunk Dreams |
| deep-ocean | DeepOcean | Deep Ocean |
| cherry-blossom | CherryBlossom | Cherry Blossom |
| toxic-emerald | ToxicEmerald | Toxic Emerald |
| cosmic-lavender | CosmicLavender | Cosmic Lavender |
| neo-glass | NeoGlass | Neo-Glass |
| dribbble | Dribbble | Dribbble Aesthetic |
| oled-black | OledBlack | OLED Black |
| luxury-dark | LuxuryDark | Luxury Dark |
| cyber-aesthetic | CyberAesthetic | Cyber Aesthetic |

- **FR-003:** Color tokens for each new palette MUST be derived from the guide’s listed background/surface/elevated/primary/secondary/accent/foreground/muted/border/semantic colors (see plan palette appendix). Map into existing DevTrack CSS variables (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, sidebar/board/devtrack-bar, `--eyecandy-surface-image`, etc.).
- **FR-004:** Keep Forest default + light/gradient set in Q-233 unchanged in kind/presence (retune not required).
- **FR-005:** Persistence: `devtrack.uiPalette` only; missing/unknown/**removed** ids → Forest; logout does not clear.
- **FR-006:** MUST use existing `UiPaletteProvider` / selector architecture — no second ThemeProvider.
- **FR-007:** Full guide glass/chart/shadow matrix NOT required unless trivial to map onto existing tokens. NeoGlass MAY set optional `--glass-*` only if already consumed; otherwise solid token mapping suffices.
- **FR-008:** Frontend tests MUST cover removal, addition, Forest fallback for removed ids, and token/preview presence as practical.
- **FR-009:** Frontend-only: no Prisma/API. MUST NOT implement notes/**C** or change `constitution.md`. MUST NOT edit `implemented-features.md` until later confirm.

## 6. Acceptance Criteria

### Scenario AC-001: Twelve new dark palettes selectable

- Given Color palette selector
- When catalog is listed
- Then the twelve new ids/labels are selectable and apply `data-palette` + localStorage

### Scenario AC-002: Old darks removed

- Given Color palette selector
- When catalog is listed
- Then Midnight, Obsidian, Noir, Dusk, VioletNight, CyanEdge, Graphite are absent

### Scenario AC-003: Light/gradients kept; Forest default

- Given catalog
- When inspected
- Then Forest/Ocean/Sunset/Violet and gradient set remain; default remains Forest

### Scenario AC-004: Removed/unknown storage fallback

- Given localStorage holds a removed or unknown id
- When the app loads
- Then Forest is applied

### Scenario AC-005: Architecture preserved

- Given implementation
- When reviewed
- Then no second ThemeProvider; existing provider/CSS variable approach remains

### Scenario AC-006: Non-goals

- Given Approved artifacts
- When implemented
- Then no notes/**C**/constitution/API drift; glass/chart matrix not newly mandated beyond trivial mapping

### Scenario AC-007: Approval gate

- Given artifacts are **Approved**
- When implementation is requested
- Then work proceeds on the approved task list only

## 7. Business Rules

- Palette selection is client-only presentation — frontend.
- Default Forest unchanged.

## 8. Data

No server data. localStorage key unchanged.

## 9. API and Integrations

None.

## 10. Security

No new authz. Theme CSS is not authorization.

## 11. Non-Functional

Prefer maintainable `[data-palette="…"]` blocks consistent with existing `index.css` patterns.

## 12. Dependencies

- Verified palette stack through 033
- Guide file for colors only (ignore guide architecture)

## 13. Failures and Edge Cases

- Removed id in storage → Forest.
- Selector labels with spaces/`&`/`-` — use FR-002 labels.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-004 | AC-001–AC-003 | uiPalettes / CSS tests |
| FR-005 | AC-004 | Provider tests |
| FR-006–FR-009 | AC-005–AC-007 | Review |

## 15. Open Questions

- **Q-231:** Remove Midnight/Obsidian/Noir/Dusk/VioletNight/CyanEdge/Graphite? Status: **Decided**. Yes.
- **Q-232:** Add 12 guide themes with PascalCase mapping? Status: **Decided**. Yes (table FR-002).
- **Q-233:** Keep light solids/gradients + Forest default? Status: **Decided**. Yes.
- **Q-234:** Existing uiPalettes + CSS + eyecandy + localStorage; unknown/removed → Forest? Status: **Decided**. Yes.
- **Q-235:** No second ThemeProvider; no full glass/chart matrix unless trivial? Status: **Decided**. Yes.
- **Q-236:** Exact oklch vs hex in CSS? Status: **Decided**. Guide hex is OK; match neighboring house style in `index.css` (convert to oklch when that is the local convention for adjacent palettes).

Cross-cutting: no notes; no **C**; no constitution; no catalog until confirm; after 038.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-231–Q-236 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
