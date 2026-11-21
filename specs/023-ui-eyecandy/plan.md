# Implementation Plan: UI Eyecandy

- **Feature ID:** 023-ui-eyecandy
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Frontend-only. **Locked:** Q-177 dark palettes `Obsidian`, `Noir`, `Dusk`; Q-178 visual polish only (026 owns overview rewrite). No Prisma/API. No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms later.

## 1. Summary

Polish presentation: checklist pointer + non-flat checklist surfaces; add 2–3 dark palettes to `uiPalettes` + CSS tokens; gradient treatments on current dashboard cards and profile card. Stop before any 026 aggregate/layout work.

## 2. Current State

Inspected 2026-11-10:

- `frontend/src/theme/uiPalettes.ts`: Forest…Glacier (5 solid + 7 gradient); `devtrack.uiPalette` localStorage
- 019: Button/Link pointer baseline; checklist controls not explicitly asserted
- 016: checklist blocks use `bg-card` (+ border)
- Dashboard: `Card` wrappers around 008 totals + 022 Recharts
- Profile: shadcn `Card` on `ProfilePage`

## 3. Domain Boundaries

- Owning concern: **frontend presentation** only
- No backend domain work; no new domain
- Cross-domain interfaces: none
- Controllers/services/repos: unchanged

## 4. API Contract

None. No endpoint changes.

## 5. Persistence

None. No Prisma. No User palette field.

## 6. Frontend

- Extend pointer classes on checklist interactive elements (`TaskChecklistsPanel` / related) if not inherited
- Replace flat checklist block surface with palette-token gradient/tint (keep readable contrast)
- Add dark palette ids `Obsidian`, `Noir`, `Dusk` to `UI_PALETTE_IDS` / `UI_PALETTES` and matching `:root[data-palette=…]` CSS variable sets (Q-177 Decided)
- Dashboard cards: gradient utility classes / CSS vars on existing Card wrappers (008/022 structure retained)
- Profile card: gradient background treatment
- Selector automatically lists new catalog entries via `UI_PALETTES` map
- Keep Forest default; invalid → Forest; logout does not clear

## 7. Files

- `frontend/src/theme/uiPalettes.ts` — catalog ids
- Global/theme CSS (existing palette token files) — dark palette variables
- Checklist panel / TaskDetail checklist block classes
- `DashboardPage` / card wrappers; `ProfilePage` card
- Tests: catalog ids, checklist cursor/surface, dashboard/profile gradient class presence

## 8. Dependencies and Config

- New packages: none
- Env/Docker: none

## 9. Security and Failures

- Client-only theme storage unchanged
- Do not weaken auth chrome

## 10. Testing

- Frontend unit/UI: new palette ids selectable + stored; checklist pointer; checklist not `bg-card`-only; dashboard/profile gradient classes
- Backend: N/A

## 11. Sequence

1. Inspect checklist/dashboard/profile/theme files (T001)
2. Approval gate (T002)
3. Palettes + CSS tokens
4. Checklist cursor + surfaces
5. Dashboard + profile gradients
6. Tests + typecheck + review + memory (propose catalog; wait for confirm)

## 12. Risks

- Contrast regression on new dark palettes / gradients — mitigate with token review and spot asserts
- Overlap with 026 — keep 023 visual-only; do not redesign KPI layout

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001               | Checklist controls cursor | Frontend test |
| AC-002               | Checklist block surface | Frontend test |
| AC-003               | uiPalettes + CSS | Catalog tests |
| AC-004               | Dashboard cards | UI test |
| AC-005               | Profile card | UI test |
| AC-006               | Scope gate | Review |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes (executed T001–T013)
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes; Blocking: no
