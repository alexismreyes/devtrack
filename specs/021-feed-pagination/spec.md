# Feature Specification: Feed Pagination

- **ID:** 021-feed-pagination
- **Status:** Verified
- **Created:** 2026-11-09
- **Related features:** 010-task-comments (Verified); 011-task-activity (Verified; **Q-078 / AC-016 full-list superseded**); 013-task-detail-layout (Verified interleaved panel); 014–018 (Verified); delivery after Approved 019–020 in backlog order

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Material product questions **Q-162–Q-168** are **Decided** (section 15). Implementation may proceed on T001–T014 only. This feature **changes** prior full-list list contracts for comments and activity (notably 011 Q-078 / AC-016 and 010 full-list list assumption). Do **not** invent task notes. Do **not** implement **H**, **C**, or `specs/005-audit/`. Do **not** change `constitution.md`.

This ID is **021-feed-pagination**.

## 1. Problem

Verified comments (`010`) and activity (`011`) return **full** collections. TaskDetail’s “Comments & activity” panel (013/014) loads both feeds entirely. As discussion and events grow, payloads and UI lists become unbounded. Users need **cursor/limit pagination** with a small default page size and **Load more** UX for both feeds.

## 2. Goals

- Paginate **task comments** and **task activity** list endpoints with **cursor + limit** query params (Q-162, Q-163).
- Default **limit = 5** when omitted (Q-163).
- Provide **Load more** in TaskDetail UI for both feeds (Q-164), composing with the existing interleaved “Comments & activity” panel without inventing a new route.
- Supersede 011 **Q-078 / AC-016** “full list; no pagination” and the 010 full-list list contract for `GET` comments (Q-165). Keep create/edit/soft-delete comment contracts and activity emission rules otherwise intact.
- Reuse `TaskAuthorizationPort` read rules; no new domain; additive contract evolution only (no Prisma schema required unless indexing/cursor storage demands it — none expected).
- Leave task notes, project covers (020), dashboard charts (022), **H**, and **C** out.

## 3. Non-Goals

- Task notes.
- App-wide audit (**C**); `specs/005-audit/`.
- Within-column rank (**H**).
- Changing activity event kinds, emission transactions, or comment soft-delete/edit rules.
- Offset/`page` number pagination as the primary contract (cursor/limit is Decided).
- Paginate checklists, attachments, labels, members, or project lists in this folder.
- Changing `constitution.md`.
- New TaskDetail destinations.

## 4. Actors and User Stories

### User Story US-001

As a task reader, I want comments to load in small pages with Load more, so that long threads stay responsive.

### User Story US-002

As a task reader, I want activity to load in small pages with Load more, so that long histories stay responsive.

### User Story US-003

As a VIEWER, I want pagination to respect the same read authz as today, so that hiding UI is not authorization.

### User Story US-004

As a developer, I want a clear cursor contract and tests replacing full-list assumptions, so that 010/011 clients do not silently break.

## 5. Functional Requirements

- **FR-001:** `GET /api/tasks/:taskId/comments` MUST accept optional `cursor` and `limit` query params (Q-163). Default `limit` MUST be **5** when omitted. Invalid limit/cursor → `400` `VALIDATION_ERROR`.
- **FR-002:** `GET /api/tasks/:taskId/activity` MUST accept optional `cursor` and `limit` with the same default **5** (Q-163). Invalid → `400`.
- **FR-003:** Successful list responses MUST return the page of items plus a pagination continuation signal (e.g. `nextCursor: string | null` — exact DTO in plan) so clients can Load more (Q-164). Empty page remains `200`.
- **FR-004:** Authz/unauth/not-found/archived-read behavior MUST remain as Verified for list (session + `requireTaskRead`; soft-deleted task → `404`; non-member → `403`; unauthenticated → `401`).
- **FR-005:** Soft-deleted comments remain omitted from comment pages. Activity kinds and emission rules unchanged. Interleaved UI MAY continue omitting `COMMENT_ADDED` rows (013 Q-100).
- **FR-006:** Ordering MUST follow Decided Q-166–Q-167: both feeds’ first pages return the **newest** `limit` items; Load more fetches **older** items; within-page order newest-first. Interleaved Comments & activity uses **one shared Load more** that advances each feed that still has `nextCursor`, then re-interleaves accumulated items newest-first (still omit `COMMENT_ADDED`).
- **FR-007:** Max `limit` MUST be capped at **50** (Q-168); default `limit` remains **5** when omitted (Q-163).
- **FR-008:** Own under existing **`tasks`** domain. No generic repository. No Prisma migration expected; use existing `(taskId, createdAt)` indexes where present.
- **FR-009:** React TaskDetail / Comments & activity MUST initial-load first pages (limit 5) and show **Load more** when `nextCursor` present (Q-164). Loading/error/empty states required. `credentials: 'include'`.
- **FR-010:** After comment create/edit/delete or task save activity reload (014), UI MUST refresh feeds coherently with pagination (re-fetch first page and reset cursors — exact UX in plan; must not assume full list).
- **FR-011:** Domain/service pagination helpers and API/UI MUST be tested. SuperTest MUST assert default limit 5, cursor continuation, and authz.
- **FR-012:** MUST NOT implement task notes, **H**, **C**, project covers, or dashboard charts. MUST NOT change `constitution.md`. MUST document supersession of 011 Q-078 / AC-016.

