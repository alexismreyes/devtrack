# Implementation Plan: Checklist Item Window

- **Feature ID:** 038-checklist-window
- **Specification:** `spec.md`
- **Status:** Verified

Inspected 2026-11-11. `GET /api/tasks/:taskId/checklists` returns each checklist with **all** nested `items`. No item list GET. Follow 021/025 cursor patterns. Q-226–Q-230 Decided.

## 1. Summary

Add paginated item list GET (cursor/limit, default 10). Slim checklist list payloads (no full item arrays). TaskChecklistsPanel shows ≤10 items with Prev/Next replace + FE cursor stack. Mutate → reset to first page + clear stack.

## 2. Current State

- Routes: list checklists; POST checklist; item POST/PATCH/DELETE under checklist — no item GET list.
- DTO embeds full `items[]` ordered `createdAt asc`.
- FE `TaskChecklistsPanel` renders all items.

## 3. Domain Boundaries

- Owning domain: **`tasks`** (checklists module).
- Repository gains paginated `listItems(checklistId, cursor, limit)`.
- No new domain; no generic repository.

## 4. API Contract

### `GET /api/tasks/:taskId/checklists/:checklistId/items`

- Auth: session + `requireTaskRead` (archived readable like today).
- Query: `cursor?`, `limit?` (default **10**, max **50**).
- Response: `{ items: PublicChecklistItemDto[]; nextCursor: string | null }`.
- Order: `createdAt asc`, id tie-break (match 021 style opacity).
- Errors: 401/403/404/400 invalid cursor/limit.

### `GET /api/tasks/:taskId/checklists` (amend)

- **Q-229 Decided:** return checklists **without** full nested items (`items` omitted or empty array). Clients load items via the new list endpoint. Update DTOs/tests accordingly.
- Progress totals: additive summary fields `itemCount`/`checkedCount` on checklist list DTO so progress bar stays correct without fetching all pages.

### Unchanged

- Item create/update/delete; checklist create/rename/delete; activity rules.

## 5. Persistence

- No migration expected unless counts need indexed helpers (prefer count queries in repository).
- Cursor encode `{ createdAt, id }` opaque.

## 6. Frontend

- Client: `listChecklistItems(taskId, checklistId, { cursor, limit })`; update checklist list typing.
- Per checklist: window state, cursor stack, Prev/Next replace (025 pattern), limit 10.
- On open: fetch first page; on mutate success: clear stack + refetch first page (Q-230 Decided).
- Progress bar uses `itemCount`/`checkedCount` from checklist DTO.

## 7. Files

- Backend checklists repository/service/controller/routes/dto/validators/tests
- Frontend `api/client.ts`, `TaskChecklistsPanel.tsx` (+ tests)

## 8. Dependencies and Config

None new.

## 9. Security and Failures

- Same task authz; validate cursor; no path leaks.

## 10. Testing

- API pagination, default 10, nextCursor, authz, checklist list without full items + counts.
- FE window size, Next/Prev replace, reset after mutate.

## 11. Sequence

1. Approved gate.
2. Repository pagination + counts; service; routes; API tests.
3. FE client + window UI + tests.
4. Typecheck, AC, review, memory.

## 12. Risks

- Breaking clients that expected nested items — in-repo FE is the client; update together.
- Alternatives: FE-only slice over full list (rejected as primary — Q-228).
- Q-229/Q-230 Decided (slim list + counts; mutate → first page).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001–AC-003 | FE window | TaskChecklistsPanel tests |
| AC-004 | Item list GET | checklists-api tests |
| AC-005 | Authz reuse | API tests |
| AC-006 | Scope | Review |
| AC-007 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
