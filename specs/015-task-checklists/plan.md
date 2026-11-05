# Implementation Plan: Task Checklists

- **Feature ID:** 015-task-checklists
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Spec section 15: **Q-105**, **Q-106**, **Q-110–Q-124** are **Decided**; **Q-109** is **SUPERSEDED** by **Q-109b** (emit four checklist activity kinds). Do **not** invent alternate answers during coding. Implementation may proceed on T001–T017 only. Locked constraints: checklists under `tasks`; one or more named checklists per task with text+checked items; TaskDetail only (not Kanban columns; not child tasks); checklist mutations emit the four Q-109b kinds in the same transaction as writes (fail write if activity insert fails); no emit for item add/delete or checklist rename; no attachments (**G**); no item assign / item due / hide-checked / Markdown description redesign; no `specs/005-audit/`; no constitution changes; additive Prisma only; reuse `TaskAuthorizationPort` (mutate = write, list = read); keep Verified comments/labels public contracts intact; activity path/envelope intact with additive kinds; no embed on `PublicTaskDto` / Kanban; progress bar + strikethrough per Q-122/Q-123; render new kinds in `CommentsActivityPanel` (Q-124).

Technical shapes below match Decided answers for Q-110–Q-124 and Q-109b.

## 1. Summary

Add **task checklists / sub-items** (proposed backlog **F**) so authorized members can maintain one or more named checklists on a task, each with checkable text items, surfaced in TaskDetail with progress and light activity trail.

Approach:

- Own checklist + item persistence inside existing **`tasks`** domain (mirror comments/labels), not a peer `checklists` domain and not attachments/audit.
- Persist `TaskChecklist` + `TaskChecklistItem` via additive Prisma models + versioned migration; Prisma stays behind `tasks` repositories.
- HTTP nested under task (Q-117): collection + item routes; list returns checklists with nested items.
- Authorize mutations with `requireTaskWrite`; list/read with `requireTaskRead` (Q-110).
- **Checklist mutations emit activity** for `CHECKLIST_ADDED`, `CHECKLIST_REMOVED`, `CHECKLIST_ITEM_COMPLETED`, `CHECKLIST_ITEM_UNCOMPLETED` only (Q-109b). Same DB transaction as the write; fail write if activity insert fails (011 Q-077 / Q-124). Do **not** emit for item add/delete or checklist rename.
- Do **not** embed checklists on `PublicTaskDto` / Kanban card face (Q-115); TaskDetail loads dedicated list.
- Frontend: TaskDetail action-row Checklist control + main-column checklist UI (Q-118); per-checklist progress bar (Q-122); checked items visible with strikethrough (Q-123); update `CommentsActivityPanel` to render new kinds (do not omit like `COMMENT_ADDED`) (Q-124); no Dates/Attachment/assign/due/hide placeholders; no **G**.
- Hard-delete checklist cascades items (Q-112); no persisted reorder (Q-113); limits per Q-114; edits via PATCH (Q-119 / Q-121); empty checklists allowed (Q-120); name required from client (Q-116); archived same as task writes (Q-111).

## 2. Current State