## 6. Acceptance Criteria

### Scenario AC-001: Default limit comments

- Given ≥6 live comments on a live task
- When an authorized reader `GET` comments without query
- Then at most **5** comments are returned and a continuation cursor is present when more exist

### Scenario AC-002: Default limit activity

- Given ≥6 activity events on a live task
- When an authorized reader `GET` activity without query
- Then at most **5** events are returned and a continuation cursor is present when more exist

### Scenario AC-003: Load more API

- Given a first page with `nextCursor`
- When the client requests the next page with that cursor and limit
- Then the next disjoint page is returned without duplicates
- When no more remain
- Then `nextCursor` is null/absent per contract

### Scenario AC-004: Validation

- Given limit=0, negative, over max, or malformed cursor
- When listed
- Then `400` `VALIDATION_ERROR`

### Scenario AC-005: Authz unchanged

- Given unauthenticated / non-member / soft-deleted task
- When list comments or activity
- Then `401` / `403` / `404` as Verified

### Scenario AC-006: UI Load more

- Given TaskDetail with more than one page of comments and/or activity
- When the user uses Load more
- Then additional items appear without a full-list assumption
- Then interleaved panel rules (omit `COMMENT_ADDED`) still hold for rendered activity rows

### Scenario AC-007: Contract supersession

- Given Verified 011 AC-016 / Q-078 full-list
- When this feature is Verified
- Then paginated contracts are authoritative; full-list without limit is no longer required
- Then comment create/PATCH/DELETE shapes remain otherwise intact

### Scenario AC-008: Approval gate

- Given these artifacts are **Approved** (Q-162–Q-168 Decided)
- When implementation is requested
- Then work may proceed on T001–T014 only

## 7. Business Rules

- Default page size 5 — owning domain: `tasks`
- Cursor pages must be stable enough for Load more without dupes under Decided ordering — owning domain: `tasks`
- List authz = task read — owning domain: `tasks` via `project-members` port

## 8. Data

No new persisted entities. Cursors are query tokens derived from existing `createdAt` (+ id tie-break recommended). Soft-delete/list omission rules unchanged.

## 9. API and Integrations

- Evolve `GET .../comments` and `GET .../activity` query + response envelopes (plan owns schemas).
- No new write routes.

## 10. Security

- Session + resource authz unchanged.
- Cap limit (Q-168). Do not leak other tasks’ items via cursor forgery (cursor must be scoped/validated to the task).

## 11. Non-Functional

Prefer indexed `(taskId, createdAt)` access. Educational cursor design over opaque vendor cursors unless needed.

## 12. Dependencies

- Existing: 010, 011, 013/014 TaskDetail panel
- Constraints: constitution API honesty; no silent contract change without this spec
- External: none new

## 13. Failures and Edge Cases

- Concurrent inserts while paging: best-effort; no missing/dupe hard guarantee beyond Decided cursor algorithm.
- Reload after local mutations: reset to first page (plan).
- Comments oldest-first product history vs newest-first interleaved UI — resolved by Q-166/Q-167.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-003 | AC-001–AC-003 | SuperTest |
| FR-004–FR-005 | AC-005–AC-006 | SuperTest + UI |
| FR-006–FR-007 | AC-003–AC-004 | SuperTest |
| FR-009–FR-010 | AC-006 | Frontend tests |
| FR-012 | AC-007–AC-008 | Review |

## 15. Open Questions

- **Q-162:** Scope. Owner: product. Status: **Decided**. Paginate **both** task activity and task comments.
- **Q-163:** Mechanism and default. Owner: product + API. Status: **Decided**. **Cursor + limit** pagination; default **limit = 5**.
- **Q-164:** UX. Owner: product + frontend. Status: **Decided**. **Load more** (not infinite scroll requirement).
- **Q-165:** Prior contracts. Owner: product. Status: **Decided**. Supersedes 011 Q-078 / AC-016 full-list and 010 full-list GET comments assumption for list responses.
- **Q-166:** First page / direction for comments vs activity. Owner: product + `tasks`. Status: **Decided**. **Both** first pages return the **newest** `limit` items; Load more fetches **older** items; within-page order newest-first for both feeds (supersedes “always return entire oldest-first comments transcript in one response”).
- **Q-167:** Interleaved panel Load more. Owner: product + frontend. Status: **Decided**. **One shared Load more** advances whichever feed(s) still have `nextCursor` (fetch next page for each feed that has more, then re-interleave accumulated items newest-first; still omit `COMMENT_ADDED`).
- **Q-168:** Max limit. Owner: API. Status: **Decided**. Max **50**; default remains **5** when omitted (Q-163).

Cross-cutting locks: skip task notes; exclude **H**; exclude **C** / `specs/005-audit/`; do not change `constitution.md`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-162–Q-168 Decided)
- Approved for planning: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS (re-review after FR-010 fix)
- Verified: Yes (T001–T014); non-blocking notes in `tasks.md` / `memory.md`
