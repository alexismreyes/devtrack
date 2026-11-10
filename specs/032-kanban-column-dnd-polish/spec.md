# Feature Specification: Kanban Column DnD Polish

- **ID:** 032-kanban-column-dnd-polish
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** Verified `028-status-drag-reorder` (column sortable); Verified `031-within-column-rank` (within-column card sortable + cross-column append); Verified `006-kanban` / `019-ui-polish` (card DnD + click); delivery before Approved `033-dark-theme-retune`

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Material product locks **Q-201–Q-204** are **Decided** (section 15). Implementation may proceed on the approved task list only (delivery order 032 → 033). Frontend-only polish of Kanban **column** drag UX. MUST preserve card cross-column DnD, within-column card sortable (031), column vs card disambiguation, and non-writer no column drag. Do **not** reopen notes / **H** beyond this polish. Do **not** implement **C** or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms. No Prisma/API.

This ID is **032-kanban-column-dnd-polish**.

## 1. Problem

Verified `028` enables OWNER/EDITOR column reorder via `@dnd-kit/sortable` with header-handle listeners and a compact muted name overlay. The grab zone is a small inline pill rather than a clear full-width header strip, status color does not tint the grab zone, and the column overlay does not feel Trello-like (free pointer follow with a rail placeholder). After `031`, card sortable and cross-column moves must keep working without regressing disambiguation or write gates.

## 2. Goals

- Make the **entire column top header strip** the column drag handle and **tint** that strip with the column’s status color so the grab zone is obvious (Q-201).
- Provide a **Trello-like** column drag animation: free-follow mouse `DragOverlay` (pointer may leave the rail in any direction) while **final placement remains horizontal** on the column rail, with a **placeholder/ghost** on the rail (Q-202). Acceptance MUST treat “Trello-like feel” as this free-overlay + horizontal-final model (not a horizontal-locked floating column).
- Overlay content: compact tinted chrome preview, not a live card clone (Q-203). Header tint: soft status-color strip (Q-204).
- Keep `cursor-grab` / `cursor-grabbing` on the writable column header strip (extends 028 Q-192).
- Preserve: card cross-column status PATCH + end append (031), within-column card sortable (031), typed column vs card disambiguation, non-writer no column drag, existing `reorderStatuses` persistence.

## 3. Non-Goals

- Prisma / API / migration / contract changes.
- Reopening within-column rank (**H**) beyond preserving Verified `031` behavior.
- Task notes; app-wide audit (**C**); `specs/005-audit/`.
- Changing `constitution.md`.
- Editing `implemented-features.md` in this batch.
- Dark palette catalog work (owned by `033-dark-theme-retune`).
- Statuses Dialog drag-reorder; Dialog Move up/down stay as secondary (028 Q-193).
- Second DnD library.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR, I want the whole column header strip to look and feel like a grab zone tinted by status color, so I can start a column drag without hunting a tiny handle.

### User Story US-002

As an OWNER or EDITOR, I want column drag to feel Trello-like — a free-follow mouse overlay plus horizontal final placement with a rail ghost — so reorder is clear without locking the overlay to the rail.

### User Story US-003

As a VIEWER (or non-writer), I want columns to remain non-draggable, so polish does not unlock unauthorized reorder.

### User Story US-004

As a board user, I want card cross-column and within-column drags to keep working as in Verified 031, so column polish does not regress card DnD.

## 5. Functional Requirements

- **FR-001:** When `canWrite` / columns are sortable, the **entire top header strip** of each Kanban column MUST be the column drag handle (listeners + grab/grabbing). Nested product controls that are not part of that strip (e.g. Add task) MUST NOT start a column drag (Q-201).
- **FR-002:** The writable column header strip MUST use a **soft status-color tint** from the column’s status `color` token so users can identify the grab zone (Q-201, Q-204). Status name remains readable; the existing status color swatch MAY remain. Non-writable headers MUST NOT present grab affordances.
- **FR-003:** Column drag animation MUST be **Trello-like**: while a column drag is active, a **free-follow mouse `DragOverlay`** MUST track the pointer in any direction (not visually locked to the horizontal rail). Final column **placement / collision / persisted order** MUST remain **horizontal** among columns on the rail only (Q-202). Overlay content MUST be a **compact tinted chrome preview** (tinted header + muted body silhouette / name), **not** a live clone of all task cards (Q-203).
- **FR-004:** During an active column drag, the rail MUST show a **placeholder/ghost** for the source column slot (distinct from the free-follow overlay) (Q-202).
- **FR-005:** Column drag vs task-card drag MUST remain disambiguated (`status-column` vs `task` typed data; header-strip-only column listeners). Starting on a card MUST NOT reorder columns; starting on the column header strip MUST NOT move a task.
- **FR-006:** Card cross-column drop MUST continue to PATCH status and append per Verified `031`. Within-column card sortable / reorder API MUST remain available when filters allow (031).
- **FR-007:** VIEWER / `canWrite=false` MUST NOT get column drag listeners or grab cursors on headers. Backend authz remains authoritative.
- **FR-008:** Column drop that changes order MUST still call existing `reorderStatuses` with the full `statusIds` list; failure MUST revert/reload consistently (028 FR-008 spirit).
- **FR-009:** Frontend tests MUST cover header-strip handle + tint affordance, free overlay / ghost presence as practical, write-gate, and regressions for column vs card disambiguation and card DnD paths.
- **FR-010:** MUST remain frontend-only. MUST NOT implement notes/**C**/constitution edits; MUST NOT edit `implemented-features.md` until later confirm; MUST NOT change Prisma/API.

## 6. Acceptance Criteria

### Scenario AC-001: Full header strip is column handle

