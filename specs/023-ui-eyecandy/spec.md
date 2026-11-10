# Feature Specification: UI Eyecandy

- **ID:** 023-ui-eyecandy
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** 007-workspace-ui (Verified palettes); 016-ui-refinements (Verified checklist `bg-card`); 019-ui-polish (Verified pointer baseline); 015-task-checklists (Verified); 008/022-dashboard (Verified cards/charts — visual polish only here; layout/data rewrite is 026); delivery before 024–027

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Implementation may proceed. §15 questions are **Decided** (locked). Do **not** invent task notes. Do **not** implement within-column rank (**H**), app-wide audit (**C**), or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms. Full dashboard overview rewrite belongs in `026-dashboard-overview`.

This ID is **023-ui-eyecandy**. Frontend presentation polish only.

## 1. Problem

Verified DevTrack through `022-dashboard-v2` still has flat presentation gaps: checklist interactive controls do not consistently inherit the 019 pointer/hand cursor; checklist blocks remain flat `bg-card`/white-feeling surfaces; the localStorage `uiPalette` catalog lacks additional **dark** themes; dashboard and profile cards read as plain white/`bg-card` panels rather than gradient eyecandy that fits the existing palette token system.

## 2. Goals

- Extend 019 pointer/hand cursor to **checklist** interactive controls (checkboxes, add/delete/create controls, and other enabled checklist product controls).
- Give checklist blocks non-flat background eyecandy that fits the existing CSS-variable palette system (not flat white / `bg-card`-only).
- Add **2–3** additional **dark** theme palettes to the existing localStorage `devtrack.uiPalette` catalog (same persistence rules as Q-041/Q-042).
- Apply **color gradient** eyecandy to existing `/dashboard` summary/chart cards (visual polish only; no layout/data rewrite — that is 026).
- Apply **background gradient** eyecandy to the `/profile` profile card.

## 3. Non-Goals

- Task notes field.
- Within-column rank (**H**); app-wide audit (**C**); `specs/005-audit/`.
- Changing `constitution.md`.
- Cover-on-create (024); feed window Prev/Next (025); dashboard membership aggregates / KPI redesign (026); password change (027).
- Prisma/schema/API contract changes; new domains; new chart libraries.
- Replacing the palette storage model (localStorage id only remains).
- Full dashboard overview redesign toward `templates/dashboard_template.png` (026).
- Editing `implemented-features.md` in this batch.

## 4. Actors and User Stories

### User Story US-001

As a task collaborator, I want checklist controls to show a pointer cursor, so that interactive checklist UI matches other product controls.

### User Story US-002

As a user of TaskDetail, I want checklist blocks to have subtle eyecandy backgrounds, so that checklists are not flat white panels.

### User Story US-003

As a user choosing Color palette, I want additional dark themes in the catalog, so that I can keep a darker whole-UI look.

### User Story US-004

As an authenticated user on `/dashboard` or `/profile`, I want gradient card surfaces, so that those screens feel polished within the current palette system.

## 5. Functional Requirements

- **FR-001:** Enabled checklist interactive controls (item checkboxes, add-item / delete / create-checklist product buttons and similar enabled controls in checklist UI) MUST present a pointer/hand cursor, extending Verified 019 Q-151.
- **FR-002:** Checklist block containers MUST use palette-fitting background eyecandy (gradient and/or tinted surface via existing CSS variables). They MUST NOT rely on flat white / `bg-card`-only as the sole surface treatment (amends 016 Q-129 presentation for checklist blocks).
- **FR-003:** The documented `UI_PALETTES` / `UI_PALETTE_IDS` catalog MUST gain **2–3** new **dark** theme entries. Persistence remains localStorage key `devtrack.uiPalette` only; invalid/missing → Forest; logout does not clear (Q-041/Q-042 unchanged).
- **FR-004:** `/dashboard` existing summary and chart **cards** MUST use color **gradients** (palette-token based), not plain white/`bg-card`-only cards. MUST NOT rewrite dashboard data contracts, membership scope, or KPI layout (026 owns that).
- **FR-005:** `/profile` profile **card** MUST use a background gradient eyecandy treatment consistent with the palette system.
- **FR-006:** MUST remain frontend-only: no Prisma, migrations, or API contract changes. MUST NOT change `constitution.md`. MUST NOT implement task notes, **H**, **C**, 024–027 scope.
- **FR-007:** Critical cursor and catalog presence behaviors MUST be covered by frontend tests (Testing Library) where practical.

## 6. Acceptance Criteria

### Scenario AC-001: Checklist pointer cursor

- Given TaskDetail with checklist controls
- When the user hovers an enabled checklist checkbox or product control
- Then the cursor is pointer/hand

### Scenario AC-002: Checklist block eyecandy

- Given a rendered checklist block
- When inspected in the UI
- Then its surface is not flat white/`bg-card`-only; it uses palette-fitting eyecandy

### Scenario AC-003: Dark palettes added

- Given the Color palette selector
- When the catalog is listed
- Then 2–3 new dark palette ids are selectable, persist under `devtrack.uiPalette`, and apply on the document root

### Scenario AC-004: Dashboard card gradients

- Given `/dashboard` with existing 008/022 cards
- When rendered
- Then cards use gradient surfaces (not plain white-only)

### Scenario AC-005: Profile card gradient

- Given `/profile`
- When the profile card renders
- Then it uses background gradient eyecandy

### Scenario AC-006: Non-goals / frontend-only

- Given this feature
- When implemented
- Then no API/Prisma/constitution changes; no 024–027 product scope; no task notes / **H** / **C**

## 7. Business Rules

- Palette id persistence remains client-only — owning concern: frontend (no users/auth schema).
- Pointer on enabled interactive controls; disabled MAY keep non-pointer styling — frontend presentation.

## 8. Data

No new persisted server data. Catalog ids are code constants; selected id remains localStorage only.

## 9. API and Integrations

None. No HTTP contract changes.

## 10. Security

No authz changes. Do not introduce server-stored theme preferences.

## 11. Non-Functional

Eyecandy MUST remain explainable via existing CSS variables / `data-palette` tokens. Prefer subtle gradients over glow/noise.

## 12. Dependencies

- Existing features: 015, 016, 019, 007 palettes, 008/022 dashboard, profile page
- Architectural constraints: constitution Articles VII/X; frontend under `frontend/`
- External dependencies: none new

## 13. Failures and Edge Cases

- Unknown stored palette id → Forest (unchanged).
- New dark palettes MUST define required CSS tokens so components do not regress contrast unusably (spot-check in tests where practical; full live contrast audit not required).

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001      | AC-001              | Frontend test / class assert |
| FR-002      | AC-002              | Frontend test / class assert |
| FR-003      | AC-003              | Catalog + selector tests |
| FR-004      | AC-004              | Dashboard UI test |
| FR-005      | AC-005              | Profile UI test |
| FR-006–007  | AC-006              | Review + tests |

## 15. Open Questions

- **Q-177:** Exact ids/labels for the 2–3 new dark palettes. Owner: product + frontend. Status: **Decided (locked)** — `Obsidian`, `Noir`, `Dusk` (dark catalog entries with CSS tokens fitting the existing system).
- **Q-178:** Dashboard gradient polish vs 026 rewrite overlap. Owner: product. Status: **Decided (locked)** — 023 is visual polish on current cards only; 026 owns overview layout/data.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-177, Q-178 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T013)
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes; Blocking: no; Failed ACs: none
