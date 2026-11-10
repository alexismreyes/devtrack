# Implementation Plan: Feed Window

- **Feature ID:** 025-feed-window
- **Specification:** `spec.md`
- **Status:** Verified

Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Amend 021 Load more append → Prev/Next replace window of ≤5. **Locked:** Q-181 FE cursor/window stack for Prev (no `prevCursor` unless gap); Q-182 interleave current pages only, show ≤5, replace (no append). Keep cursor/limit API. No task notes / **H** / **C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until user confirms.

## 1. Summary

Change `CommentsActivityPanel` / TaskDetail feed orchestration from accumulating Load more pages to a **sliding window** of ≤5 interleaved items with Prev/Next. Keep backend list contracts. Use FE cursor/window stack for Prev (Q-181 Decided). Interleave algorithm per Q-182 Decided.

## 2. Current State

Inspected 2026-11-10:

- `GET /api/tasks/:taskId/comments|activity` — cursor/limit, default 5, max 50, `nextCursor`
- `CommentsActivityPanel` shared Load more appends; `buildCommentsActivityTimeline` interleaves, omits `COMMENT_ADDED`
- TaskDetail resets first pages on comment mutations / activity reload (021 FR-010)

## 3. Domain Boundaries

- Owning domain: **`tasks`** (list use-cases unchanged unless amend)
- UI ownership: frontend TaskDetail / CommentsActivityPanel
- No new domain; no circular imports

## 4. API Contract

### Preferred (locked unless gap)

Unchanged:

```
GET /api/tasks/:taskId/comments?cursor&limit → { comments, nextCursor }
GET /api/tasks/:taskId/activity?cursor&limit → { activity, nextCursor }
```

Default limit 5; max 50; authz unchanged.

### If material Prev gap appears

Stop. Amend artifacts for additive `prevCursor` (or documented alternative) before implementing backend changes.

## 5. Persistence

None expected.

## 6. Frontend

- Replace Load more control with Prev/Next (accessible names)
- State: current window items (≤5), stack of prior window snapshots and/or cursors for Prev (Q-181), `nextCursor` per feed for Next
- Window construction (Q-182 Decided): from the **current** comments page + **current** activity page only, build newest-first interleaved timeline (omit `COMMENT_ADDED`); take the newest **≤5** as the visible window; **never** retain an append buffer of prior pages
- Next: push current window/cursors onto stack; fetch older pages for feeds with `nextCursor`; rebuild interleave from those current pages; **replace** visible ≤5
- Prev: pop stack / restore prior window; no server `prevCursor`
- Initial + FR-010 reset: clear stack; fetch first pages; show newest window of ≤5
- Loading/error/empty coherent; disable Prev on newest; disable Next when no continuation

## 7. Files

- `frontend/src/tasks/CommentsActivityPanel.tsx` (+ tests)
- TaskDetail feed load helpers / props wiring
- Backend: N/A unless amended

## 8. Dependencies and Config

- None new

## 9. Security and Failures

- Do not loosen list authz
- Failed Next/Prev fetch: keep current window; show error status

## 10. Testing

- Frontend: ≤5 visible; Next replace; Prev restore; end disables; mutation reset; no Load more append
- Backend: unchanged suites unless API amend

## 11. Sequence

Inspect → Approve → panel window state machine → TaskDetail reset wiring → tests → review → memory (catalog propose only)

## 12. Risks

- Dual-feed interleave edge cases (Q-182 Decided) — tests with uneven feed lengths; never reintroduce append buffer
- Accidental API invent — hard stop without amend

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Window cap | Frontend test |
| AC-002–AC-003 | Next/Prev replace | Frontend test |
| AC-004 | Control enablement | Frontend test |
| AC-005 | Reset | Frontend test |
| AC-006–AC-007 | API + scope | Review |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
