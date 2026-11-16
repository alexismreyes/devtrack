# Feature Specification: Within-Column Rank

- **ID:** 031-within-column-rank
- **Status:** Verified
- **Created:** 2026-11-10
- **Related features:** Proposed **H** (within-column card order); 006-kanban (Verified status DnD); 018-custom-task-statuses (Verified catalog `position` pattern); Verified `028-status-drag-reorder` (column sortable; delivers `@dnd-kit/sortable`); delivery after 028, before 029/030

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Material product questions **Q-197–Q-200** are **Decided** with recommended defaults (section 15). This folder **owns proposed feature H**: persist within-column Kanban card order and make same-column DnD meaningful. Cross-column status PATCH MUST remain. Do **not** invent task notes. Do **not** implement **C** or `specs/005-audit/`. Do **not** change `constitution.md`. Do **not** edit `implemented-features.md` until the user later confirms. Do **not** expand into 028 column-reorder scope.

This ID is **031-within-column-rank**.

## 1. Problem

Kanban task cards can move across columns via status PATCH (006/019), but dropping a card inside the same column is a no-op and list order is `createdAt` desc with no persisted rank. Users need stable manual order within each status column (Trello-like list order). Proposed feature **H** was deferred; the product now requires it. Catalog column reorder remains owned by 028/018; this feature owns **task** order only.

## 2. Goals

- Persist a dense integer **position** per live task within `(projectId, status)` (Q-197).
- Let OWNER/EDITOR **drag-reorder task cards within a column**; same-column drop MUST persist new order (no longer a no-op).
- Keep **cross-column** DnD: on status change, set new status and **append** the card to the end of the target column (Q-200).
- Reuse `@dnd-kit/sortable` for **cards within columns** (expected after 028 installs it for columns).
- Expose order on task list/DTO and a clear write API to persist full-column order (Q-198).
- Authz: same as status moves — `requireTaskWrite` (Q-199).
- Do **not** emit activity for position-only changes (Q-199).

## 3. Non-Goals

- Status catalog / Kanban **column** reorder (018 API + Approved 028).
- Task notes; app-wide audit (**C**); `specs/005-audit/`.
- Changing `constitution.md`.
- Fractional / lexicographic rank schemes (rejected in favor of dense int + rewrite).
- Emitting `TASK_FIELDS_CHANGED` (or any activity) for position-only updates.
- Second DnD library.
- Editing `implemented-features.md` in this batch.
- Soft-delete restore / GC of positions beyond rewrite rules needed for live tasks.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR, I want to drag cards within a column and have that order persist, so that my board reflects intentional priority inside each status.

### User Story US-002

As an OWNER or EDITOR, I want moving a card to another column to keep working and place it at the end of that column, so that status changes stay simple and ordered.

### User Story US-003

As a VIEWER, I want to see the persisted card order without being able to reorder, so that writers alone mutate rank.

## 5. Functional Requirements

- **FR-001:** Live tasks MUST have a dense integer `position` scoped per `(projectId, status)` (Q-197). List/board consumers MUST order by `position` ascending (stable tie-break by `id` if needed).
- **FR-002:** Migration MUST backfill existing live tasks so current board visual order is preserved: assign dense `0..n-1` in today’s display order (`createdAt` desc, then `id`) per `(projectId, status)`. Soft-deleted rows MUST receive a defined position strategy that does not break live uniqueness (plan: rewrite live only; soft-deleted excluded from unique live index or densified separately without colliding).
- **FR-003:** Create-task MUST append at end of the target status column (max position + 1 / rewrite densify as planned).
- **FR-004:** Same-column card reorder MUST call the dedicated reorder API with the full ordered `taskIds` for that status and persist dense positions in one transaction (Q-198).
- **FR-005:** Cross-column drop MUST continue to change `status` and MUST place the task at the **end** of the target column (append), rewriting positions as needed (Q-200). Existing PATCH status path may own append; must not leave gaps that break dense invariant.
- **FR-006:** Frontend MUST use `@dnd-kit/sortable` for cards within each column; same-column drop is no longer a no-op. Column sortable from 028 MUST remain disambiguated from card sortable.
- **FR-007:** Authz for reorder and status+append moves MUST use `requireTaskWrite` (OWNER/EDITOR); VIEWER cannot reorder (Q-199). UI gates are non-authoritative.
- **FR-008:** Position-only changes MUST NOT emit `TASK_FIELDS_CHANGED` or other activity events (Q-199). Status change activity rules from 011 remain for status field changes; position must not appear in activity payloads.
- **FR-009:** `PublicTaskDto` (and list responses) MUST include `position` so the board can render without inventing client-only order.
- **FR-010:** Failed reorder MUST revert optimistic UI or reload; leave consistent dense positions server-side (transactional rewrite, same spirit as 018 status reorder).
- **FR-011:** Backend and frontend tests MUST cover reorder success, write-gate, append-on-status-change, list order by position, and migration/backfill invariants as practical.
- **FR-012:** MUST NOT implement notes/**C**/constitution edits; MUST NOT edit `implemented-features.md` until later confirm; MUST NOT change 028 column-reorder contracts.

