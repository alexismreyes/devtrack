# Implementation Plan: Within-Column Rank

- **Feature ID:** 031-within-column-rank
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Spec **Q-197–Q-200** are **Decided** (recommended defaults locked in artifacts). Owns proposed **H**. Domain: `tasks`. Additive Prisma migration. Dedicated reorder API. No notes/**C**. Do not change `constitution.md`. Do not edit `implemented-features.md` until later user confirm. Delivered after Verified `028` so `@dnd-kit/sortable` already existed for columns.

## 1. Summary

Add `Task.position` (dense int per project+status), migrate/backfill preserving current visual order, list by position, create/append + status-change/append, and `PUT .../tasks/reorder` with transactional dense rewrite. Frontend: `@dnd-kit/sortable` within each Kanban column; same-column drop persists; cross-column still PATCHes status and lands at end. No position activity events.

## 2. Current State

Inspected 2026-11-10:

- Prisma `Task` has no `position`/`rank`; list `orderBy: { createdAt: "desc" }` in `prisma-tasks-repository.ts`.
- `PATCH /api/tasks/:id` allows title/description/dueDate/status/priority only (`update-task.ts`).
- Status catalog reorder: `PUT /api/projects/:projectId/statuses/reorder` + two-phase transactional dense rewrite (`prisma-statuses-repository.ts`) — pattern to mirror.
- Kanban: `@dnd-kit/core` cards; same-column no-op; cross-column status PATCH; Approved 028 adds column `@dnd-kit/sortable` + grab cursors on column chrome.
- `PublicTaskDto` has no `position`.
- Activity emits `TASK_FIELDS_CHANGED` on field PATCH; must stay silent for position-only reorder.

## 3. Domain Boundaries

- Owning domain: **`tasks`**
- Other domains: none new; authz via existing `TaskAuthorizationPort` / `requireTaskWrite`
- Invariants: dense live positions per `(projectId, status)`; reorder list must be exact live set; append on create and on status change; no position activity
- Cross-domain interfaces: none new
- Controllers/services/repos/DTOs/validators/routes: extend `tasks` module only
- Dependency direction: routes → controller → service → repository; Prisma only in repository

## 4. API Contract

### `PUT /api/projects/:projectId/tasks/reorder`

- Auth: session cookie + `requireTaskWrite`
- Request DTO: `{ status: string, taskIds: string[] }` (strict; non-empty status key; `taskIds` may be empty only if column empty)
- Behavior: validate exact live task set for that project+status; rewrite positions `0..n-1` in one transaction (two-phase offset if unique constraint requires); return `{ tasks: PublicTaskDto[] }` ordered by position
- Errors: 401 unauth; 403 forbidden; 400 validation / incomplete set; 404 project; 409 conflict as used elsewhere if applicable
- No activity emit

### `PATCH /api/tasks/:id` (existing, extended behavior)

- `{ status }` change: update status and assign append position at end of target column; densify source column if needed; existing status activity rules unchanged; **do not** include `position` in activity payload
- Do **not** add general-purpose `position` patch as reorder API

### `POST /api/projects/:projectId/tasks` (existing)

- On create: set position to append (end of status column)

### `GET` task / list

- Include `position: number` on `PublicTaskDto`
- List default order: `position asc`, then `id asc` (replace `createdAt desc` as primary board order)

| Method / path | Auth | Notes |
| --- | --- | --- |
| `PUT /api/projects/:projectId/tasks/reorder` | session + task write | New; full `taskIds` for one status key |
| `PATCH /api/tasks/:id` | session + task write | Status change appends in target |
| `GET .../tasks` / `GET /api/tasks/:id` | session + task read | Additive `position` |

If a contract gap appears, **stop** and amend artifacts.

## 5. Persistence

- Prisma: add `position Int` on `Task`
- Indexes: `@@index([projectId, status, position])`; prefer unique for live rows — if Prisma cannot express partial unique easily, use application-enforced density + unique `(projectId, status, position)` with soft-deleted rows moved to a non-colliding strategy (e.g. densify live only in txn and set soft-deleted positions aside during delete rewrite). Document chosen approach in migration notes; **no destructive reset**.
- Migration: additive column + backfill SQL/script: per `(projectId, status)` order live tasks by `createdAt DESC, id ASC`, assign `0..n-1`
- Repository: `reorderInStatus(projectId, status, orderedIds)` transactional; create/update paths set/rewrite positions; list `orderBy` position
- Compatibility: old clients ignoring `position` still work; board clients must sort by position after this feature

## 6. Frontend

- After 028: reuse `@dnd-kit/sortable` for **vertical** card lists inside each column (`SortableContext` per column).
- Replace same-column no-op: on card sortable end within column → `reorderTasks(projectId, { status, taskIds })`.
- Cross-column: keep status PATCH; optimistic UI should place card at end of target column to match server append.
- Preserve 019 activation-distance / click-to-open; preserve 028 column handle vs card listeners (`data.type` branch).
- VIEWER: no card sortable listeners.
- Client: add reorder helper; map `position` on task types.
- Grab cursors on cards: optional polish; do not fight 028 column chrome cursors (card may keep pointer/grab consistent with product — prefer grab while actively sorting if it does not regress 019).

## 7. Files

Expected touch set (inspect may refine):

- `backend/prisma/schema.prisma` + new migration under `backend/prisma/migrations/`
- `backend/src/modules/tasks/domain/task.ts` (+ tests)
- `backend/src/modules/tasks/repository/tasks-repository.ts` + `prisma-tasks-repository.ts`
- `backend/src/modules/tasks/service/tasks-service.ts` (+ status append + reorder use-case)
- `backend/src/modules/tasks/dto/task-dtos.ts`, validators, controller, routes
- Activity path: ensure reorder does not emit; status change still does without position
- Backend tests: service/api/prisma reorder atomicity; list order; authz; append on status/create
- `frontend/src/api/client.ts`, task types, `KanbanBoard.tsx` (+ tests)
- Possibly small sortable-card helper

## 8. Dependencies and Config

- Packages: reuse `@dnd-kit/sortable` / utilities from 028; add only if 031 ships before 028 (prefer not).
- Env / Docker: none
- Prisma migrate deploy in verification (no reset/volume delete)

## 9. Security and Failures

- Backend validates full id set membership and status match.
- UI `canWrite` gate only; server authoritative.
- Transaction failure → error response; no mixed positions.
- Do not expose internal Prisma errors.

## 10. Testing

- Backend: reorder happy path + incomplete set rejection; VIEWER 403; create append; status change append + source densify; list order by position; no activity on reorder; migration backfill unit/integration as practical; transactional failure leaves prior order (mirror statuses reorder test style).
- Frontend: within-column sortable calls reorder API; cross-column still status PATCH; non-writer no reorder; coexistence with column sortable if 028 present.

## 11. Sequence

1. Confirm Approved; prefer 028 Verified (or at least sortable package present).
2. Schema + migration + backfill.
3. Domain/repo/service/DTO/routes/validators + backend tests.
4. Frontend client + Kanban card sortable + tests.
5. Typecheck, targeted/full suites, AC verify, review, memory.

## 12. Risks

- Mixing column sortable (028) and card sortable (031) in one `DndContext` — mitigate with typed drag data and per-axis contexts/strategies.
- Unique `(projectId, status, position)` vs soft-delete — mitigate with explicit rewrite on soft-delete and/or partial uniqueness strategy documented in migration.
- Filter views reordering a subset — forbid; API always full live status set.
- Alternatives considered: fractional ranks (rejected Q-197); PATCH single `position` (rejected Q-198); prepend on cross-column (rejected Q-200); activity on position (rejected Q-199).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001, AC-002 | Reorder API + card sortable | API + Kanban tests |
| AC-003, AC-004 | Status/create append | Service/API tests |
| AC-005 | requireTaskWrite + UI gate | API + FE tests |
| AC-006 | No activity on reorder | Activity tests |
| AC-007 | DTO + list orderBy | DTO/list tests |
| AC-008 | Migration backfill | Migration review + test |
| AC-009 | Typed drag branching | FE tests / review |
| AC-010 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (documented)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