Inspected 2026-11-05 (reconfirmed for Q-109b/Q-122–Q-124 alignment). `001-foundation` through `014-task-detail-polish` are Verified. Folder `specs/015-task-checklists/` is Approved. Backend T001–T009 landed migration `20261105140000_task_checklists`.

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume)
- Backend modules `system`, `auth`, `users`, `projects`, `tasks`, `project-members` under `backend/src/modules/`
- Prisma: `User`, `Project`, `ProjectMember`, `Task` (`deletedAt`, status, priority, dueDate), `TaskComment`, `TaskActivityEvent`, `ProjectLabel`, `TaskLabel`
- Prisma / domain `TaskActivityKind`: `TASK_CREATED`, `TASK_FIELDS_CHANGED`, `TASK_SOFT_DELETED`, `COMMENT_ADDED`
- Activity emission pattern: same-tx unit of work; fail write if event insert fails; `COMMENT_ADDED` payload `{ commentId, bodyPreview }` (preview max 120)
- `TaskAuthorizationPort`: `requireTaskRead`, `requireTaskWrite`, `requireProjectOwner`
- Task HTTP: project-scoped task CRUD/list; task item GET/PATCH/DELETE; comments; activity; labels catalog + `PUT` assignment
- `PublicTaskDto` includes `labels: [{ id, name, color }]` — **no checklists**
- Frontend: TaskDetail two-column layout (`task-detail-layout`); action row Labels-only today (`LabelsPopover`); main column fields + label chips; right `CommentsActivityPanel` (omits `COMMENT_ADDED` from interleaved timeline)
- Error envelope codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`
- Copied shadcn: `button`, `input`, `label`, `card`, `textarea`, `dialog`, `popover` + Radix dialog/popover
- Template reference: `templates/checklist.png`

Absent:

- Checklist / item tables, repositories, routes, UI
- Checklist activity kinds
- Attachment storage (correctly absent; out of scope)

Limitations to respect:

- Do not implement **G** or **C**; do not write `specs/005-audit/`
- Do not reset the database or delete volumes
- Do not change public comments / labels contracts
- Soft-deleted tasks → `404` on item ops
- `tasks` MUST NOT import other domains’ Prisma repositories
- Do not treat checklists as Kanban columns or child tasks
- Do not omit new checklist activity kinds in the timeline

## 3. Domain Boundaries

- Owning domain: **`tasks`** — checklist/item invariants, repositories, use cases, HTTP, activity emission for checklist kinds
- Other domains:
  - `project-members` — `TaskAuthorizationPort` only; no new role names
  - `auth` — session middleware only
  - `projects` / `users` / `system` — unchanged
- Invariants (Decided):
  - Checklist/item `id` / `createdAt` system-assigned
  - `taskId` / checklist parent immutable from client
  - Named checklist; items text + checked; not child tasks; not columns (Q-106)
  - Emit only Q-109b four kinds; same-tx fail-write (Q-124 / Q-077)
  - Hard-delete cascade (Q-112); createdAt ascending order, no position (Q-113); name 1–80 / text 1–200, no count caps (Q-114); empty lists allowed (Q-120); checked default false, no checked on create (Q-121)
- Cross-domain interfaces (acyclic):
  - Checklist use cases depend on `TaskAuthorizationPort` + task existence/`deletedAt`/`projectId` resolution via existing task repository patterns
  - Checklist use cases reuse existing activity repository / unit-of-work emission helpers (same as comments)
  - No comments/labels public contract changes; activity kinds additive only
  - `project-members` MUST NOT import checklist persistence
- Dependency direction: domain objects MUST NOT import Express, HTTP, Prisma Client, or drivers. Controllers → services → repository contracts / ports.
- Layout: extend `backend/src/modules/tasks/` with checklist domain/repo/service/dto/validators/controller/routes/tests; extend activity domain kinds/payloads/parsers. Do not invent peer `checklists`, `attachments`, or `audit` modules.

## 4. API Contract

Reuse existing error envelope and codes. Paths and bodies match **Q-117 Decided option 1**.

### Authz / archived / soft-delete (Q-110 / Q-111)

- List/read: session + `requireTaskRead`
- Mutations: session + `requireTaskWrite`
- Missing/soft-deleted `:taskId` → `404` for every caller
- Archived parent mutations: `ownerUserId` → `409`; other members → `403`; reads follow task-read
- Wrong-task / missing checklist or item → `404`

### List checklists (with items)

- `GET /api/tasks/:taskId/checklists`
- Auth: session + `requireTaskRead`
- Response: `{ checklists: PublicChecklistDto[] }`
- Order (Q-113): checklists by `createdAt` ascending; items within each by `createdAt` ascending
- Success: `200` including `{ checklists: [] }`
- Errors: `400` invalid id; `401`; `403`; `404`

### Create checklist

- `POST /api/tasks/:taskId/checklists`
- Auth: session + `requireTaskWrite`
- Body (Q-116 / Q-114 / Q-120): `{ name: string }` required, 1–80 after trim; reject unknown fields; no client `id`/`createdAt`; no server default name
- Success: `201` PublicChecklistDto with `items: []`
- Side effect: emit `CHECKLIST_ADDED` in same transaction (Q-109b)
- Errors: `400`; `401`; `403`; `404`; archived per Q-111

### Update checklist

- `PATCH /api/tasks/:taskId/checklists/:checklistId` (Q-119)
- Auth: session + `requireTaskWrite`
- Body: `{ name: string }` (same length rules)
- Success: `200` PublicChecklistDto (prefer include current items)
- Side effect: **no** activity event (Q-109b — rename not emitted)
- Errors: `400`; `401`; `403`; `404`; archived per Q-111

### Delete checklist

- `DELETE /api/tasks/:taskId/checklists/:checklistId` (Q-112)
- Auth: session + `requireTaskWrite`
- Behavior: hard-delete checklist and all its items; `204`
- Side effect: emit exactly one `CHECKLIST_REMOVED` (checklist deleted activity only; no per-item events) (Q-109b)
- Errors: `401`; `403`; `404`; archived per Q-111

### Create item

- `POST /api/tasks/:taskId/checklists/:checklistId/items`
- Auth: session + `requireTaskWrite`
- Body (Q-114 / Q-121): `{ text: string }` required, 1–200 after trim; reject client `checked` on create; persist `checked: false`
- Success: `201` PublicChecklistItemDto
- Side effect: **no** activity event (Q-109b)
- Errors: `400`; `401`; `403`; `404`; archived per Q-111

### Update item

- `PATCH /api/tasks/:taskId/checklists/:checklistId/items/:itemId` (Q-119 / Q-121)
- Auth: session + `requireTaskWrite`
- Body: optional `text` and/or `checked` (at least one required); strict Zod; reject unknown fields
- Success: `200` PublicChecklistItemDto
- Side effects (Q-109b):
  - If `checked` changes `false` → `true`: emit `CHECKLIST_ITEM_COMPLETED`
  - If `checked` changes `true` → `false`: emit `CHECKLIST_ITEM_UNCOMPLETED`
  - Text-only change or no-op checked: **no** activity
- Errors: `400`; `401`; `403`; `404`; archived per Q-111

### Delete item

- `DELETE /api/tasks/:taskId/checklists/:checklistId/items/:itemId`
- Auth: session + `requireTaskWrite`
- Behavior: hard-delete item; parent checklist remains even if empty (Q-120); `204`
- Side effect: **no** activity event (Q-109b)
- Errors: `401`; `403`; `404`; archived per Q-111

### Public DTOs

```
PublicChecklistItemDto {
  id: string,
  checklistId: string,
  text: string,
  checked: boolean,
  createdAt: string
}

