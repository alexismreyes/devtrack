# Implementation Plan: Kanban Board

- **Feature ID:** 006-kanban
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. This ID is **006-kanban**, not audit. Do not write `specs/005-audit/`. Later audit MUST use a different feature ID than `005` and MUST NOT be this folder. Q-033, Q-034, and Q-035 are **decided**. Q-006, Q-007, Q-009, Q-015, and Q-017 stay deferred. Dashboard, collaboration, and audit remain unimplemented.

## 1. Summary

Add a Kanban board on the verified project-detail destination (`/projects/:projectId`) so listed non-deleted tasks appear in `TODO`, `IN_PROGRESS`, and `DONE` columns, **replacing** the ungrouped 004/005 task list (Q-033). Keep create, optional filters, and nested `TaskDetail`. No list/board toggle.

Authorized status changes persist through the existing `tasks` PATCH. Q-034 is status-only: drag between columns PATCHes `{ status }`; no `position`/`rank` field, no rank migration, no move endpoint; same-column drop is a no-op; within-column visual order stays existing list order (newest `createdAt` first per column).

Build on verified `005-frontend-shell` chrome (React Router, Tailwind + copied shadcn, top bar + left project sidebar) and verified `004-tasks` (status enumerations, owner-only, soft-delete, archived parent `409` on mutations). Ordered UI work: column board first (status still changeable via nested `TaskDetail`), then drag-and-drop with `@dnd-kit/core` (Q-035) that PATCHes `{ status }` with `credentials: 'include'`. Do not add `@dnd-kit/sortable`. Do not add a second DnD library.

No new backend domain. No API or schema change. Guest/login/register, projects-home, and profile stay as in 005. Frontend is not the only access check. No dashboard, members, or audit in this feature.

## 2. Current State

Inspected 2026-10-30. `001-foundation` through `005-frontend-shell` are Verified. Reconfirmed while recording Q-033–Q-035: ungrouped list still present; no rank/position in Prisma; no DnD package.

Present and in use:

