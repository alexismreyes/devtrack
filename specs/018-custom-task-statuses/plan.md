# Implementation Plan: Custom Task Statuses

- **Feature ID:** 018-custom-task-statuses
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Spec section 15 **Q-141–Q-150** are **Decided**. Plan/tasks are aligned to those answers. Implementation may proceed on T001–T017 only. Do **not** write `specs/005-audit/`. Do **not** change `constitution.md`. Additive / non-destructive migrations only; no `migrate reset` or volume delete without explicit authorization.

## 1. Summary

Enable **user-defined task statuses** deferred from `016` Q-125, while preserving Verified membership authz, Kanban persistence through the backend, dashboard owner-scoped aggregates, and task activity field-change semantics.

**Decided approach:**

- Own catalog + task assignment inside existing **`tasks`** domain (labels precedent).
- **Per-project** `ProjectStatus` catalog table for metadata: `name`, `nameKey`, `color`, `isCompleted`, `isSystem` (seed marker only), immutable `key` (Q-141, Q-144, Q-149).
- **`Task.status` = stable string key** (Q-146 option 2): not Postgres enum, not UUID FK. Validate key ∈ project catalog in domain/service.
- **Seed** three default rows per project (`TODO` / `IN_PROGRESS` / `DONE`); migrate enum column → text preserving values (Q-142 amended). Defaults are **not** immutable privileges.
- Persist **status-catalog order** via `position`/`rank` on `ProjectStatus` (full list reorderable: seeded + custom). Kanban columns follow that order. **Not** within-column task rank **H**.
- Seeded Done starts `isCompleted=true`; others false; **all** rows’ name/color/`isCompleted` writable including seeded Done (Q-142 / Q-144).
- **Delete** blocked while in use (**A**); seeded rows deletable when unused. Plan-locked: cannot delete last status; must keep ≥1 non-completed.
- Create default: key `TODO` if present; else first `isCompleted=false` by position (plan-locked).
- **Dynamic Kanban columns** from catalog (Q-143).
- Catalog CRUD + reorder = `requireTaskWrite` (Q-145).
- Activity: `TASK_FIELDS_CHANGED` status old/new = keys only; no catalog CRUD/reorder events (Q-147).
- UI: TaskDetail + board filter + column `+` prefill; header create default-only; catalog/Kanban reorder (Q-148 / Q-142).
- Colors from fixed label tokens; no icons/WIP (Q-149); no **H** / attachments reopen / **C** (Q-150).

## 2. Current State

Inspected 2026-11-06. Verified through `017-task-attachments`. No `018` implementation yet.

Present and in use:

- Compose `frontend`, `backend`, `db` (PostgreSQL 16, named volume); attachments volume unrelated
- Domains: `system`, `auth`, `users`, `projects`, `tasks`, `project-members`
- Prisma `enum TaskStatus { TODO IN_PROGRESS DONE }` on `Task.status @default(TODO)`
- Friendly UI map only: `frontend/src/tasks/statusDisplay.ts` → To do / In progress / Done
- `KanbanBoard.tsx`: hard-coded `COLUMN_STATUSES = ["TODO","IN_PROGRESS","DONE"]`; DnD PATCHes `{ status }`
- Dashboard domain `dashboard-summary.ts`: pending = `TODO`|`IN_PROGRESS`; completed = `DONE`; overdue = non-`DONE` + dueDate before UTC today
- Labels precedent: `ProjectLabel` + join, per-project catalog under `/api/projects/:projectId/labels`, color tokens, `requireTaskWrite` / `requireTaskRead`
- Activity: `TASK_FIELDS_CHANGED` includes `{ field: "status", oldValue, newValue }` enum strings
- Migrations through `20261106160000_task_attachments`

Absent:

- Status catalog table, custom status APIs, dynamic columns, dashboard `isCompleted` lookup for customs

Limitations to respect:

- No within-column **task** rank / task `position` (**H**). Catalog `position`/`rank` on `ProjectStatus` is in scope (Q-142).
- No audit **C** / `specs/005-audit/`
- Do not reset DB or delete volumes
- Soft-deleted tasks → 404 on item ops
- `tasks` MUST NOT import other domains’ Prisma repositories
- `prompt.md` still documents fixed three statuses — amend when feature is Approved/Verified, not via constitution change

## 3. Domain Boundaries

- Owning domain: **`tasks`** — status catalog invariants, task status key assignment, dashboard classification helpers, Kanban-facing status DTOs, HTTP for catalog
- Other domains:
  - `project-members` — `TaskAuthorizationPort` only; no new roles
  - `auth` — session middleware only
  - `projects` / `users` / `system` — unchanged except via existing narrow ports