- Given an OWNER/EDITOR board with ≥2 columns
- When the pointer interacts with the column top header strip (not a task card)
- Then column drag can start from that strip
- Then grab idle / grabbing active cursors appear on that strip

### Scenario AC-002: Header tinted by status color

- Given a writable board with columns that have status colors
- When column headers render
- Then each writable header strip shows a soft visible tint derived from that column’s status color (Q-204)
- Then the status name remains readable

### Scenario AC-003: Trello-like free-follow overlay + horizontal final placement + rail ghost

- Given a writable board
- When the user drags a column with vertical mouse movement as well as horizontal
- Then the column drag feels **Trello-like**: a free-follow mouse `DragOverlay` tracks the pointer off the rail (any direction), not a rail-locked slide
- Then a placeholder/ghost remains on the rail for the source slot
- Then final placement / drop still only reorders columns **horizontally** via existing sortable + `reorderStatuses`
- Then the overlay is a compact tinted chrome preview (not a live clone of all cards) (Q-203)

### Scenario AC-004: Column vs card disambiguation preserved

- Given a writable board with column and card DnD
- When drag starts from the column header strip
- Then columns reorder, not a task move
- When drag starts from a task card
- Then card DnD runs (cross-column or within-column), not column reorder

### Scenario AC-005: Card DnD regressions preserved

- Given a writable board after this feature
- When a card is dropped into another column
- Then status PATCH + end append behavior from Verified `031` remains
- When cards are reordered within a column (filters allowing)
- Then within-column reorder from Verified `031` remains

### Scenario AC-006: Non-writer no column drag

- Given a VIEWER / `canWrite=false` board
- When columns render
- Then column drag is not available on headers

### Scenario AC-007: Frontend-only / non-goals

- Given this feature
- When implemented
- Then no Prisma/API/constitution changes; no notes/**C**; no `implemented-features.md` edit in this batch; no 033 palette work required here

### Scenario AC-008: Approval gate

- Given these artifacts are **Approved** (Q-201–Q-204 Decided)
- When implementation is requested
- Then work may proceed on the approved task list only

## 7. Business Rules

- Catalog order remains `ProjectStatus.position` via existing reorder — owning domain: `tasks` (unchanged).
- Column drag polish is presentation-only — owning concern: frontend.
- Task within-column and cross-column rules remain Verified `031` — owning domain: `tasks` + existing FE wiring.

## 8. Data

No new business data.

## 9. API and Integrations

None. Reuse existing statuses reorder and task move/reorder clients unchanged.

## 10. Security

No new authz. UI column drag gated by write capability; backend remains authoritative.

## 11. Non-Functional

Prefer keeping keyboard left/right column reorder from 028. Do not regress 019 card click-vs-drag activation. Overlay should remain lightweight enough for normal boards.

## 12. Dependencies

- Existing features: Verified 028, 031, 006, 019
- Follow-on: Approved `033-dark-theme-retune` (sequential after 032)
- Architectural constraints: constitution Articles VII/IX; frontend-only; no contract invention
- External dependencies: existing `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` only

## 13. Failures and Edge Cases

- Single-column board: drag affordance may be inert; no reorder API if order unchanged.
- Nested header controls: only the designated header strip receives column listeners; Add task stays outside.
- Overlay vs source ghost: source rail slot MUST remain identifiable; do not leave two “live” full columns without a ghost.
- Priority/label filters: card reorder omit rules from 031 MUST remain; column reorder unaffected.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001, AC-006 | KanbanBoard tests |
| FR-002 | AC-002 | Header tint class/asserts |
| FR-003–FR-004 | AC-003 | Overlay/ghost tests or review |
| FR-005 | AC-004 | Conflict tests |
| FR-006 | AC-005 | Card DnD regression |
| FR-007 | AC-006 | canWrite=false tests |
| FR-008 | AC-003 | reorderStatuses path |
| FR-009–FR-010 | AC-007–AC-008 | Tests + review + process |

## 15. Open Questions

- **Q-201:** Column drag handle shape and grab-zone cue? Owner: product + frontend. Status: **Decided** (user lock). **Entire column top header strip** is the drag handle; **colorize/tint** the header using the column **status color** so users identify the grab zone.
- **Q-202:** Column overlay / relocation model? Owner: product + frontend. Status: **Decided** (user lock). Animation MUST be **Trello-like**: **free-follow mouse `DragOverlay`** (any direction, not rail-locked); **final column placement remains horizontal** on the rail; show a **placeholder/ghost** on the rail.
- **Q-203:** Overlay visual fidelity? Owner: product + frontend. Status: **Decided** (user lock). Overlay shows a **compact column chrome preview** (tinted header + muted body silhouette / name), **not** a live clone of all task cards (keeps drag light and readable).
- **Q-204:** Header tint strength? Owner: product + frontend. Status: **Decided** (user lock). Use a **soft status-color tint** on the full header strip background (readable foreground; keep/repurpose the status swatch). Exact opacity is implementation detail within “clearly tinted.”

Cross-cutting locks (record, not reopened): preserve card cross-column DnD; preserve within-column card sortable (031); preserve column vs card disambiguation; non-writer no column drag; frontend-only; no Prisma/API; no notes/**H** reopen beyond polish; no **C**; no constitution edit; no `implemented-features.md` until later confirm; 033 owns new dark palettes.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-201–Q-204 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T013)
- Independent review: PASS WITH NON-BLOCKING FINDINGS (Low: AC-003 free-follow covered via overlay/ghost DOM + no axis modifiers, not pointer vertical travel; informational: some test titles still cite older AC ids; reviewer did not re-run suites)
- Verified: Yes
