# Implementation Plan: Feed Pagination

- **Feature ID:** 021-feed-pagination
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Spec **Q-162–Q-168** Decided (locked). Plan/tasks are aligned to those answers. Implementation may proceed on T001–T014 only. Changes 010/011 list contracts. Own under `tasks`. No task notes / **H** / **C**. Do not change `constitution.md`.

Locked constraints: newest-first pages; Load more fetches older (Q-166); one shared Load more advancing both feeds then re-interleave newest-first, omit `COMMENT_ADDED` (Q-167); max limit **50**, default **5** (Q-168 / Q-163). Interleaved panel display orientation: newest-first (aligned with 013).

## 1. Summary

Evolve comments and activity **GET** lists to **cursor/limit** pagination (default limit **5**), and update TaskDetail **Load more** UX (including interleaved Comments & activity). Supersede full-list AC-016 / Q-078. No new domain; no migration expected.

## 2. Current State

Inspected 2026-11-09:

- `GET /api/tasks/:taskId/comments` → `{ comments: [...] }` oldest-first full list (010 Q-064)
- `GET /api/tasks/:taskId/activity` → `{ activity: [...] }` newest-first full list; no pagination (011 Q-078 / AC-016)
- Frontend `api/client.ts` list helpers take no cursor; `CommentsActivityPanel` loads both full feeds and interleaves newest-first; omits `COMMENT_ADDED`
- 014 reloads activity after save/comment mutations
- Prisma: `task_comments` and `task_activity_events` with `taskId` / `(taskId, createdAt)` indexes (011)

## 3. Domain Boundaries

- Owning domain: **`tasks`**
- Other: `project-members` (`requireTaskRead`); `users` (display names at list time)
- Invariants: authz unchanged; soft-deleted comments omitted; soft-deleted task → 404; emission rules unchanged
- No new peer domain; no circular imports

## 4. API Contract

### Shared query

- `limit`: optional integer; default **5**; min 1; max **50** (Q-168)
- `cursor`: optional opaque string; omit for first page
- Unknown query keys → `400` `VALIDATION_ERROR` (match dashboard strictness where practical)

### Comments list (evolved)

- `GET /api/tasks/:taskId/comments?cursor&limit`
- Auth: session + `requireTaskRead`
- Response:

```
{
  comments: PublicCommentDto[],
  nextCursor: string | null
}
```

- Page membership/order per Decided Q-166 (newest-first pages; Load more older)
- Success `200` including empty page
- Errors: `400`, `401`, `403`, `404`

### Activity list (evolved)

- `GET /api/tasks/:taskId/activity?cursor&limit`
- Auth: session + `requireTaskRead`
- Response:

```
{
  activity: PublicActivityDto[],
  nextCursor: string | null
}
```

- Newest-first; Load more older (Q-166)

### Cursor encoding (implementation)

- Opaque URL-safe token wrapping `{ createdAt, id }` with tie-break on `id` for stable pages
- Reject cursors that do not decode or do not belong to the listing algorithm → `400`
- Do not accept client-supplied raw SQL

### Unchanged

- Comment POST/PATCH/DELETE paths and bodies
- Activity write-less public surface
- Emission / same-tx rules

## 5. Persistence

- Prisma model changes: **none expected**
- Use existing indexes; repository methods gain `listPage({ taskId, limit, cursor })`
- Compatibility: breaking list response shape for clients that assumed full arrays only — authorized by this feature; update frontend client + tests in same change set

## 6. Frontend

- Extend `listTaskComments` / `listTaskActivity` to pass `cursor`/`limit` and read `nextCursor`
- Initial TaskDetail open: fetch first page (limit 5) for each
- **Load more** per locked Q-167: one shared control advances feeds with remaining cursors; re-interleave accumulated items newest-first; omit `COMMENT_ADDED`
- On comment create/edit/delete and activity reload triggers (014): reset accumulated pages and re-fetch first pages
- Empty/loading/error states; credentials include

## 7. Files

- `backend/src/modules/tasks/` comments + activity repository/service/controller/validators/dto/tests
- `frontend/src/api/client.ts` + types
- `frontend/src/tasks/CommentsActivityPanel.tsx` (+ TaskDetail wiring) + tests

## 8. Dependencies and Config

- New packages: **none**
- Env/Docker: **none**

## 9. Security and Failures

- Authz unchanged; validate cursor; cap limit
- Do not return soft-deleted comments
- Do not expose other tasks via cursor

## 10. Testing

- Service: page size, nextCursor null/non-null, no dupes across pages, default 5
- SuperTest: AC-001–AC-005; regression on comment writes
- Frontend: initial 5; Load more; reload reset; omit COMMENT_ADDED

## 11. Sequence

1. Confirm Approved gate (T002)
2. Repository page queries + service
3. Validators/controllers/DTO
4. Backend tests (replace full-list assertions)
5. Frontend client + panel Load more
6. Frontend tests, typecheck, review, memory (note 011 supersession)

## 12. Risks

- Breaking external clients of full-list — mitigate by shipping FE in same feature; document supersession
- Interleaved dual-cursor UX complexity — mitigated by locked Q-167 shared Load more
- Comments chronological expectation vs newest-first pages — locked by Q-166 (newest-first pages + newest-first interleaved UI)
- Alternatives: offset pagination (rejected); activity-only pagination (rejected Q-162)

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | comments page | SuperTest |
| AC-002 | activity page | SuperTest |
| AC-003 | cursor continuation | SuperTest |
| AC-004 | validators | SuperTest |
| AC-005 | authz | SuperTest |
| AC-006 | Load more UI | Frontend tests |
| AC-007–AC-008 | docs/process | Review |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes (T001–T014)