- Compose services `frontend`, `backend`, `db`; frontend Vite React TypeScript on published port 5173; `VITE_API_URL`; `credentials: 'include'`
- Destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`; guest root → register; authenticated root → projects; unknown (including `/system/probes`) → not-found
- Authenticated chrome: `frontend/src/layout/AuthenticatedLayout.tsx` — top app bar (DevTrack, profile, logout) + left sidebar (`ProjectsPage`); main `<Outlet />`
- Project detail: `frontend/src/routes/ProjectDetailPage.tsx` → `frontend/src/projects/ProjectDetail.tsx` hosts `frontend/src/tasks/TasksPanel.tsx` as an **ungrouped** `<ul aria-label="Tasks">`, plus create form, status/priority filters, nested `TaskDetail`
- `TaskDetail` already PATCHes `status` via `updateTask` (`PATCH /api/tasks/:id`); writes disabled when `archived`
- API client: `listTasks`, `createTask`, `getTask`, `updateTask`, `softDeleteTask`
- Backend `tasks`: routes for project-scoped list/create and item GET/PATCH/DELETE; Zod `updateTaskBodySchema` already allows `{ status?: TODO|IN_PROGRESS|DONE }` with at least one field; no workflow sequence
- `TasksService.update` loads live task, `ProjectAccessPort.requireOwnedProject`, archived → `TaskParentArchivedError` / `409`
- Prisma `Task`: `status TaskStatus @default(TODO)`, no rank/position; list `orderBy: { createdAt: "desc" }`; index on `projectId`
- Copied shadcn: `button`, `input`, `label`, `card`, `textarea`. Peers: cva, clsx, tailwind-merge, lucide-react, `@radix-ui/react-slot`, `@radix-ui/react-label`
- Tests: `frontend/src/App.test.tsx` currently **forbids** `columnheader`, `draggable='true'`, and `/kanban/i` on project-detail; `frontend/src/frontend-deps.test.ts` currently **forbids** `react-beautiful-dnd`, `@hello-pangea/dnd`, `react-dnd`

Absent:

- Status columns on project-detail
- Drag-and-drop / card dragging
- Any DnD package (`@dnd-kit/core` is decided for phase B, not present yet)
- Task `position`/`rank`

Limitations to respect:

- Do not change cookie auth, CORS, or product API contracts except using existing PATCH
- Do not add a generic repository, new domain, `project-members`, dashboard, assignees, comments, or audit
- Do not reset the database or delete `pgdata`
- Q-033: replace ungrouped list; no toggle. Q-034: status-only; no rank. Q-035: `@dnd-kit/core` only after columns; no `@dnd-kit/sortable`; no second DnD library
- Rewrite 005 tests that lock “no columns / no DnD” on project-detail; keep Trello-absence and chrome/sidebar asserts
- Sidebar refetch remains pathname-keyed (005 non-blocking); out of scope unless it blocks a Kanban AC (it does not)

## 3. Domain Boundaries

- Owning domain: `tasks` (task status, list, update, soft-delete). **No new domain.** Board layout is frontend presentation, not a `kanban` backend module.
- Other domains:
  - `projects` — owner authorization and archive lifecycle via existing `ProjectAccessPort` (`requireOwnedProject` snapshot with `id`, `ownerUserId`, `archivedAt`). Do not import `prisma-projects-repository` from `tasks`.
  - `auth` — session cookie / `requireAuth` only; MUST NOT decide column access
  - `users` — unchanged
  - `system` — probes/health/ready unchanged; no product UI
- Invariants:
  - Column membership = persisted `status`
  - No status workflow
  - Owner-only writes; archived parent writes `409`
  - Soft-deleted tasks not listed
  - No rank field (Q-034)
- Cross-domain interfaces: existing `ProjectAccessPort` only. No new port.
- Dependency direction: frontend → HTTP → Express `tasks` routes → controller → service → `tasks` repository + `ProjectAccessPort`. Domain objects MUST NOT import Express or Prisma. Frontend MUST NOT import Prisma, backend modules, or `DATABASE_URL`.
- Controller, service, repository, DTOs, routes, validators, domain objects: **reuse** `backend/src/modules/tasks/`. Do not add empty product folders (`project-members`, audit, kanban-backend).

Q-034/Q-035 expect **no backend file changes** except optional test comments if a gap is found. T003 confirms PATCH coverage rather than scaffolding unused layers. No API or schema change.

## 4. API Contract

No endpoint is added, removed, or changed.

Status moves reuse verified `004-tasks` `PATCH /api/tasks/:id`:

| Method and path | Auth | Request DTO | Response | Use in this feature |
| --- | --- | --- | --- | --- |
| `GET /api/projects/:projectId/tasks` | session + owner | query `{ status?, priority? }` | `200` `{ tasks: PublicTaskDto[] }` newest `createdAt` first | Board cards |
| `POST /api/projects/:projectId/tasks` | session + owner; archived `409` | existing create body | `201` public task | Create; card appears in status column |
| `GET /api/tasks/:id` | session + owner of live task | none | `200` public task | Nested detail |
| `PATCH /api/tasks/:id` | session + owner of live task; archived `409` | at least one of `title`, `description`, `status`, `priority`, `dueDate`; **strict**; reject `id`, `createdAt`, `projectId`, `deletedAt` | `200` public task | **Column move: `{ status }` only** |
| `DELETE /api/tasks/:id` | session + owner; archived `409` | none | `204` | Soft-delete; card leaves board |

Public task DTO unchanged (no `deletedAt`, no rank):

```
{
  id, projectId, title, description,
  status: "TODO" | "IN_PROGRESS" | "DONE",
  priority: "LOW" | "MEDIUM" | "HIGH",
  dueDate: string | null,
  createdAt: string
}
```

Status codes unchanged: `400` validation; `401` unauthenticated; `403` live resource not owned; `404` missing/deleted task or missing project on collection; `409` parent archived on writes.

Do not add `POST /api/tasks/:id/move` or PATCH `position`/`rank` (Q-034).

Existing auth, users, projects, health, ready, probe routes unchanged.

## 5. Persistence

- Prisma model changes: **none** (Q-034 status-only)
- Relationships, constraints, indexes: unchanged (`Task.projectId` FK Restrict; `@@index([projectId])`)
- Migration implications: **none**; do not create a migration; do not `migrate reset`; do not delete `pgdata`
- Repository contracts: unchanged (`update` already accepts `status`; `listByProjectId` already excludes deleted and sorts `createdAt` desc)
- Transactions: single-row PATCH; no unit-of-work
- Compatibility risks: none at the database; rank is out of scope

Do not expose Prisma models as domain entities or API DTOs.

## 6. Frontend

**Where**

Reuse `TasksPanel` on `ProjectDetail` at `/projects/:projectId`. Do not add a board route. Do not put the board on `/projects`, `/profile`, login, or register.

**Phase A — columns (before DnD)**

- Group `listState` tasks into three columns `TODO`, `IN_PROGRESS`, `DONE`.
- Render all three columns (use `role="columnheader"` or equivalent accessible names so tests can find them).
- Each card shows enough to identify the task (existing title button that opens nested `TaskDetail` is enough).
- Keep create form, filters, nested `TaskDetail`, archived write messaging.
- Q-033: **replace** the ungrouped `<ul aria-label="Tasks">` as the only task layout; do not add a list/board toggle.
- Status change without DnD: existing `TaskDetail` status `<select>` + `updateTask` + `onUpdated` → `loadTasks`. That satisfies persisted status before DnD.
- Empty listed set: three empty columns; keep existing empty copy as appropriate.
- Filters: board uses the already-filtered list, grouped by status.
- Styling: Tailwind + existing shadcn `Card`/`Button`. Original DevTrack identity. No Trello names/assets. Copy extra shadcn primitives only if required.
- Do not add `@dnd-kit/core` in this phase.

**Phase B — drag-and-drop (after columns)**

- Add `@dnd-kit/core` only (Q-035). Droppable columns, draggable cards. Do not add `@dnd-kit/sortable`. Do not add `react-beautiful-dnd`, `@hello-pangea/dnd`, `react-dnd`, or any second DnD library.
- Cross-column drop → `updateTask(id, { status: target })` with existing client (`credentials: 'include'`).
- Same-column drop (Q-034): no PATCH, no rank; visual order stays newest `createdAt` first per column.
- Archived: do not persist; keep writes disabled; if a drop is attempted, show conflict and keep persisted column (AC-007, AC-010).
- Failed PATCH: card not durably in the wrong column.
- DnD is not the only status path: keep `TaskDetail` status control.
- Update `frontend-deps.test.ts` to allow **only** `@dnd-kit/core` after it is added; still forbid `@dnd-kit/sortable` and other DnD libraries.
- Rewrite `App.test.tsx` “without Kanban / columnheader / draggable” so project-detail **expects** columns and no ungrouped list; after DnD, allow dragging on the board; still forbid Trello and still require chrome/sidebar.

**State**

No global store library. Panel state + existing session context. URL still owns the project. Nested selected task id stays in component state.

**API integration**

No new client methods required. Optional local helper wrapping `updateTask(id, { status })` is presentation-only, not a new HTTP contract. Do not call probe APIs.

## 7. Files

Expected new or updated files. Names may shift slightly; roots MUST remain `frontend/` (and `backend/` only if T003 finds a real PATCH gap — not expected).

**frontend/**

- `src/tasks/TasksPanel.tsx` — replace ungrouped list with column layout; later DnD wiring
- `src/tasks/KanbanBoard.tsx` (or equivalent child) — optional extraction of columns
- `src/tasks/TaskDetail.tsx` — keep status select; no required contract change
- `src/tasks/TasksPanel.test.tsx`, `TaskDetail.test.tsx` — columns, list replaced, move persistence, archived, filters/create
- `src/tasks/KanbanBoard.test.tsx` (or panel tests) — DnD after phase B
- `src/projects/ProjectDetail.tsx` — still hosts the panel; chrome unchanged
- `src/App.test.tsx` — expect columns on project-detail; stop locking pre-Kanban
- `src/frontend-deps.test.ts` — allow only `@dnd-kit/core` when present; forbid `@dnd-kit/sortable` and other DnD libraries
- `package.json` / `package-lock.json` — add `@dnd-kit/core` in T006 only
- Layout, routes, guest screens, profile, projects-home: **no product-behavior change**

**backend/**

- None planned
- `src/modules/tasks/tests/tasks-api.test.ts` — T003 may extend only if PATCH `{ status }` coverage is actually missing (004 already covers enumerations, 409, 401, 403)

**root**

- Compose, env, Prisma: no change
- Do not create implementation source under `specs/`
- Do not create `specs/005-audit/`

## 8. Dependencies and Config

**Already in use (do not replace)**

- React 19.2, react-router 7, Vite 7, TypeScript 5.8, Tailwind 4, copied shadcn primitives listed above, Vitest, Testing Library
- Backend: Express, Prisma 6, Zod, cookie session, CORS credentials, Node.js 22 LTS, npm, PostgreSQL 16

**New dependencies**

- `@dnd-kit/core` (Q-035), added only in phase B after the column board works. Justification: accessible React DnD compatible with React 19 + Vite 7; explicit documented additional dependency per `prompt.md`. `@dnd-kit/sortable` is **not** justified (Q-034 status-only).
- Not justified: rank libraries, extra UI kits, Trello assets, state libraries, generic repository packages, `@hello-pangea/dnd`, `react-beautiful-dnd`, `react-dnd`.

**Environment**

- Existing only: `VITE_API_URL`, `CORS_ORIGIN`, `PORT`, `DATABASE_URL`, Postgres user/password/db
- No new public env for the board

**Docker**

- Keep three primary services. No production nginx image (Q-006). No volume delete.

## 9. Security and Failures

- Cookie session unchanged: HTTP-only `devtrack_session`, `credentials: 'include'`, no JS token store
- Board PATCH uses the same `requireAuth` + `TasksService.update` + `ProjectAccessPort` path as the detail form
- `401` → existing logout/login; `403` → existing forbidden; `409` → existing conflict copy; do not show another user’s cards
- No new backend validation (Q-034 does not add rank)
- Unknown route still not-found; `/system/probes` still has no probe UI
- Do not implement membership checks “for later”

## 10. Testing

| Area | Tests |
| --- | --- |
| Columns | Project-detail shows three status columns; ungrouped list gone; no list/board toggle; cards in matching column; empty columns present (AC-001–AC-003) |
| Persist via detail | Change status in `TaskDetail` → PATCH → card column updates (AC-004) |
| DnD (after T007) | Cross-column drop PATCHes `{ status }` with credentials (AC-005) |
| Same-column | No PATCH, no rank payload (AC-006) |
| Failures | Failed drop does not stay in target column (AC-007); 401/403 API still covered by existing SuperTest (AC-008, AC-009) |
| Archived | Board visible; writes/DnD not successful persist (AC-010) |
| Soft-delete / filters / create / detail | Existing panel tests updated for columns (AC-011–AC-014) |
| Chrome | Sidebar + top bar remain; guest has no board (AC-014) |
| Identity | No Trello; DevTrack chrome (AC-015) |
| Contracts | Inspect no new domain/route/rank (AC-016); optional backend re-run if T003 touches tests |
| Credentials | `credentials: 'include'` still asserted (AC-017) |
| Quality | `frontend` typecheck + tests; backend typecheck/tests if backend touched (AC-018) |
| Deps | package.json has `@dnd-kit/core` after T006; no `@dnd-kit/sortable`; no second DnD library (AC-019) |
| Regression | Auth/project/task/probe slices remain (AC-020); rewrite 005 anti-Kanban asserts |

Do not keep tests that require no `columnheader` on project-detail. Do not skip rewriting `frontend-deps.test.ts` when `@dnd-kit/core` is added.

## 11. Sequence

Safe order. Stop at step 2 if artifacts are not Approved.

1. Inspect current `TasksPanel`, `TaskDetail`, PATCH contract, Prisma `Task`, 005 tests that forbid columns/DnD (T001).
2. Confirm spec/plan/tasks Approved. Reconfirm recorded decisions: Q-033 replace list / no toggle; Q-034 status-only / no rank / same-column no-op; Q-035 `@dnd-kit/core` after columns / no sortable / no second library. Reconfirm no new domain, existing PATCH, no audit ID `005`. Stop if not Approved (T002).
3. Confirm existing PATCH `{ status }` + authz + `409` coverage; add backend tests only if a gap exists; no schema/migration (T003).
4. Implement column board on project-detail replacing the ungrouped list; keep create/filters/detail/soft-delete/chrome; no DnD package yet (T004).
5. Frontend tests for columns and preserved flows; rewrite 005 anti-column asserts (T005).
6. Add `@dnd-kit/core`; PATCH `{ status }` on cross-column drop; same-column no-op; do not add `@dnd-kit/sortable` (T006).
7. DnD tests including failure/archived/credentials; update deps test to allow only `@dnd-kit/core` (T007).
8. Typecheck and targeted tests (T008).
9. Verify AC-001–AC-020 (T009).
10. Independent review (T010).
11. Update `memory.md` from verified state only (T011). Do not mark dashboard, members, or audit implemented. Do not write `005-audit`.

No Prisma generate/migrate/volume work.

## 12. Risks

- **Implementing beyond T001–T011:** stay inside approved Kanban scope. Mitigation: T002 reconfirms Q-033–Q-035 and non-goals.
- **Inventing a rank field “for DnD”:** violates FR-011 and Q-034. Mitigation: T003 forbids migration; T006 same-column no-op.
- **New move endpoint:** unnecessary; PATCH already updates `status`. Mitigation: FR-003, AC-016.
- **New `kanban` backend domain:** forbidden. Mitigation: presentation under `frontend/src/tasks/`.
- **Keeping the ungrouped list or adding a toggle:** violates Q-033. Mitigation: T004 replaces the list; AC-001 asserts no toggle.
- **Adding `@dnd-kit/sortable` or a second DnD library:** violates Q-035. Mitigation: T006/T007; deps test forbids extras.
- **Adding `@dnd-kit/core` before columns:** violates `prompt.md` order and Q-035. Mitigation: T004 then T006.
- **005 tests lock the old UX:** `App.test.tsx` forbids columns and dragging. Mitigation: T005/T007 rewrite those asserts.
- **`frontend-deps.test.ts` forbids common DnD packages:** will fail when `@dnd-kit/core` is added unless updated. Mitigation: T007 allow only that package.
- **Frontend-only status:** dragging that only updates React state. Mitigation: AC-005/AC-007 require PATCH and revert-on-failure.
- **Archived drops looking successful:** Mitigation: AC-010; keep `writesDisabled` and handle `409`.
- **Trello clone pressure:** Mitigation: AC-015; enum column names; no trademarks.
- **Audit ID collision:** memory/Q-027 once said `005-audit`. Mitigation: this ID is `006-kanban`; later audit uses a new ID, never `specs/005-audit/`.
- **Sidebar refetch stale archive (005 non-blocking):** out of scope.
- **Optimistic UI races:** allowed only with revert; prefer PATCH-then-refresh to reduce risk.

Alternatives considered: new `/kanban` route (rejected: board lives on project-detail); new move API (rejected: prefer PATCH); rank migration (rejected: Q-034 status-only); keep DnD for a later feature (rejected: both ordered in this feature); `@hello-pangea/dnd` or native HTML5-only (rejected: Q-035 is `@dnd-kit/core`); `@dnd-kit/sortable` (rejected: Q-034 status-only); keep-both list+board with a toggle (rejected: Q-033 replace list).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001, AC-002, AC-003 | Column board in `TasksPanel`; ungrouped list replaced | Frontend column tests |
| AC-004 | Existing `TaskDetail` PATCH + reload | Panel/detail tests |
| AC-005, AC-006 | `@dnd-kit/core` + `updateTask({ status })`; same-column no-op | DnD tests |
| AC-007, AC-010 | Failure/archived handling | Frontend + existing API `409` |
| AC-008, AC-009 | Unchanged `requireAuth` + service authz | Existing SuperTest (T003 gap-check) |
| AC-011, AC-012, AC-013, AC-014 | Preserved panel/chrome flows | Updated frontend tests |
| AC-015 | DevTrack columns, no Trello | UI asserts |
| AC-016 | No new domain/route/rank | Inspect schema/routes |
| AC-017 | Existing client | Credentials tests |
| AC-018 | Typecheck + Vitest | Executed commands |
| AC-019 | `@dnd-kit/core` only | package.json + deps test |
| AC-020 | No unrelated contract change | Inspect + existing tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes — recorded; Q-033–Q-035 decided
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Non-blocking: dedicated drop tests cover 403 and archived 409 only; 400/401/404/network share the same revert path.
- Verified: Yes; coordinator re-ran frontend typecheck (exit 0) and `npm test` (12 files / 107 tests passed, Node 22.13.0); live browser pass recorded in `spec.md` / `tasks.md`; no migrations; dashboard, members, and audit remain unimplemented
