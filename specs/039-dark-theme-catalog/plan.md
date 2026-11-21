# Implementation Plan: Dark Theme Catalog Refresh

- **Feature ID:** 039-dark-theme-catalog
- **Specification:** `spec.md`
- **Status:** Verified

Inspected 2026-11-11. Frontend-only catalog swap. Guide used for **palettes only**; ignore guide ThemeProvider architecture. Q-231–Q-236 Decided (hex OK / match house CSS style).

## 1. Summary

Remove seven old dark ids from TypeScript catalog + CSS + eyecandy/previews. Add twelve guide-based dark solids under PascalCase ids. Keep light/gradient entries and Forest default/fallback via existing `UiPaletteProvider`.

## 2. Current State

- `frontend/src/theme/uiPalettes.ts` — Forest…Midnight + Obsidian/Noir/Dusk + VioletNight/CyanEdge/Graphite + gradients.
- `frontend/src/index.css` — `[data-palette="…"]` token blocks + eyecandy.
- `UiPaletteProvider` / `UiPaletteSelector` / localStorage `devtrack.uiPalette`.
- Tests assert presence of Obsidian/VioletNight/etc.

## 3. Domain Boundaries

- Owning domain: **frontend presentation** only.
- No backend/Prisma.

## 4. API Contract

None.

## 5. Persistence

None (browser localStorage only).

## 6. Frontend

- Update `UI_PALETTE_IDS` / `UI_PALETTES` per FR-001/FR-002/FR-004.
- Replace CSS blocks for removed ids with twelve new `[data-palette]` definitions using appendix colors mapped to existing variable names.
- Update eyecandy surface images/previews for new ids; delete old dark defs.
- Ensure `isUiPaletteId` / `readStoredUiPalette` Forest-fallback covers removed ids automatically once removed from the union.
- Do **not** add `ThemeProvider` from the guide.
- Optional: map guide chart colors onto existing `--chart-*` only if those vars already exist per palette — otherwise skip (Q-235).

## 7. Files

- `frontend/src/theme/uiPalettes.ts` (+ tests)
- `frontend/src/index.css` (or split theme CSS if already structured)
- `frontend/src/theme/UiPaletteProvider.test.tsx`, `uiEyecandy.test.ts`, `App.test.tsx` (catalog loops)
- `UiPaletteSelector` only if labels need special casing

## 8. Dependencies and Config

None new. No `next-themes`.

## 9. Security and Failures

No authz. Invalid storage → Forest.

## 10. Testing

- Catalog contains twelve new ids and excludes seven removed.
- Selecting a new id persists and sets `data-palette`.
- Stored `Obsidian` / `VioletNight` / unknown → Forest.
- CSS contains token blocks for each new id; eyecandy defs updated.
- Light/gradient ids still present; default Forest.

## 11. Sequence

1. Approved gate.
2. TypeScript catalog update.
3. CSS + eyecandy/previews.
4. Fix tests; typecheck; AC; review; memory.

## 12. Risks

- Large CSS churn / contrast not audited live (informational, same as prior theme work).
- Name collision: removed `Midnight` vs new `MidnightAurora` — intentional.
- Alternatives: keep old darks alongside (rejected — Q-231).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Add 12 palettes | uiPalettes tests |
| AC-002 | Remove 7 | Catalog asserts |
| AC-003 | Keep lights | Catalog asserts |
| AC-004 | Fallback | Provider tests |
| AC-005–AC-006 | Architecture/scope | Review |
| AC-007 | Approval gate | Process |

## 14. Palette appendix (from guide)

Map each guide palette into DevTrack tokens: background→`--background`, surface→`--card`/`--sidebar` as fitting existing pattern, elevated→elevated surfaces, primary/secondary/accent→`--primary`/`--secondary`/`--accent`, foreground/muted/border→matching vars, destructive/success/warning/info when present.

### MidnightAurora (“Midnight Aurora”)

- bg `#080B16`, surface `#11182A`, elevated `#1B2942`, primary `#7C5CFC`, secondary `#36D6C5`, accent `#B5A0FF`, foreground `#EDF0FF`, muted `#8792AF`, border `#28324B`, success `#36D6C5`, warning `#F4C56A`, destructive `#FF647C`, info `#70B8FF`

### ObsidianGold (“Obsidian & Gold”)