## 6. Acceptance Criteria

### Scenario AC-001: Within-column reorder persists

- Given an OWNER/EDITOR board with ≥2 cards in one status
- When the user reorders those cards within the column and drop completes
- Then the dedicated reorder API is called with the full new `taskIds` for that status
- Then a subsequent list/board load shows cards in that `position` order

### Scenario AC-002: Same-column DnD is not a no-op

- Given a writable board after this feature
- When a card is dropped to a new index in the same column
- Then order persists (supersedes 006 same-column no-op for this path)

### Scenario AC-003: Cross-column append

- Given a writable board with cards in column A and column B
- When a card from A is dropped onto B
- Then its `status` becomes B’s key and its `position` is at the end of B’s live tasks (Q-200)

### Scenario AC-004: Create appends

- Given a writable project and a status column with existing cards
- When a new task is created into that status
- Then it appears at the end of that column’s position order

### Scenario AC-005: Non-writer cannot reorder

- Given a VIEWER board
- When cards are shown
- Then within-column reorder is not available; backend rejects unauthorized reorder

### Scenario AC-006: No position activity noise

- Given a successful within-column reorder
- When activity is listed for a reordered task
- Then no new event is emitted solely for position change (Q-199)

### Scenario AC-007: DTO and list order

- Given live tasks with positions
- When `GET` project tasks (and public task DTO) is returned
- Then each task includes `position` and list order is position ascending within filters

### Scenario AC-008: Migration backfill

- Given existing live tasks before migrate
- When the additive migration/backfill runs
- Then each `(projectId, status)` live set has dense positions preserving prior visual order (`createdAt` desc)

### Scenario AC-009: Column vs card DnD coexistence

- Given 028 column sortable and 031 card sortable on the same board
- When dragging a column vs a card
- Then handlers remain disambiguated (no accidental catalog reorder from card drag and vice versa)

### Scenario AC-010: Approval gate

- Given these artifacts are **Approved** (Q-197–Q-200 Decided)
- When implementation is requested
- Then work may proceed on the approved task list only

## 7. Business Rules

- Dense integer positions per `(projectId, status)` for live tasks; rewrite on full-list reorder — owning domain: `tasks`.
- Cross-column move = status change + append to target column end — owning domain: `tasks`.
- Authz: `requireTaskWrite` for reorder and status moves — owning domain: `tasks` / project-members ports.
- No activity for position-only updates — owning domain: `tasks` activity rules.
- Soft-deleted tasks do not participate in live board order.

## 8. Data

- Concept: task rank within a status column of a project.
- Ownership: `tasks` domain / `Task` aggregate field.
- Uniqueness: dense non-negative integers per live `(projectId, status)`; uniqueness enforced for live rows as planned (index/constraint).
- Lifecycle: assigned on create (append); rewritten on same-column reorder; rewritten on cross-column append and when siblings densify after remove/soft-delete as required to keep density.
- Deletion: soft-delete removes task from live order; remaining live tasks densified if needed to preserve invariant.

## 9. API and Integrations

