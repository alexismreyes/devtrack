# Feature Specification: Checklist Item Window

- **ID:** 038-checklist-window
- **Status:** Verified
- **Created:** 2026-11-11
- **Related features:** Verified `015-task-checklists`; `025-feed-window` (Prev/Next FE stack pattern); delivery after `037`

These artifacts are **Approved**. Locks **Q-226–Q-230** Decided. Checklist items show a paginated window of **10** visible with Prev/Next like 025. Inspection: checklist GET nests **all** items today — prefer extending API with cursor/limit for items. No notes/**C**/constitution/`implemented-features.md` until later confirm.

## 1. Problem

Task checklists load every item nested in `GET .../checklists`. Long checklists make TaskDetail tall and hard to scan. Users need a fixed window of 10 items with Prev/Next replace navigation.

## 2. Goals

- Show at most **10** checklist items visible per checklist at a time (Q-226).
- Prev/Next (or equivalent) **replace** the visible window, FE stack pattern like 025 (Q-227).
- Prefer **server page** for items via additive cursor/limit item list API because checklist GET returns all items today (Q-228).
- Keep checklist create/rename/delete and item mutate contracts otherwise intact.

## 3. Non-Goals

- Changing comments/activity window (025) size.
- Notes; **C**; constitution; catalog until confirm.
- Infinite scroll / unbounded append of items.
- Hiding checked items as a filter (unless already present — do not invent).

## 4. Actors and User Stories

### User Story US-001

As a task reader/writer, I want checklist items shown 10 at a time, so long lists stay manageable.

### User Story US-002

As a task reader/writer, I want Prev/Next through checklist items, so I can move through the list without growing the panel forever.

## 5. Functional Requirements

- **FR-001:** Each checklist UI block MUST display at most **10** items in the current window (Q-226).
- **FR-002:** UI MUST provide Prev/Next that **replace** the visible item window (not append) (Q-227).
- **FR-003:** **Chosen API approach (Q-228):** Extend `tasks` checklist APIs with **cursor/limit pagination for items** (default limit 10, max ≤50). Shape: additive `GET /api/tasks/:taskId/checklists/:checklistId/items?cursor&limit` → `{ items, nextCursor }`, ordered `createdAt asc` (same as today).
- **FR-003a:** Checklist list GET MUST **not** embed full item arrays (omit items or empty). Additive `itemCount` and `checkedCount` on checklist list DTO for progress without loading all pages (Q-229).
- **FR-004:** FE maintains a cursor/window stack for Prev (like 025); no `prevCursor` unless a proven gap forces amend.
- **FR-005:** After item add/delete/check (and other item) mutations that affect the window, clear stack and reload the **first page** (limit 10) for that checklist (Q-230).
- **FR-006:** Authz unchanged: list/read `requireTaskRead`; mutate `requireTaskWrite`; archived rules unchanged.
- **FR-007:** Domain ownership remains **`tasks`**. No new domain.
- **FR-008:** Critical window size, Prev/Next replace, and API pagination MUST be tested.
- **FR-009:** MUST NOT implement notes/**C** or change `constitution.md`. MUST NOT edit `implemented-features.md` until later confirm.

## 6. Acceptance Criteria

### Scenario AC-001: Window size 10

- Given a checklist with more than 10 items
- When the checklist panel renders
- Then at most 10 items are visible

### Scenario AC-002: Next replaces window

- Given a newer/earlier window with more items available
- When Next is activated
- Then the item list is replaced (no append of prior window)

### Scenario AC-003: Prev restores prior window

- Given the user moved via Next
- When Prev is activated
- Then the previous window is restored via FE stack/refetch

### Scenario AC-004: Item list API pagination

- Given many items
- When `GET .../items?limit=10` (or approved contract)
- Then at most 10 items return with `nextCursor` when more exist

### Scenario AC-005: Authz unchanged

- Given VIEWER vs writer
- When listing/mutating
- Then existing read/write archived rules hold

### Scenario AC-006: Non-goals

- Given Approved artifacts
- When implemented
- Then no notes/**C**/constitution drift; 025 feed window unchanged

### Scenario AC-007: Approval gate

- Given artifacts are **Approved**
- When implementation is requested
- Then work proceeds on the approved task list only

## 7. Business Rules

- Checklist/item invariants remain `tasks` domain.
- Pagination is presentation + list contract; does not change item text/checked rules.

## 8. Data

No new Prisma models expected. May use existing item order fields (`createdAt`, id) for cursors.

## 9. API and Integrations

- Additive item list pagination endpoint (FR-003).
- Existing item POST/PATCH/DELETE remain.
- Checklist list DTO: no embedded items; `itemCount`/`checkedCount` (Q-229).

## 10. Security

Same task authz ports; no secrets in cursors beyond opaque pagination tokens already used in 021 style.

## 11. Non-Functional

Prefer server paging for large lists over loading all items then slicing on FE.

## 12. Dependencies

- Verified 015 checklists; 021/025 cursor patterns
- Constitution: Zod at boundary; domain repository

## 13. Failures and Edge Cases

- Empty checklist — no Prev/Next or disabled.
- Delete last item on a page — reset/clamp window safely.
- Invalid cursor → 400 validation.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-002, FR-004–FR-005 | AC-001–AC-003 | FE tests |
| FR-003, FR-003a, FR-006–FR-007 | AC-004–AC-005 | API tests |
| FR-008–FR-009 | AC-006–AC-007 | Review |

## 15. Open Questions

- **Q-226:** Window size 10? Status: **Decided**. Yes.
- **Q-227:** Prev/Next FE stack like 025? Status: **Decided**. Yes.
- **Q-228:** API vs FE-only window? Status: **Decided (direction)**. Prefer extending API with cursor/limit for items because GET checklists returns all items today.
- **Q-229:** Checklist list GET embedding after pagination? Status: **Decided**. No embedded items (omit or empty array). Additive `itemCount` / `checkedCount` on checklist list DTO. Clients load windows via item list GET.
- **Q-230:** Reset rule after item mutate? Status: **Decided**. After mutate, clear stack and fetch first page (limit 10) for that checklist.

Cross-cutting: no notes; no **C**; no constitution; no catalog until confirm; after 037.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-226–Q-230 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