- Invariants:
  - Catalog row `id` / `key` / `createdAt` system-assigned; `projectId` immutable; `key` immutable after create
  - Exactly one status **key** string per task; must exist in same-project catalog
  - New projects seed three defaults (`TODO` / `IN_PROGRESS` / `DONE`) with `isSystem=true` as **seed marker only** — no non-deletable / non-editable privilege
  - Name, color, and `isCompleted` MAY be updated on **all** rows (seeded + custom); client cannot set `key` / `id` / `isSystem`
  - Catalog order: contiguous `position`/`rank` per project; list/Kanban sorted ascending; full list reorderable; new customs append after max
  - Name 1–40 after trim; case-insensitive unique per project (`nameKey`)
  - `isCompleted` boolean for dashboard (live flags); Done seeded true but may be flipped
  - Delete blocked while any live task in project has `Task.status = key` (**A**); seeded rows deletable when unused
  - Plan-locked: reject delete of last remaining status; reject delete or `isCompleted` flip that would leave zero `isCompleted=false` statuses
  - Create default key: `TODO` if present; else first non-completed by position
  - Color ∈ fixed token set (same as labels)
  - Reorder MUST NOT mutate keys/names/colors/`isCompleted`/`isSystem`
- Cross-domain interfaces: catalog + task services depend on `TaskAuthorizationPort` + repositories; no circular imports
- Dependency direction: domain objects MUST NOT import Express/HTTP/Prisma Client. Controllers → services → repository contracts / ports
- Layout: extend `backend/src/modules/tasks/` (domain/repo/service/dto/validators/controller/routes/tests). Do not invent peer `statuses` or `audit` modules

## 4. API Contract

### Wire contract (task status) — locked

| Surface | Shape |
| --- | --- |
| `PublicTaskDto.status` | `string` — catalog **key** (system values remain `TODO` \| `IN_PROGRESS` \| `DONE`; customs are server-assigned opaque keys, UUID string form) |
| Create/PATCH body `status` | optional/required as today; must be a key present in the task’s project catalog |
| List filter `?status=` | single catalog **key** string |
| Activity `TASK_FIELDS_CHANGED` status old/new | status **key** strings |
| Catalog DTO | separate from task field; clients join key → name/color/`isCompleted` for UI |

Do **not** change `PublicTaskDto.status` into an object or UUID FK. Do **not** accept arbitrary free text that is absent from the catalog.

### Catalog — list

- `GET /api/projects/:projectId/statuses`
- Auth: session + `requireTaskRead`
- Response: `{ statuses: PublicProjectStatusDto[] }`  
  Fields: `id`, `key`, `name`, `color`, `isSystem`, `isCompleted`, `position` (or `rank`), `createdAt`
- Order: ascending catalog `position`/`rank` (full list; seed default TODO → IN_PROGRESS → DONE)
- Errors: `401`, `403`, `404`

### Catalog — create

- `POST /api/projects/:projectId/statuses`
- Auth: session + `requireTaskWrite`
- Body: `{ name, color, isCompleted? }` (`isCompleted` default `false`; reject client `key`/`id`/`isSystem`)
- Response: `201` + public status DTO (includes generated `key`)
- Errors: `400`, `401`, `403`, `404`, `409` (name), archived `409`/`403`

### Catalog — update

- `PATCH /api/projects/:projectId/statuses/:statusId`
- Auth: session + `requireTaskWrite`
- Body (all rows, including seeded): `{ name? }`, `{ color? }`, `{ isCompleted? }`
- Reject client attempts to change `key` / `id` / `isSystem`
- Reject `isCompleted` flip that would leave zero non-completed statuses in the project → `409`
- Errors: as above + `404` missing status

### Catalog — delete

- `DELETE /api/projects/:projectId/statuses/:statusId`
- Auth: session + `requireTaskWrite`
- In-use (any row, including seeded) → `409` (**A**)
- Last remaining status → `409`
- Last non-completed status → `409` (must keep ≥1 `isCompleted=false`)
- Seeded rows (`isSystem=true`) are otherwise deletable when unused — no special non-deletable privilege
- Success: match existing project/labels delete conventions (`204` or `{ ok: true }`)

### Catalog — reorder

- `PUT /api/projects/:projectId/statuses/reorder` (or equivalent single write that replaces order)
- Auth: session + `requireTaskWrite`
- Body: ordered list of all status `id`s for the project (exact set; no missing/extra/duplicates)
- Effect: persist new `position`/`rank` values only; return updated `{ statuses }` in new order
- Errors: `400` (invalid set/order), `401`, `403`, `404`, archived `409`/`403`
- Note: this is **status-catalog** order, not task card order (**H**)

### Tasks

- Existing task routes keep `status: string` (now catalog key, not enum)
- Default create: `TODO` when that key exists in the project catalog; else first `isCompleted=false` by catalog position (plan-locked)
- Invalid / unknown / cross-project key → `400`