- bg `#0C0C0C`, surface `#191919`, elevated `#292929`, primary `#D6AE67`, secondary `#F2D9A0`, accent `#E8E5DF`, foreground `#F5F1E8`, muted `#A49D91`, border `#38332A`, success `#83B89A`, warning `#E5B65E`, destructive `#D96B69`, info `#A0B9CF`

### CyberpunkDreams (“Cyberpunk Dreams”)

- bg `#090817`, surface `#15102B`, elevated `#241747`, primary `#FF3CAC`, secondary `#00E5FF`, accent `#B8FF3D`, foreground `#F5F1FF`, muted `#A59ABF`, border `#38265B`, success `#B8FF3D`, warning `#FFC857`, destructive `#FF3CAC`, info `#00E5FF`

### DeepOcean (“Deep Ocean”)

- bg `#07151C`, surface `#102630`, elevated `#193B46`, primary `#29B6A6`, secondary `#55D6C2`, accent `#D5F3EF`, foreground `#E5F5F4`, muted `#91AAA9`, border `#29474C`, success `#55D6C2`, warning `#EBC477`, destructive `#F07C83`, info `#70B8FF`

### CherryBlossom (“Cherry Blossom”)

- bg `#130D16`, surface `#241724`, elevated `#382137`, primary `#E879A8`, secondary `#F6A6C8`, accent `#C5A5FF`, foreground `#F9EAF2`, muted `#BBA4B3`, border `#493144`, success `#8FD6B3`, warning `#EBC477`, destructive `#F06F91`, info `#A8B7FF`

### ToxicEmerald (“Toxic Emerald”)

- bg `#080E0B`, surface `#101C15`, elevated `#1C3023`, primary `#35D07F`, secondary `#A3FF6F`, accent `#D8FFE5`, foreground `#EAF7EE`, muted `#94AA9B`, border `#294634`, success `#35D07F`, warning `#E7C45C`, destructive `#FF687B`, info `#6ED4DD`

### CosmicLavender (“Cosmic Lavender”)

- bg `#0D0B19`, surface `#19152B`, elevated `#292244`, primary `#9D7BFF`, secondary `#C4A7FF`, accent `#70B8FF`, foreground `#F0ECFF`, muted `#A49ABF`, border `#393050`, success `#78D6B2`, warning `#F2C66D`, destructive `#F4779C`, info `#70B8FF`

### NeoGlass (“Neo-Glass”)

- bg `#080B18`, surface `#11182B`, elevated `#202A45`, primary `#8B7CFF`, secondary `#50E3D0`, accent `#B8C6FF`, foreground `#F1F3FF`, muted `#A0A9C4`, border `#526080`, success `#50E3D0`, warning `#F5C76B`, destructive `#FF718F`, info `#78BFFF`
- Optional glass vars only if trivially unused elsewhere — not required for AC.

### Dribbble (“Dribbble Aesthetic”)

- bg `#101116`, surface `#191B24`, elevated `#242735`, primary `#A78BFA`, secondary `#F472B6`, accent `#67E8F9`, foreground `#F8FAFC`, muted `#9CA3B5`, border `#303442`, success `#4ADE80`, warning `#FBBF24`, destructive `#FB7185`, info `#67E8F9`

### OledBlack (“OLED Black”)

- bg `#000000`, surface `#090909`, elevated `#141414`, primary `#8B7CFF`, secondary `#37D9C3`, accent `#FFFFFF`, foreground `#F5F5F5`, muted `#909090`, border `#252525`, success `#37D9C3`, warning `#F5C451`, destructive `#FF5F6D`, info `#66BFFF`

### LuxuryDark (“Luxury Dark”)

- bg `#11100F`, surface `#1C1A18`, elevated `#2A2622`, primary `#C49A62`, secondary `#E7CDA4`, accent `#A98B6D`, foreground `#F5EFE7`, muted `#A79B8C`, border `#42392F`, success `#8BAF91`, warning `#D6A85C`, destructive `#CE7770`, info `#92AFC2`

### CyberAesthetic (“Cyber Aesthetic”)

- bg `#080A14`, surface `#10162A`, elevated `#1B2542`, primary `#4D7CFE`, secondary `#00E5FF`, accent `#C77DFF`, foreground `#F0F4FF`, muted `#929FBE`, border `#29365B`, success `#35E69B`, warning `#FFD166`, destructive `#FF5577`, info `#00E5FF`

## 15. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