- **Recommended contract (Q-198 Decided):** dedicated full-list reorder endpoint (mirror 018 statuses reorder), **not** single-task `PATCH` with `position`.
  - `PUT /api/projects/:projectId/tasks/reorder`
  - Body: `{ status: string /* catalog key */, taskIds: string[] }` — complete set of **live** task ids currently in that status, new order.
  - Auth: session + `requireTaskWrite`.
  - Response: ordered task list (or statuses-style confirmation payload including public tasks) with updated `position` values.
- Cross-column: keep `PATCH /api/tasks/:id` `{ status }` and server appends to end of target column (may densify source/target columns).
- `PublicTaskDto.position: number` additive field.
- Do **not** accept arbitrary sparse `position` on general PATCH as the primary reorder mechanism.

## 10. Security

- Reorder and status moves require authenticated session and task write.
- Validate that every `taskIds` entry belongs to the project, is live, and currently has the given `status`; reject incomplete/unknown/mismatched sets with validation/conflict errors.
- Do not leak soft-deleted ids or stack traces.

## 11. Non-Functional

- Reorder writes MUST be atomic (single transaction), following the two-phase offset pattern used by status catalog reorder where unique constraints require it.
- Prefer keyboard-accessible sortable for cards where `@dnd-kit/sortable` supports it without regressing 019 click-to-open.

## 12. Dependencies

- Existing features: Verified 006/019 Kanban card DnD; Verified 018 dense catalog reorder pattern; Approved 028 column sortable (delivers `@dnd-kit/sortable` package).
- Architectural constraints: constitution Articles II–V, VII–IX; domain-owned Prisma behind repository; no generic repository.
- External dependencies: reuse `@dnd-kit/sortable` / `@dnd-kit/utilities` (no second DnD family).

## 13. Failures and Edge Cases

- Reorder with stale/missing/extra ids → 400/409; no partial write.
- Concurrent reorders → last successful transaction wins; client should reload on conflict/failure.
- Empty column / single card → reorder may be no-op (no write if unchanged).
- Status key unknown on reorder body → validation error.
- Moving last card out of a column → source column densifies to empty set.
- Filters (priority/label): board still groups by status; persist order for full status set, not filtered subset (reorder API always full live set for that status).

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001–FR-003 | AC-004, AC-007, AC-008 | Migration + list/create tests |
| FR-004 | AC-001, AC-002 | API + Kanban tests |
| FR-005 | AC-003 | Status move + position tests |
| FR-006, FR-009 | AC-001, AC-007, AC-009 | Frontend + DTO tests |
| FR-007 | AC-005 | Authz API + UI gate |
| FR-008 | AC-006 | Activity regression |
| FR-010–FR-012 | AC-001, AC-010 | Failure path + review |

## 15. Open Questions

- **Q-197:** Rank model? Owner: product + backend. Status: **Decided (recommended default)**. **Dense integer `position` per `(projectId, status)`** with full-list rewrite in a transaction (same spirit as `ProjectStatus.position`). Fractional rank rejected for this educational codebase.
- **Q-198:** Persist API shape? Owner: product + backend. Status: **Decided (recommended default)**. **Dedicated** `PUT /api/projects/:projectId/tasks/reorder` with `{ status, taskIds }` full list. Do **not** use primary `PATCH /api/tasks/:id` `{ position }` for column reorder (avoids sparse/collision UX; mirrors 018).
- **Q-199:** Authz and activity? Owner: product + backend. Status: **Decided (recommended default)**. Authz = **`requireTaskWrite`** like status moves. Activity = **do not** emit position-only `TASK_FIELDS_CHANGED` (noise).
- **Q-200:** Cross-column drop position? Owner: product + backend/frontend. Status: **Decided (recommended default)**. On status change, **append to end** of the target column.

Cross-cutting locks (record, not reopened): skip task notes; exclude **C** / `specs/005-audit/`; do not change `constitution.md`; do not edit `implemented-features.md` until later user confirm; keep cross-column status moves; 028 owns column reorder only; this folder owns **H**.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes (Q-197–Q-200 Decided with recorded defaults)
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T016)
- Independent review: PASS WITH NON-BLOCKING FINDINGS (Medium filter-reorder omit resolved before Verified; Low residual: no automated backfill test)
- Verified: Yes