### Dashboard

- `GET /api/dashboard` path/auth unchanged
- Classification joins/looks up catalog `isCompleted` by `(projectId, Task.status key)`
- Overdue: `!isCompleted && dueDate < UTC today`

### Activity

- No new catalog event kinds
- Status field-change old/new = keys; one event per successful PATCH that changes status

## 5. Persistence

**Chosen model (reconciles Q-146=2 + catalog):**

- Add `ProjectStatus` / `project_statuses`:
  - `id` Uuid PK
  - `projectId` FK → Project Restrict
  - `key` String — immutable; unique `(projectId, key)`
  - `name` String; `nameKey` String; unique `(projectId, nameKey)`
  - `color` String (token)
  - `isSystem` Boolean
  - `isCompleted` Boolean
  - `position` Int (or `rank`) — **status-catalog** order within the project; unique `(projectId, position)` preferred; **not** task within-column order (**H**)
  - `createdAt` DateTime
  - Indexes on `projectId` (and order queries)
- Change `Task.status` from enum `TaskStatus` to `String` `@default("TODO")` (no FK)
- Do **not** add task `position`/`rank` for card order
- Drop Prisma/Postgres `TaskStatus` enum after column type change (single additive migration or expand–backfill–constrain steps without reset)
- Seed three default rows per project on project create (same transaction pattern as OWNER membership); `isSystem=true` is a **seed marker only**:

  | key | name | isCompleted | suggested color | seed position | isSystem |
  | --- | --- | --- | --- | --- | --- |
  | `TODO` | To do | false | `GRAY` | 0 | true |
  | `IN_PROGRESS` | In progress | false | `BLUE` | 1 | true |
  | `DONE` | Done | true | `GREEN` | 2 | true |

- Backfill: for every existing project missing catalog rows, insert the three seeded rows at seed positions; existing `Task.status` text values already match keys after enum→text cast
- Soft referential integrity: count live tasks by `(projectId, status key)` before delete; validate on assign; enforce last-status and ≥1 non-completed guardrails on delete/update
- Custom `key`: server-generated UUID string (same form as other ids), never renamed; new customs get `max(position)+1` and `isSystem=false`
- Repository contracts: catalog CRUD, **reorder**, resolve-by-key, list by position asc, count-in-use, count non-completed, batch resolve for dashboard
- Transactions: project-create seed; task status update; delete-in-use + guardrail checks; reorder (atomic rewrite of positions); update `isCompleted` with non-completed-remaining check

Do not expose Prisma models as domain entities or API DTOs.

**Explicitly rejected:** pure unconstrained free-text status with no catalog; additive enum-only; Task → status UUID FK; within-column task rank (**H**).

## 6. Frontend

- Replace hard-coded `COLUMN_STATUSES` with catalog-driven columns (ordered as API catalog `position`)
- Keep `@dnd-kit/core` for **task** cross-column moves; drop target id = status **key**; PATCH `{ status: key }`; same-column no-op (still no task card rank **H**)
- Support **catalog/column reorder** for the full list (seeded + custom) via Statuses Dialog and/or board column reorder control; call reorder API; refresh columns from response/list
- Extend `statusDisplay` to resolve name/color from catalog by key (fallback map for system keys during load)
- TaskDetail status `<select>` options from catalog **in catalog order**; VIEWER read-only as today
- Board filters: status options from catalog (filter value = key; prefer catalog order)
- Column `+` prefills that column’s key; header `+` omits status → server `TODO`
- Board-header **Statuses** Dialog (Labels-like) for catalog CRUD + reorder: name, color swatch picker (nine tokens), `isCompleted` control for **all** rows including seeded; all rows **movable** in order; seeded rows deletable when unused (subject to in-use / last-status / ≥1 non-completed); VIEWER cannot reorder
- Loading/empty/error for catalog fetch; optimistic DnD revert on failure unchanged in spirit
- Do not redesign Members, Labels, checklists, attachments, or dashboard page chrome beyond count meaning
- No within-column **task** rank UI, status icons, or WIP

## 7. Files

Expected touch set (illustrative):

| Area | Responsibility |
| --- | --- |
| `backend/prisma/schema.prisma` + migration(s) | `ProjectStatus`, `Task.status` String, drop enum |
| `backend/src/modules/tasks/domain/*status*` | Invariants, dashboard helpers |
| `backend/src/modules/tasks/repository/*` | Catalog + key validation persistence |
| `backend/src/modules/tasks/service/*` | Catalog use cases; task create/update; dashboard |
| `backend/src/modules/tasks/dto\|validators\|controller\|routes` | HTTP contracts |
| `backend/src/modules/tasks/tests/*` | Domain/service/API coverage |
| `frontend/src/api/types.ts` + `client.ts` | Status DTOs + catalog helpers |
| `frontend/src/tasks/KanbanBoard.tsx` | Dynamic columns / drop keys |
| `frontend/src/tasks/TaskDetail.tsx` | Status select |
| `frontend/src/tasks/*` filters / panel | Status filter options |
| `frontend/src/tasks/statusDisplay.ts` | Catalog-aware labels/colors |
| New `StatusesDialog` (or equivalent) | Catalog CRUD UI + color swatches |
| Related `*.test.ts(x)` | AC coverage |

