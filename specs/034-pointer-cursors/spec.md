# Feature Specification: Pointer Cursors

- **ID:** 034-pointer-cursors
- **Status:** Verified
- **Created:** 2026-11-11
- **Related features:** Verified `019-ui-polish` (Button/link pointer); `023-ui-eyecandy` (checklist pointer); `030-cover-pointer` (cover file pickers); `031`/`032` (Kanban card/column DnD cursors); delivery after Verified `033`

These artifacts are **Verified**. Material locks **Q-208–Q-210** are **Decided** (section 15). Frontend-only cursor polish. Do **not** invent task notes. Do **not** implement **C** or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until later user confirm.

## 1. Problem

Pointer affordances remain inconsistent on a few interactive surfaces: the TaskDetail Attachment upload control, Kanban task cards (idle still uses grab when sortable), and label/status color swatches. Users expect a finger pointer on clickable controls and grabbing only while a card drag is active.

## 2. Goals

- Apply **`cursor-pointer`** on the Attachment button / attachment file picker surface (Q-208).
- Kanban task cards: **idle/hover = `cursor-pointer`**; **while dragging = `cursor-grabbing`**; keep current drag behavior otherwise (Q-209).
- Apply **`cursor-pointer`** on status color swatches and label color swatches (Q-210).
- Stay frontend-only: no API/Prisma/DnD library changes.

## 3. Non-Goals

- Task notes; **C**; `specs/005-audit/`.
- Changing `constitution.md`.
- Changing `@dnd-kit` activation, suppress-select-after-drag, column grab/grabbing (028/032), or reorder APIs.
- Redesigning Attachment popover, swatch picker layout, or Kanban card chrome beyond cursor classes.
- Editing `implemented-features.md` in this batch.

## 4. Actors and User Stories

### User Story US-001

As a task writer, I want the Attachment control to show a pointer cursor, so it feels clickable like other product actions.

### User Story US-002

As a board collaborator, I want Kanban cards to show a pointer when idle and grabbing only while dragging, so open-vs-drag affordance is clear.

### User Story US-003

As a catalog editor, I want color swatches to show a pointer cursor, so picking a color feels interactive.

## 5. Functional Requirements

- **FR-001:** TaskDetail Attachment trigger Button and the attachment file input inside the Attachment popover MUST present pointer when enabled (`cursor-pointer` and `file:cursor-pointer` on the file input as needed) (Q-208).
- **FR-002:** Kanban task cards MUST use **`cursor-pointer`** when idle/hover (including when sortable is enabled). While a card drag is active, the dragged card (and overlay if applicable) MUST use **`cursor-grabbing`**. Existing drag/select behavior MUST remain (Q-209).
- **FR-003:** Label and status color swatch buttons in `LabelColorSwatchPicker` (and any equivalent status color swatch using that picker) MUST use **`cursor-pointer`** when enabled (Q-210).
- **FR-004:** Disabled/busy controls MAY keep non-pointer disabled styling.
- **FR-005:** MUST NOT change API, Prisma, Compose, or column-header grab cursors beyond this scope.
- **FR-006:** Critical cursor classes MUST be covered by frontend tests.
- **FR-007:** MUST NOT implement notes/**C** or change `constitution.md`. MUST NOT edit `implemented-features.md` until later confirm.

## 6. Acceptance Criteria

### Scenario AC-001: Attachment pointer

- Given TaskDetail Attachment control enabled
- When the user hovers the Attachment button and the attachment file input
- Then each shows pointer (`cursor-pointer` / `file:cursor-pointer` as applicable)

### Scenario AC-002: Kanban idle pointer

- Given a live sortable Kanban task card not being dragged
- When the user hovers the card
- Then the cursor is pointer (not grab)

### Scenario AC-003: Kanban dragging grabbing

- Given a card drag is active
- When inspecting the dragging card / overlay
- Then the cursor is grabbing
- Then drop/select/suppress behavior remains as Verified 019/031

### Scenario AC-004: Color swatches pointer

- Given Labels or Statuses color swatch picker enabled
- When the user hovers a swatch
- Then the cursor is pointer

### Scenario AC-005: Non-goals

- Given Approved artifacts
- When implemented
- Then no Prisma/API/constitution drift; notes/**C**/catalog edits out of scope

### Scenario AC-006: Approval gate

- Given artifacts are **Approved**
- When implementation is requested
- Then work proceeds on the approved task list only

## 7. Business Rules

- Cursor polish is presentation-only — owning domain: frontend.
- DnD semantics remain Verified 019/031/032 — unchanged except card idle cursor class.

## 8. Data

No new business data.

## 9. API and Integrations

No new endpoints. No intentional contract changes.

## 10. Security

No new authz. Cursor is not authorization.

## 11. Non-Functional

Prefer targeted class additions; avoid global Input/Button churn beyond named surfaces.

## 12. Dependencies

- Existing features: Verified 019, 023, 030, 031, 032, 033
- Architectural constraints: constitution Article VII; no contract invention
- External dependencies: none new

## 13. Failures and Edge Cases

- Non-sortable / VIEWER cards already pointer — keep pointer.
- Column headers keep grab/grabbing (out of scope).
- Native file-button sub-parts may need `file:cursor-pointer`.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001 | AttachmentsPopover / TaskDetail tests |
| FR-002 | AC-002, AC-003 | KanbanBoard tests |
| FR-003 | AC-004 | LabelColorSwatchPicker tests |
| FR-004–FR-007 | AC-005–AC-006 | Review + process |

## 15. Open Questions

- **Q-208:** Attachment pointer scope? Owner: product. Status: **Decided**. Attachment button + attachment file picker → `cursor-pointer` / `file:cursor-pointer`.
- **Q-209:** Kanban card cursors? Owner: product. Status: **Decided**. Idle/hover = pointer; while dragging = grabbing; keep current drag behavior.
- **Q-210:** Swatch pointers? Owner: product. Status: **Decided**. Status and label color swatches → pointer.

Cross-cutting locks: no notes; no **C**; no constitution edit; no `implemented-features.md` until later confirm; sequential after 033.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-208–Q-210 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