PublicChecklistDto {
  id: string,
  taskId: string,
  name: string,
  createdAt: string,
  items: PublicChecklistItemDto[]
}
```

### Activity kinds (additive — Q-109b / Q-124)

Extend domain + Prisma `TaskActivityKind` and public activity DTO union:

```
CHECKLIST_ADDED: {
  checklistId: string,
  namePreview: string
}

CHECKLIST_REMOVED: {
  checklistId: string,
  namePreview: string
}

CHECKLIST_ITEM_COMPLETED: {
  checklistId: string,
  itemId: string,
  textPreview: string
}

CHECKLIST_ITEM_UNCOMPLETED: {
  checklistId: string,
  itemId: string,
  textPreview: string
}
```

Preview truncation: reuse `COMMENT_BODY_PREVIEW_MAX_LENGTH` (120) or a shared helper with the same max. Capture name/text **before** hard-delete for `CHECKLIST_REMOVED`. Emit via existing activity repository inside the same unit-of-work as the checklist write; fail write if insert fails.

`GET /api/tasks/:taskId/activity` path, envelope `{ activity: [...] }`, newest-first, and existing kind payload shapes remain unchanged.

### Unchanged contracts

- Comments: all Verified `010` paths/DTOs/statuses
- Labels: Verified catalog + `PUT` assignment + `PublicTaskDto.labels` (Q-115: no checklist embedding)
- Membership, dashboard, auth, health/ready
- No attachment routes
- Activity: path/envelope + existing kinds unchanged; kinds list grows additively

## 5. Persistence

- Additive Prisma (names; adjust to module conventions):
  - `TaskChecklist` / `task_checklists`: `id` uuid PK, `taskId` FK → Task Restrict, `name` string, `createdAt`; index on `taskId`
  - `TaskChecklistItem` / `task_checklist_items`: `id` uuid PK, `checklistId` FK → TaskChecklist Cascade (items removed when checklist hard-deleted), `text` string, `checked` boolean default false, `createdAt`; index on `checklistId`
  - Extend Prisma enum `TaskActivityKind` with the four checklist values (additive enum migration)
  - Do **not** add `position`/`rank` (Q-113)
  - Do **not** add soft-delete columns on checklist/item (Q-112)
  - Do **not** add attachment/cover/blob tables
- Migration: versioned under `backend/prisma/migrations/`. `prisma migrate deploy` only. No reset. No volume delete.
- Repository contracts (owning domain):
  - Checklists: create, listByTaskId (with items ordered by createdAt asc), updateName, delete (cascade items; return deleted snapshot fields needed for activity preview)
  - Items: create, update, delete, findByIdInChecklist
  - Reuse activity event create inside shared unit-of-work
  - In-memory fakes for tests
- Transactions: wrap checklist/item write + activity insert in one infrastructure transaction (Q-124 / Q-077). Delete checklist + items + `CHECKLIST_REMOVED` in one transaction.
- Compatibility: existing tasks have zero checklists; forward-only; no backfill of historical checklist activity

## 6. Frontend

- API client helpers: list/create/patch/delete checklists; create/patch/delete items; `credentials: 'include'`
- Extend activity client types/parsers for the four new kinds and payload shapes
- `TaskDetail`:
  - Action row: add Checklist control beside Labels (Q-118) — Popover or inline focus into main-column section; no Dates/Attachment placeholders
  - Main column: render named checklists, item text, checkbox for writers, read-only checked state for VIEWER; create/rename/delete per Decided limits; allow empty lists
  - Per checklist: progress bar = checked/total; percent text optional; empty → 0%; display integer percent via `Math.round(checked/total*100)` when total > 0 (Q-122)
  - Checked items: remain in list with strikethrough / completed styling; **no** hide-checked control (Q-123)
  - Load checklists when TaskDetail opens via dedicated list (parallel with comments/activity/labels catalog as appropriate)
  - After mutations that emit activity (create/delete checklist; checked toggle), reload activity (and keep checklist list current) so Comments & activity stays fresh (014 pattern)
  - Respect `canWrite` and archived disablement (same patterns as labels/comments)
- `CommentsActivityPanel` / timeline builder (Q-124):
  - Continue omitting `COMMENT_ADDED`
  - **Do not** omit the four checklist kinds; render label + payload preview (namePreview / textPreview)
  - Keep newest-first interleave with comments
- Do not show checklist progress on Kanban card face (Q-115)
- Do not redesign Members Dialog, dashboard, Kanban DnD, comments composer, or LabelsPopover beyond action-row neighbor spacing
- Do not implement item assign, item due date, hide-checked, Markdown description redesign, or attachments
- No new route; no bearer token; no new CSS framework; no new npm dependency (Q-113: no DnD reorder)

## 7. Files

Expected files (adjust names to module conventions during implementation):

- `backend/prisma/schema.prisma` — additive checklist + item models; Task relation; enum extend
- `backend/prisma/migrations/<timestamp>_task_checklists/` — additive migration (tables + enum values)
- `backend/src/modules/tasks/domain/` — checklist/item entity/errors; extend `task-activity` kinds/payloads/parsers/helpers
- `backend/src/modules/tasks/repository/` — checklist/item repos + Prisma adapters + in-memory fakes; reuse activity repo/UoW
- `backend/src/modules/tasks/service/` — checklists service use cases with emission
- `backend/src/modules/tasks/{dto,validators,controller,routes}` — checklist HTTP; activity DTO union extend as needed
- `backend/src/app.ts` / composition root — wire routers/repos
- `backend/src/modules/tasks/tests/` — domain/service/API tests for ACs including activity emission / fail-write
- `frontend/src/api/client.ts` (+ types/tests) — checklist helpers + activity kind parsing
- `frontend/src/tasks/TaskDetail.tsx` (+ tests) — action control + main-column UI + activity reload
- `frontend/src/tasks/CommentsActivityPanel.tsx` (+ tests) — render new kinds; still omit `COMMENT_ADDED`
- `frontend/src/tasks/` — optional `TaskChecklistsPanel` / Popover extract for testability

Do not add `specs/005-audit/`. Do not add attachment modules.

## 8. Dependencies and Config

- New packages: none (Q-113)
- New env vars: none
- Docker: no Compose service changes; no volume delete

## 9. Security and Failures

- Session + `TaskAuthorizationPort` on every checklist route
- Validate UUIDs, name/text lengths, checked boolean on PATCH; reject unknown fields and `checked` on create
- Envelope errors; no secrets in responses
- Archived parent: Q-111 same as task writes
- Cross-task checklist/item ids → `404`
- Activity insert failure → fail checklist write (same transaction)

## 10. Testing

- Domain unit tests: name/text trim/length; checked default; cascade delete invariants; empty-checklist allow; not child-task; activity payload builders / preview truncation for four kinds
- Service tests: authz read/write; archived 409/403; soft-deleted task 404; emit mapping table; no emit on rename/item add/delete/no-op; same-tx fail write when activity insert fails
- SuperTest: AC-001–AC-007, AC-009–AC-014
- Frontend Testing Library: TaskDetail checklist chrome; progress bar 0% empty and non-empty percent; strikethrough / no hide control; VIEWER read-only; action-row Checklist present; main-column lists; Comments & activity shows checklist kinds; Dates/Attachment/assign/due absent; credentials include; no Kanban checklist chips
- Typecheck backend + frontend
- Contract smoke: comments/labels routes unchanged; activity path still works with new kinds

## 11. Sequence

1. User Approves artifacts (done; Q-105/Q-106/Q-109b and Q-110–Q-124 Decided).
2. Extend activity domain kinds/payloads + checklist/item domain + repository contracts + in-memory fakes.
3. Additive Prisma migration (tables + enum) + adapters (`migrate deploy` only).
4. Service use cases + authz + archived/soft-delete + same-tx activity emission.
5. DTOs/validators/controller/routes + wire app; extend activity public DTO parsing as needed.
6. Backend tests (domain/service/API) including emission matrix and fail-write.
7. Frontend API client + TaskDetail UI (progress/strikethrough) + CommentsActivityPanel kinds + tests.
8. Full typecheck/tests; AC checklist; independent review; memory update proposal (catalog patch only after user confirm).

## 12. Risks

- **Approval gate** — Cleared; artifacts Approved.
- **Payload / UI density** — full trees on every task list would bloat Kanban (mitigated by Q-115).
- **Reorder pressure** — users may expect DnD; Q-113 defers reorder and avoids new DnD surface inside Dialog.
- **Attachment / assign / due / hide pressure** — template shows them; explicitly out of scope; do not sneak UI or storage.
- **Activity contract growth** — additive kinds require coordinated backend enum + frontend parsers/`CommentsActivityPanel`; unknown-kind hardening should remain tolerant where already present.
- **Enum migration on PostgreSQL** — additive Prisma enum values need careful migration SQL; still no reset/volume delete.
- **Constitution** — additive migration + domain ownership align; no conflict identified.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001, AC-002 | Checklist create/list + CHECKLIST_ADDED | Domain + API tests |
| AC-003 | Item create + PATCH checked + emit rules | Service + API tests |
| AC-004, AC-005 | Authz port wiring | API authz matrix |
| AC-006 | Four-kind emit + fail-write + non-emit cases | Service + activity API |
| AC-007 | Unchanged comments/labels routers | Contract regression |
| AC-008 | TaskDetail UI + progress + mark + timeline | Frontend tests |
| AC-009 | Hard-delete cascade + CHECKLIST_REMOVED only | API tests |
| AC-010 | createdAt ascending order (Q-113) | API order assert |
| AC-011 | Zod limits | Validation tests |
| AC-012 | Archived rules | API tests |
| AC-013 | Additive migration (+ enum) | Migration inspect + deploy |
| AC-014, AC-015 | tasks module + scope | Review + file check |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (documented)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