## 8. Dependencies and Config

- No new npm packages expected (`@dnd-kit/core` already present; reuse labels color swatch patterns)
- No new Compose services or volumes
- No new env vars expected
- Node.js 22, npm, PostgreSQL 16, Prisma 6 unchanged

## 9. Security and Failures

- Session required; authz via `TaskAuthorizationPort`
- Validate UUID `statusId`s, status keys, name length, color tokens; reject unknown fields
- Prevent cross-project key assignment
- Block delete of in-use statuses; block last-status and last-non-completed deletes; block `isCompleted` flips that leave zero non-completed
- Keys immutable after create; seed marker `isSystem` is not an edit/delete privilege
- Reorder: require exact id set; reject VIEWER; archived mutate semantics unchanged
- Map domain errors to existing envelope codes

## 10. Testing

- Domain: name uniqueness, key immutability, seeded editability, delete-in-use, last-status / ≥1 non-completed guardrails, key assignment, catalog reorder invariants, dashboard `isCompleted` / overdue (including flipped Done)
- Service: catalog CRUD + reorder authz; task status assign + create-default fallback; project-create seed; color validation
- API SuperTest: AC matrix 401/403/404/409; filter by key; dashboard; activity status key payloads; reorder exact-set + order persistence; seeded edit/delete when unused
- Frontend: dynamic columns in catalog order; column/catalog reorder UI; DnD PATCH key; TaskDetail options; filter; Statuses Dialog + colors + editable seeded rows; non-goals (no **task** rank/WIP/icons)
- Migration: `prisma migrate deploy` on DB with existing enum rows; assert seeded defaults + positions + task keys intact

## 11. Sequence

1. User Approves Draft artifacts (Q-141–Q-150 already Decided).
2. Domain model + in-memory repos.
3. Additive migration + Prisma adapters + backfill/seed.
4. Services (catalog, task status key validation, dashboard helpers).
5. HTTP validators/controllers/routes.
6. Backend tests.
7. Frontend API client + Kanban/TaskDetail/filters/Dialog.
8. Frontend tests.
9. Targeted + typecheck + AC verification.
10. Independent review; memory update; propose `implemented-features.md` / `prompt.md` status-text patch (wait for user confirm on catalog file).

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Soft integrity without FK | Validate on write; block delete in use; tests for orphan attempts |
| Enum → String migration | Cast/preserve text values; seed catalog; no reset |
| Dynamic columns overcrowding | Soft guidance; WIP still out (Q-149) |
| Dashboard meaning drift | Every status has `isCompleted`; follow live flags after edits |
| Deleting `TODO` breaks create default | Plan-locked fallback: first non-completed by position |
| Empty / all-completed catalog | Last-status + ≥1 non-completed guardrails |
| Clients assuming only three keys | Catalog-driven UI; keep seeded keys stable for migration |
| Confusing catalog `position` with task rank **H** | Spec/plan wording + AC-011/AC-014; no task position column |
| Scope creep into **H** / icons / WIP / audit / FK redesign | Non-goals + AC-011; Q-146 locked to string key; Q-142 catalog-order only |
| `prompt.md` fixed-status wording | Follow-up doc amend at Approve/Verify — not a constitution bypass |

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Catalog create/list use case | API + service tests |
| AC-002 | Task PATCH status key | API + service |
| AC-003 | Same-project key guard | Domain + API |
| AC-004 | Seed + enum→string migration | Migration + API |
| AC-005 | Kanban dynamic columns + DnD + catalog order | Frontend + PATCH |
| AC-006 | Dashboard `isCompleted` | Domain + dashboard API |
| AC-007 | Authz matrix | SuperTest |
| AC-008 | Filter + selects + column prefill | Frontend + list API |
| AC-009 | Activity field-change keys | Activity tests |
| AC-010 | Rename/delete/edit + guardrails | Service + API |
| AC-011 | Non-goals + colors-only (no **H** task rank) | Review + UI |
| AC-012 | Additive migrate deploy | Command evidence |
| AC-013 | `tasks` ownership | Review |
| AC-014 | Catalog reorder API + UI | Service + API + frontend |

## 14. Approval

- Specification reviewed: Pending user Approve (Qs Decided; Draft)
- Architecture reviewed: Yes
- Risks understood: Yes (documented)
- Approved for task breakdown / implementation: Yes
