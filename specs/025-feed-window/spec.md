# Feature Specification: Feed Window

- **ID:** 025-feed-window
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** 021-feed-pagination (Verified; **Load more append UX superseded**); 010/011/013/014 (Verified feeds); delivery after 023–024 in backlog order

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. §15 questions are **Decided** (locked). This feature **amends** Verified `021-feed-pagination` UI behavior: Comments & activity MUST show **exactly one page of 5** at a time with **Prev/Next** (or equivalent) **replacing** the list window — not infinite vertical append (Q1 option 1). Keep cursor/limit API (default 5, max 50); FE cursor/window stack for Prev (no `prevCursor` unless gap). Do **not** invent task notes. Do **not** implement **H**, **C**, or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms.

This ID is **025-feed-window**.

## 1. Problem

Verified `021-feed-pagination` loads first pages (limit 5) and a shared **Load more** **appends** older items, so the interleaved Comments & activity list grows without bound in the UI. Users need a fixed **window** of one page of 5 with bidirectional navigation that **replaces** the visible list.

## 2. Goals

- Amend 021 UI so Comments & activity shows **exactly one page of 5** items at a time (not infinite append).
- Replace shared Load more with **Prev/Next** (or equivalent) that **replaces** the list window (Q1 option 1).
- Keep existing cursor/limit list API (default **5**, max **50**, `nextCursor`) unless a material gap forces an additive amend; prefer FE cursor-stack / refetch strategies for Prev.
- Preserve 013/014/021 rules: interleaved newest-first; omit `COMMENT_ADDED`; FR-010-style reset to first window after comment create/edit/delete and activity reloads.
- Own under existing **`tasks`** domain / TaskDetail UI; no new domain.

## 3. Non-Goals

- Task notes; **H**; **C**; `specs/005-audit/`.
- Changing `constitution.md`.
- Changing comment write contracts or activity emission rules.
- Offset/`page` number as the primary API (cursor/limit remains).
- Infinite scroll.
- Paginate checklists/attachments/labels/members here.
- Dashboard overview (026); password change (027); cover-on-create (024); 023 eyecandy beyond consuming chrome.
- Editing `implemented-features.md` in this batch.

## 4. Actors and User Stories

### User Story US-001

As a task reader, I want Comments & activity to show only one page of 5 at a time, so that the panel stays bounded.

### User Story US-002

As a task reader, I want Prev/Next to replace the visible window, so that I can move through history without appending forever.

### User Story US-003

As a VIEWER, I want the same read authz as today, so that UI chrome is not authorization.

## 5. Functional Requirements

- **FR-001:** Comments & activity MUST display **at most 5** interleaved timeline items in the current window (omit `COMMENT_ADDED` from activity rows as in 013 Q-100). MUST NOT unbounded-append older pages into a growing list (supersedes 021 Load more append UX / AC-006 append expectation). Q-182: interleave from **current** fetched pages only, then show newest ≤5; Next/Prev **replace** (no append buffer).
- **FR-002:** UI MUST provide **Prev** and **Next** (or equivalent accessible controls). Next moves to the older window; Prev returns to the newer window. Activating either MUST **replace** the visible list contents for that window.
- **FR-003:** Keep unchanged `GET .../comments` and `GET .../activity` cursor/limit contracts (default limit 5, max 50, `nextCursor`). Frontend MUST maintain a cursor/window stack (or refetch from start) for Prev (Q-181). No `prevCursor` API unless a material gap is proven; then amend before coding.
- **FR-004:** Initial open MUST show the newest window (first page semantics of 021 Q-166). After comment create/edit/delete or 014 activity reload, UI MUST reset to the newest window and clear window/cursor stack (amend 021 FR-010 to window model).
- **FR-005:** Authz/empty/loading/error behaviors remain as Verified list rules. Soft-deleted comments omitted. `credentials: 'include'`.
- **FR-006:** Next MUST be disabled/hidden when no older page exists; Prev disabled/hidden on the newest window.
- **FR-007:** Domain ownership stays **`tasks`**. No Prisma migration expected. No generic repository.
- **FR-008:** Critical window replace, limit-5 display, Prev/Next enablement, and reset-on-mutation MUST be tested.
- **FR-009:** MUST NOT implement task notes, **H**, **C**, or change `constitution.md`. MUST document supersession of 021 Load more append UX.

## 6. Acceptance Criteria

### Scenario AC-001: Window size 5

- Given enough comments/activity to exceed 5 interleaved items
- When TaskDetail Comments & activity opens
- Then at most **5** timeline items are visible

### Scenario AC-002: Next replaces window

- Given a newer window with older items available
- When the user activates Next
- Then the list is replaced with the next older window (no append of prior window items)

### Scenario AC-003: Prev restores newer window

- Given the user has moved to an older window
- When they activate Prev
- Then the newer window is shown again (replace, not append)

### Scenario AC-004: Controls disabled at ends

- Given the newest window
- Then Prev is unavailable
- Given the oldest reachable window
- Then Next is unavailable

### Scenario AC-005: Reset after mutations

- Given the user navigated to an older window
- When they create/edit/delete a comment or trigger 014 activity reload
- Then the UI resets to the newest window

### Scenario AC-006: API preference

- Given Decided prefer-keep cursor/limit
- When implemented
- Then list endpoints remain cursor/limit unless an approved amend adds prev support
- Then 021 append Load more UX is no longer required

### Scenario AC-007: Non-goals

- Given this feature
- When implemented
- Then no task notes / **H** / **C** / constitution edits / offset pagination as primary contract

## 7. Business Rules

- Visible window size 5 for interleaved Comments & activity — frontend over `tasks` list pages.
- Newest-first ordering within a window — `tasks` (unchanged).
- List authz = task read — `tasks` via membership port.

## 8. Data

No new persisted entities. Cursors remain opaque tokens from `createdAt` + id tie-break (021).

## 9. API and Integrations

- Prefer existing paginated GETs. Document any Approve-only additive `prevCursor` if required after implementation discovery (stop and amend first).

## 10. Security

- Session + `requireTaskRead` unchanged.
- Cap limit 50. Cursor scoped/validated to task.

## 11. Non-Functional

Bounded DOM list size. Educational cursor-stack Prev over new API when possible.

## 12. Dependencies

- Existing features: 021 Verified; 013/014 panel
- Architectural constraints: modular monolith; no new domain
- External dependencies: none

## 13. Failures and Edge Cases

- One feed exhausted while the other has pages — Next advances feeds that still have `nextCursor`; window still ≤5 after re-interleave (plan owns exact merge algorithm; must not reintroduce unbounded append).
- Empty both feeds — empty state; both controls unavailable.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–002  | AC-001–AC-003       | Frontend tests |
| FR-003      | AC-006              | Contract review |
| FR-004–006  | AC-004–AC-005       | Frontend tests |
| FR-007–009  | AC-007              | Review |

## 15. Open Questions

- **Q-181:** Prev implementation strategy. Owner: frontend + tasks. Status: **Decided (locked)** — FE cursor/window stack (snapshot stack); **no** `prevCursor` API unless a material gap is proven; then amend before coding.
- **Q-182:** Exact interleaved window construction when dual feeds return up to 5 each. Owner: product + frontend. Status: **Decided (locked)** — build interleaved newest-first from the **current** fetched pages (not historical append buffer), then display the newest **≤5** of that interleave as the window; Next fetches older pages for feeds that have `nextCursor` and **replaces**; do not keep an ever-growing append buffer.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-181, Q-182 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T011)
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
